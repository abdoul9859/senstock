const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

const router = express.Router();

// GET /api/company-settings — get settings (tenant-scoped)
router.get("/", async (req, res) => {
  try {
    const settings = await prisma.companySettings.upsert({
      where: { tenantId: req.tenantId },
      update: {},
      create: { id: crypto.randomUUID(), tenantId: req.tenantId },
    });
    res.json(addId(settings));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/company-settings — update settings (upsert)
router.put("/", async (req, res) => {
  try {
    const allowed = [
      "companyName", "logo", "address", "phone", "email", "website",
      "ninea", "rc", "currency", "country", "supportWhatsapp", "supportEmail",
      "whatsappEnabled", "whatsappInstanceName", "whatsappApiUrl", "whatsappApiKey", "whatsappConnected",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await prisma.companySettings.upsert({
      where: { tenantId: req.tenantId },
      update,
      create: { id: crypto.randomUUID(), tenantId: req.tenantId, ...update },
    });
    res.json(addId(settings));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
