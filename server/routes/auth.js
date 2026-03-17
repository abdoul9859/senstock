const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const auth = require("../middleware/auth");
const logger = require("../lib/logger");

const router = express.Router();

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });

  // Cleanup old tokens for this user (keep max 5)
  const tokens = await prisma.refreshToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (tokens.length > 5) {
    const toDelete = tokens.slice(5).map((t) => t.id);
    await prisma.refreshToken.deleteMany({ where: { id: { in: toDelete } } });
  }

  return token;
}

function tenantInfo(tenant) {
  return {
    plan: tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus,
    onboardingCompleted: tenant.onboardingCompleted,
    onboardingStep: tenant.onboardingStep,
    trialEndsAt: tenant.trialEndsAt,
  };
}

function toPublic(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false,
    permissions: user.permissions || {},
    tenantId: user.tenantId,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, plan } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caracteres" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Un compte avec cet email existe deja" });
    }

    const tenant = await prisma.tenant.create({
      data: { name: "Entreprise " + name, plan: "essai" },
    });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, tenantId: tenant.id, role: "admin" },
    });

    const token = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    logger.info("User registered", { userId: user.id, tenantId: tenant.id });

    res.status(201).json({
      token,
      refreshToken,
      user: toPublic(user),
      tenant: tenantInfo(tenant),
    });
  } catch (err) {
    logger.error("Register error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn("Login attempt for non-existent account", { email });
      return res.status(401).json({ error: "Aucun compte associe a cet email" });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      logger.warn("Failed login attempt - wrong password", { email });
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;

    const token = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);

    logger.info("User logged in", { userId: user.id });

    res.json({
      token,
      refreshToken,
      user: toPublic(user),
      tenant: tenant ? tenantInfo(tenant) : null,
    });
  } catch (err) {
    logger.error("Login error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token requis" });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ error: "Refresh token invalide ou expire" });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = await createRefreshToken(user.id);

    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: toPublic(user),
      tenant: tenant ? tenantInfo(tenant) : null,
    });
  } catch (err) {
    logger.error("Refresh token error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/auth/logout — revoke refresh token
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// GET /api/auth/me
router.get("/me", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouve" });
    }
    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;
    res.json({ user: toPublic(user), tenant: tenant ? tenantInfo(tenant) : null });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/auth/profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouve" });
    }

    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caracteres" });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    res.json({ user: toPublic(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
