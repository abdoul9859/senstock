/**
 * Tenant isolation middleware.
 * After auth middleware sets req.tenantId, this middleware:
 * 1. Validates the tenant exists
 * 2. Attaches req.user (full user object) for convenience
 * 3. Provides req.tenantWhere() helper for Prisma queries
 */
const prisma = require("../db");

function tenantScope(req, res, next) {
  if (!req.tenantId) {
    return res.status(403).json({ error: "Acces refuse: tenant manquant" });
  }

  // Helper to inject tenantId into Prisma where clauses
  req.tenantWhere = (extra = {}) => ({
    tenantId: req.tenantId,
    ...extra,
  });

  // Helper to inject tenantId into Prisma create data
  req.tenantData = (data = {}) => ({
    tenantId: req.tenantId,
    ...data,
  });

  next();
}

/**
 * Load full user object and attach to req.user
 * Uses a simple in-memory cache (TTL 60s) to avoid hitting DB on every request
 */
const userCache = new Map();
const USER_CACHE_TTL = 60000; // 60 seconds

async function loadUser(req, res, next) {
  try {
    if (req.userId) {
      const cached = userCache.get(req.userId);
      if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
        req.user = cached.user;
        return next();
      }
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true, role: true, tenantId: true, permissions: true },
      });
      if (user) {
        req.user = user;
        userCache.set(req.userId, { user, ts: Date.now() });
      }
    }
    next();
  } catch {
    next();
  }
}

module.exports = { tenantScope, loadUser };
