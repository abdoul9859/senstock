const express = require("express");
const prisma = require("../db");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/clients — list all
router.get("/", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { tenantId: req.tenantId, deleted: { not: true } },
      orderBy: { name: "asc" },
    });
    res.json(addId(clients));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/clients/search?q= — search clients
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 1) return res.json([]);
    const clients = await prisma.client.findMany({
      where: {
        tenantId: req.tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
    res.json(addId(clients));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/clients — create
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    const client = await prisma.client.create({
      data: {
        tenantId: req.tenantId,
        name: name.trim(),
        phone: phone || "",
        email: email || "",
        address: address || "",
        notes: notes || "",
        createdBy: req.userId,
      },
    });
    res.status(201).json(addId(client));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/clients/:id — update
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    // Verify tenant ownership
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Client non trouve" });
    }
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (address !== undefined) update.address = address;
    if (notes !== undefined) update.notes = notes;

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: update,
    }).catch(() => null);
    if (!client) {
      return res.status(404).json({ error: "Client non trouve" });
    }
    res.json(addId(client));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/clients/merge — merge duplicate clients (transfer documents)
router.post("/merge", async (req, res) => {
  try {
    const { keepId, mergeIds, options } = req.body;
    if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return res.status(400).json({ error: "Parametres invalides" });
    }

    const keepClient = await prisma.client.findFirst({ where: { id: keepId, tenantId: req.tenantId } });
    if (!keepClient) {
      return res.status(404).json({ error: "Client cible introuvable" });
    }

    const sourceClients = await prisma.client.findMany({
      where: { id: { in: mergeIds }, tenantId: req.tenantId },
    });
    if (sourceClients.length === 0) {
      return res.status(404).json({ error: "Aucun client source trouve" });
    }

    const sourceIds = sourceClients.map((c) => c.id);
    const stats = { invoices: 0, quotes: 0, deliveryNotes: 0, requests: 0, creances: 0 };

    // Transfer invoices
    if (options?.transferInvoices) {
      const result = await prisma.invoice.updateMany({
        where: { clientId: { in: sourceIds } },
        data: { clientId: keepId },
      });
      stats.invoices = result.count || 0;
    }

    // Transfer quotes
    if (options?.transferQuotes) {
      const result = await prisma.quote.updateMany({
        where: { clientId: { in: sourceIds } },
        data: { clientId: keepId },
      });
      stats.quotes = result.count || 0;
    }

    // Transfer delivery notes
    if (options?.transferDeliveryNotes) {
      const result = await prisma.deliveryNote.updateMany({
        where: { clientId: { in: sourceIds } },
        data: { clientId: keepId },
      });
      stats.deliveryNotes = result.count || 0;
    }

    // Transfer client requests
    if (options?.transferRequests) {
      const result = await prisma.clientRequest.updateMany({
        where: { clientId: { in: sourceIds } },
        data: { clientId: keepId },
      });
      stats.requests = result.count || 0;
    }

    // Transfer creances
    if (options?.transferCreances) {
      const result = await prisma.creance.updateMany({
        where: { clientId: { in: sourceIds } },
        data: { clientId: keepId },
      });
      stats.creances = result.count || 0;
    }

    // Fill empty fields from sources
    const updateData = {};
    for (const source of sourceClients) {
      if (!keepClient.phone && source.phone) updateData.phone = source.phone;
      if (!keepClient.email && source.email) updateData.email = source.email;
      if (!keepClient.address && source.address) updateData.address = source.address;
      if (!keepClient.notes && source.notes) updateData.notes = source.notes;
    }
    const updatedKeep = await prisma.client.update({
      where: { id: keepId },
      data: updateData,
    });

    // Delete source clients
    await prisma.client.deleteMany({ where: { id: { in: sourceIds } } });

    res.json({ client: addId(updatedKeep), stats, merged: sourceClients.length });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/clients/:id — delete
router.delete("/:id", async (req, res) => {
  try {
    // Verify tenant ownership
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) {
      return res.status(404).json({ error: "Client non trouve" });
    }
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    }).catch(() => null);
    if (!client) {
      return res.status(404).json({ error: "Client non trouve" });
    }
    res.json({ message: "Client deplace dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
