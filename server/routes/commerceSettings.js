const express = require("express");
const crypto = require("crypto");
const prisma = require("../db");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/commerce-settings
router.get("/", async (req, res) => {
  try {
    const settings = await prisma.commerceSettings.upsert({
      where: { tenantId: req.tenantId },
      update: {},
      create: { id: crypto.randomUUID(), tenantId: req.tenantId },
    });
    res.json(addId(settings));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/commerce-settings
router.put("/", async (req, res) => {
  try {
    const allowed = [
      "invoiceTemplate", "accentColor", "businessName", "businessAddress",
      "businessPhone", "businessEmail", "businessNinea", "businessLogo",
      "defaultNotes", "defaultWarrantyText", "showPurchasePrice",
    ];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await prisma.commerceSettings.upsert({
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
