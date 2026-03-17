const express = require("express");
const router = express.Router();
const prisma = require("../db");

function requireSuperAdmin(req, res, next) {
  if (!req.user?.isSuperAdmin) return res.status(403).json({ error: "Acces reserve au super-administrateur" });
  next();
}
router.use(requireSuperAdmin);

// ═══════════════════════════════════════
// DASHBOARD — high-level platform metrics
// ═══════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const [totalTenants, totalUsers, activeTenants, promoCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.tenant.count({ where: { deleted: false } }),
      prisma.promoCode.count(),
    ]);

    const planDistribution = await prisma.tenant.groupBy({
      by: ["plan"],
      _count: { plan: true },
    });

    const statusDistribution = await prisma.tenant.groupBy({
      by: ["subscriptionStatus"],
      _count: { subscriptionStatus: true },
    });

    // Monthly signups (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentTenants = await prisma.tenant.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });
    const monthlySignups = {};
    recentTenants.forEach((t) => {
      const m = t.createdAt.toISOString().substring(0, 7);
      monthlySignups[m] = (monthlySignups[m] || 0) + 1;
    });

    // Last 10 signups
    const latestSignups = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, plan: true, subscriptionStatus: true, createdAt: true, _count: { select: { users: true } } },
    });

    // Active promos
    const activePromos = await prisma.promoCode.count({ where: { active: true } });

    res.json({
      totals: { tenants: totalTenants, users: totalUsers, activeTenants, promos: promoCount, activePromos },
      planDistribution: planDistribution.map((p) => ({ plan: p.plan, count: p._count.plan })),
      statusDistribution: statusDistribution.map((s) => ({ status: s.subscriptionStatus, count: s._count.subscriptionStatus })),
      monthlySignups,
      latestSignups,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// ABONNEMENTS — manage tenant plans
// ═══════════════════════════════════════
router.get("/subscriptions", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, plan: true, subscriptionStatus: true,
        trialEndsAt: true, planActivatedAt: true, deleted: true,
        createdAt: true, onboardingCompleted: true,
        _count: { select: { users: true } },
      },
    });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/subscriptions/:id", async (req, res) => {
  try {
    const { plan, subscriptionStatus, trialEndsAt, deleted } = req.body;
    const data = {};
    if (plan) data.plan = plan;
    if (subscriptionStatus) data.subscriptionStatus = subscriptionStatus;
    if (trialEndsAt !== undefined) data.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    if (deleted !== undefined) { data.deleted = deleted; data.deletedAt = deleted ? new Date() : null; }
    if (plan && !data.planActivatedAt) data.planActivatedAt = new Date();

    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// CODES PROMO
// ═══════════════════════════════════════
router.get("/promos", async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/promos", async (req, res) => {
  try {
    const { code, description, discountPercent, discountMonths, maxUses, validFrom, validUntil, planFilter, active } = req.body;
    if (!code) return res.status(400).json({ error: "Le code est requis" });
    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description || "",
        discountPercent: discountPercent || 0,
        discountMonths: discountMonths || 1,
        maxUses: maxUses || 0,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        planFilter: planFilter || "",
        active: active !== false,
      },
    });
    res.json(promo);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Ce code existe deja" });
    res.status(500).json({ error: err.message });
  }
});

router.put("/promos/:id", async (req, res) => {
  try {
    const { code, description, discountPercent, discountMonths, maxUses, validFrom, validUntil, planFilter, active } = req.body;
    const data = {};
    if (code) data.code = code.toUpperCase().trim();
    if (description !== undefined) data.description = description;
    if (discountPercent !== undefined) data.discountPercent = discountPercent;
    if (discountMonths !== undefined) data.discountMonths = discountMonths;
    if (maxUses !== undefined) data.maxUses = maxUses;
    if (validFrom) data.validFrom = new Date(validFrom);
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;
    if (planFilter !== undefined) data.planFilter = planFilter;
    if (active !== undefined) data.active = active;

    const promo = await prisma.promoCode.update({ where: { id: req.params.id }, data });
    res.json(promo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/promos/:id", async (req, res) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// LANDING PAGE CONFIG
// ═══════════════════════════════════════
router.get("/config", async (req, res) => {
  try {
    let config = await prisma.appConfig.findFirst();
    if (!config) {
      config = await prisma.appConfig.create({ data: {} });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/config", async (req, res) => {
  try {
    let config = await prisma.appConfig.findFirst();
    if (!config) config = await prisma.appConfig.create({ data: {} });

    const allowedFields = [
      "appName", "supportEmail", "maintenanceMode",
      "launchActive", "launchEndDate", "earlyAdopterDiscount",
      "heroTitle", "heroSubtitle", "heroCtaText",
      "showTestimonials", "showPricing", "footerText", "announcementBanner",
      "priceRevendeur", "pricePremium", "priceEntreprise",
      "payWave", "payOrangeMoney", "payFreeMoney", "payStripe", "payBankTransfer", "payCash",
    ];
    const data = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        if (f === "launchEndDate") data[f] = new Date(req.body[f]);
        else data[f] = req.body[f];
      }
    }
    const updated = await prisma.appConfig.update({ where: { id: config.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════
// SYSTEM HEALTH
// ═══════════════════════════════════════
router.get("/health", async (req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - start;

    let whatsappStatus = "unknown";
    try {
      const evoRes = await fetch(`${process.env.EVOLUTION_API_URL || "http://evolution-api:8080"}/instance/fetchInstances`, {
        headers: { apikey: process.env.EVOLUTION_API_KEY || "evo_senstock_secret_key" },
        signal: AbortSignal.timeout(3000),
      });
      whatsappStatus = evoRes.ok ? "ok" : "error";
    } catch { whatsappStatus = "unreachable"; }

    res.json({
      status: "ok",
      uptime: process.uptime(),
      dbLatency,
      whatsappStatus,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

module.exports = router;
