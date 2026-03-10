const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

const PRICE_MAP = {
  revendeur: process.env.STRIPE_REVENDEUR_PRICE_ID,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID,
  entreprise: process.env.STRIPE_ENTREPRISE_PRICE_ID,
};

const VALID_PLANS = ["revendeur", "premium", "entreprise"];

function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return key && !key.includes("placeholder") && key.startsWith("sk_");
}

// POST /api/stripe/create-checkout-session
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: "Plan invalide" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) return res.status(404).json({ error: "Tenant non trouvé" });

    // Dev mode: directly upgrade if Stripe is not configured
    if (!isStripeConfigured()) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan,
          subscriptionStatus: "active",
          planActivatedAt: new Date(),
        },
      });
      logger.info(`[DEV] Tenant ${tenant.id} upgraded to ${plan} (no Stripe)`);
      return res.json({ success: true, devMode: true });
    }

    // Production: create Stripe checkout session
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

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

    res.json({ url: session.url });
  } catch (err) {
    logger.error("Stripe checkout error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la création de la session de paiement" });
  }
});

// POST /api/stripe/create-portal-session
router.post("/create-portal-session", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || !tenant.stripeCustomerId) {
      return res.status(400).json({ error: "Aucun abonnement actif" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL || "http://localhost:8080"}/parametres`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error("Stripe portal error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la création du portail" });
  }
});

// Webhook handler (called directly, not through router)
async function handleWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error("Webhook signature verification failed:", { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        if (tenantId && plan) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan,
              subscriptionStatus: "active",
              stripeSubscriptionId: session.subscription,
              planActivatedAt: new Date(),
            },
          });
          logger.info(`Tenant ${tenantId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenantId;
        if (tenantId) {
          const update = { subscriptionStatus: subscription.status };
          if (subscription.trial_end) {
            update.trialEndsAt = new Date(subscription.trial_end * 1000);
          }
          await prisma.tenant.update({
            where: { id: tenantId },
            data: update,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenantId;
        if (tenantId) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: "essai",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: "",
            },
          });
          logger.info(`Tenant ${tenantId} subscription canceled, reverted to free`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const tenant = await prisma.tenant.findFirst({ where: { stripeCustomerId: customerId } });
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { subscriptionStatus: "past_due" },
          });
          logger.info(`Tenant ${tenant.id} payment failed, status: past_due`);
        }
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook processing error:", { error: err.message });
  }

  res.json({ received: true });
}

module.exports = { router, handleWebhook };
