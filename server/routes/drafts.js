const express = require("express");
const prisma = require("../db");
const router = express.Router();

// GET /api/drafts — list all active drafts for this user's tenant
router.get("/", async (req, res) => {
  try {
    const drafts = await prisma.draftSession.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { updatedAt: "desc" },
    });
    res.json(drafts);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/drafts/:type — get all drafts of this type in tenant (for cross-device awareness)
router.get("/:type", async (req, res) => {
  try {
    const drafts = await prisma.draftSession.findMany({
      where: { tenantId: req.tenantId, type: req.params.type },
    });
    res.json(drafts);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/drafts/:type — save/update a draft for the current user + device
router.put("/:type", async (req, res) => {
  try {
    const { data, device, deviceName } = req.body;
    const dev = device || "web";
    const draft = await prisma.draftSession.upsert({
      where: {
        tenantId_userId_type_device: {
          tenantId: req.tenantId,
          userId: req.userId,
          type: req.params.type,
          device: dev,
        },
      },
      update: {
        data: data || {},
        deviceName: deviceName || "",
        updatedAt: new Date(),
      },
      create: {
        type: req.params.type,
        data: data || {},
        device: dev,
        deviceName: deviceName || "",
        userId: req.userId,
        tenantId: req.tenantId,
      },
    });
    res.json(draft);
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/drafts/:type — clear this user's drafts for this type (all devices)
router.delete("/:type", async (req, res) => {
  try {
    await prisma.draftSession.deleteMany({
      where: {
        tenantId: req.tenantId,
        userId: req.userId,
        type: req.params.type,
      },
    });
    res.json({ message: "Brouillon supprimé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
