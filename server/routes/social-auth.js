const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../db");
const logger = require("../lib/logger");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, tenantId: user.tenantId }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
    tenantId: user.tenantId,
  };
}

// Find or create user from social provider
async function findOrCreateSocialUser({ email, name, avatarUrl, provider }) {
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Update avatar if missing
    if (avatarUrl && !user.avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    }
    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;
    const token = signToken(user);
    return { token, user: toPublic(user), tenant: tenant ? tenantInfo(tenant) : null, isNew: false };
  }

  // Create new user + tenant
  const tenant = await prisma.tenant.create({
    data: { name: "Entreprise " + name, plan: "essai" },
  });

  user = await prisma.user.create({
    data: {
      name,
      email,
      password: "",
      authProvider: provider,
      avatarUrl: avatarUrl || null,
      tenantId: tenant.id,
      role: "admin",
    },
  });

  const token = signToken(user);
  return { token, user: toPublic(user), tenant: tenantInfo(tenant), isNew: true };
}

// ── Google Sign-In ──
// Frontend sends the Google ID token (from Google Identity Services)
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Token Google requis" });
    }

    // Verify Google ID token via Google's tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      return res.status(401).json({ error: "Token Google invalide" });
    }

    const payload = await response.json();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return res.status(401).json({ error: "Token Google invalide (audience)" });
    }

    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ error: "Email Google non verifie" });
    }

    const result = await findOrCreateSocialUser({
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      avatarUrl: payload.picture || null,
      provider: "google",
    });

    res.json(result);
  } catch (err) {
    logger.error("Google auth error:", { error: err.message });
    res.status(500).json({ error: "Erreur d'authentification Google" });
  }
});

// ── Apple Sign-In ──
// Frontend sends Apple's authorization code or ID token
router.post("/apple", async (req, res) => {
  try {
    const { idToken, user: appleUser } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Token Apple requis" });
    }

    // Decode Apple ID token (JWT) to get email
    // Apple's ID token is a standard JWT - we decode the payload
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: "Token Apple invalide" });
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    } catch {
      return res.status(401).json({ error: "Token Apple invalide" });
    }

    if (!payload.email) {
      return res.status(400).json({ error: "Email Apple non disponible" });
    }

    // Apple only sends the user's name on the first sign-in
    const userName = appleUser?.name
      ? `${appleUser.name.firstName || ""} ${appleUser.name.lastName || ""}`.trim()
      : payload.email.split("@")[0];

    const result = await findOrCreateSocialUser({
      email: payload.email,
      name: userName,
      avatarUrl: null,
      provider: "apple",
    });

    res.json(result);
  } catch (err) {
    logger.error("Apple auth error:", { error: err.message });
    res.status(500).json({ error: "Erreur d'authentification Apple" });
  }
});

// ── Email Magic Link (code) ──
// Step 1: Send a 6-digit code to the email
router.post("/magic/send", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    // Generate 6-digit code
    const code = String(crypto.randomInt(100000, 999999));
    const exp = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert user with magic code
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { magicCode: code, magicCodeExp: exp },
      });
    } else {
      // Pre-create user placeholder
      const tenant = await prisma.tenant.create({
        data: { name: "Entreprise " + email.split("@")[0], plan: "essai" },
      });
      await prisma.user.create({
        data: {
          name: email.split("@")[0],
          email,
          password: "",
          authProvider: "magic",
          magicCode: code,
          magicCodeExp: exp,
          tenantId: tenant.id,
          role: "admin",
        },
      });
    }

    // Send email
    const nodemailer = require("nodemailer");
    const smtpHost = process.env.SMTP_HOST;

    if (smtpHost && !smtpHost.includes("placeholder")) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "SenStock <noreply@senstock.app>",
        to: email,
        subject: "Votre code de connexion SenStock",
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #10b981;">SenStock</h2>
            <p>Votre code de connexion :</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">
              ${code}
            </div>
            <p style="color: #71717a; font-size: 14px;">Ce code expire dans 10 minutes.</p>
          </div>
        `,
      });
    } else {
      // Dev mode: log the code
      logger.info(`[DEV] Magic code for ${email}: ${code}`);
    }

    res.json({ success: true, message: "Code envoye" });
  } catch (err) {
    logger.error("Magic send error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'envoi du code" });
  }
});

// Step 2: Verify the code
router.post("/magic/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email et code requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.magicCode) {
      return res.status(401).json({ error: "Code invalide ou expire" });
    }

    if (user.magicCode !== code) {
      return res.status(401).json({ error: "Code incorrect" });
    }

    if (user.magicCodeExp && new Date() > new Date(user.magicCodeExp)) {
      return res.status(401).json({ error: "Code expire, demandez-en un nouveau" });
    }

    // Clear code
    await prisma.user.update({
      where: { id: user.id },
      data: { magicCode: null, magicCodeExp: null },
    });

    const tenant = user.tenantId
      ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
      : null;

    const token = signToken(user);
    const isNew = !tenant || !tenant.onboardingCompleted;

    res.json({
      token,
      user: toPublic(user),
      tenant: tenant ? tenantInfo(tenant) : null,
      isNew,
    });
  } catch (err) {
    logger.error("Magic verify error:", { error: err.message });
    res.status(500).json({ error: "Erreur de verification" });
  }
});

module.exports = router;
