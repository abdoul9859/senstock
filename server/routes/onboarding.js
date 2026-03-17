const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");
const logger = require("../lib/logger");

const router = express.Router();

// GET /api/onboarding/status
router.get("/status", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!tenant) return res.status(404).json({ error: "Tenant non trouvé" });
    res.json({
      onboardingCompleted: tenant.onboardingCompleted,
      onboardingStep: tenant.onboardingStep,
      plan: tenant.plan,
      subscriptionStatus: tenant.subscriptionStatus,
    });
  } catch (err) {
    logger.error("Onboarding error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/onboarding/plan — Step 1: select plan
router.put("/plan", async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ["lancement", "essai", "premium", "revendeur", "entreprise"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: "Plan invalide" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!tenant) return res.status(404).json({ error: "Tenant non trouvé" });

    if (plan === "lancement" || plan === "essai") {
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          plan,
          onboardingStep: Math.max(tenant.onboardingStep, 1),
        },
      });
      return res.json({ success: true });
    }

    // For paid plans, check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const isStripeConfigured = stripeKey && !stripeKey.includes("placeholder") && stripeKey.startsWith("sk_");

    if (!isStripeConfigured) {
      // Dev mode: directly set the plan
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          plan,
          subscriptionStatus: "active",
          onboardingStep: Math.max(tenant.onboardingStep, 1),
          planActivatedAt: new Date(),
        },
      });
      logger.info(`[DEV] Tenant ${req.tenantId} plan set to ${plan} (no Stripe)`);
      return res.json({ success: true });
    }

    // Production: create Stripe checkout session
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const stripe = require("stripe")(stripeKey);

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const PRICE_MAP = {
      revendeur: process.env.STRIPE_REVENDEUR_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
      entreprise: process.env.STRIPE_ENTREPRISE_PRICE_ID || process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
      success_url: `${process.env.CLIENT_URL || "http://localhost:8080"}/onboarding?checkout=success`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:8080"}/onboarding?checkout=canceled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { tenantId: tenant.id },
      },
      metadata: {
        tenantId: tenant.id,
        userId: user.id,
        plan,
      },
    });

    await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { onboardingStep: Math.max(tenant.onboardingStep, 1) },
    });

    res.json({ success: true, stripeUrl: session.url });
  } catch (err) {
    logger.error("Onboarding plan error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/onboarding/company — Step 2: company info
router.put("/company", async (req, res) => {
  try {
    const allowed = [
      "companyName", "logo", "address", "phone", "email", "website",
      "ninea", "rc", "currency", "country",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    await prisma.companySettings.upsert({
      where: { tenantId: req.tenantId },
      update: { ...update },
      create: { id: crypto.randomUUID(), tenantId: req.tenantId, ...update },
    });

    // Also update tenant name if companyName is provided
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (tenant) {
      const tenantUpdate = { onboardingStep: Math.max(tenant.onboardingStep, 2) };
      if (update.companyName) tenantUpdate.name = update.companyName;
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: tenantUpdate,
      });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Onboarding error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/onboarding/invoice — Step 3: invoice template
router.put("/invoice", async (req, res) => {
  try {
    const { invoiceTemplate, accentColor, businessName, businessAddress } = req.body;
    const update = {};
    if (invoiceTemplate) update.invoiceTemplate = invoiceTemplate;
    if (accentColor) update.accentColor = accentColor;
    if (businessName !== undefined) update.businessName = businessName;
    if (businessAddress !== undefined) update.businessAddress = businessAddress;

    await prisma.commerceSettings.upsert({
      where: { tenantId: req.tenantId },
      update: { ...update },
      create: { id: crypto.randomUUID(), tenantId: req.tenantId, ...update },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (tenant) {
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: { onboardingStep: Math.max(tenant.onboardingStep, 3) },
      });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Onboarding error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/onboarding/complete — Step 4: finish
router.post("/complete", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!tenant) return res.status(404).json({ error: "Tenant non trouvé" });

    // For paid plans, verify payment is done
    if (tenant.plan !== "essai" && !["active", "trialing"].includes(tenant.subscriptionStatus)) {
      return res.status(400).json({ error: "Le paiement n'est pas encore confirmé" });
    }

    await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { onboardingCompleted: true, onboardingStep: 4 },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Onboarding error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
