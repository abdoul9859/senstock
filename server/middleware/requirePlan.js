const prisma = require("../db");

function requirePlan(allowedPlans) {
  return async (req, res, next) => {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
      if (!tenant) {
        return res.status(404).json({ error: "Tenant non trouve" });
      }
      if (!allowedPlans.includes(tenant.plan)) {
        return res.status(403).json({
          error: "Cette fonctionnalite necessite un plan superieur",
          code: "PLAN_REQUIRED",
          requiredPlan: allowedPlans[0],
          currentPlan: tenant.plan,
        });
      }
      if (tenant.subscriptionStatus === "canceled" && tenant.plan !== "essai" && tenant.plan !== "lancement") {
        return res.status(403).json({
          error: "Votre abonnement est annule",
          code: "SUBSCRIPTION_CANCELED",
          subscriptionStatus: tenant.subscriptionStatus,
        });
      }
      next();
    } catch {
      res.status(500).json({ error: "Erreur serveur" });
    }
  };
}

module.exports = requirePlan;
