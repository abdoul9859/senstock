const express = require("express");
const prisma = require("../db");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET / - List all recurring invoices for tenant (with client info)
router.get("/", async (req, res) => {
  try {
    const recurring = await prisma.recurringInvoice.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch client info for each recurring invoice
    const clientIds = [...new Set(recurring.map((r) => r.clientId).filter(Boolean))];
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true, phone: true, email: true },
    });
    const clientMap = {};
    for (const c of clients) {
      clientMap[c.id] = addId(c);
    }

    const results = recurring.map((r) => {
      const result = addId(r);
      result.client = clientMap[r.clientId] || null;
      return result;
    });

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / - Create recurring invoice
router.post("/", async (req, res) => {
  try {
    const { clientId, frequency, nextDate, templateItems, showTax, taxRate, notes } = req.body;

    const recurring = await prisma.recurringInvoice.create({
      data: {
        clientId,
        frequency: frequency || "mensuel",
        nextDate: new Date(nextDate),
        templateItems: templateItems || [],
        showTax: showTax || false,
        taxRate: taxRate !== undefined ? taxRate : 18,
        notes: notes || "",
        tenantId: req.tenantId,
        createdBy: req.userId,
      },
    });

    // Fetch client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, phone: true, email: true },
    });

    const result = addId(recurring);
    result.client = client ? addId(client) : null;
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /:id - Update recurring invoice
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.recurringInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Facture recurrente introuvable" });

    const updateData = { ...req.body };
    if (updateData.nextDate) updateData.nextDate = new Date(updateData.nextDate);

    const recurring = await prisma.recurringInvoice.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Fetch client
    const client = await prisma.client.findUnique({
      where: { id: recurring.clientId },
      select: { id: true, name: true, phone: true, email: true },
    });

    const result = addId(recurring);
    result.client = client ? addId(client) : null;
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Facture recurrente introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// PUT /:id/toggle - Toggle active status
router.put("/:id/toggle", async (req, res) => {
  try {
    const existing = await prisma.recurringInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Facture recurrente introuvable" });

    const recurring = await prisma.recurringInvoice.update({
      where: { id: req.params.id },
      data: { active: !existing.active },
    });

    const client = await prisma.client.findUnique({
      where: { id: recurring.clientId },
      select: { id: true, name: true, phone: true, email: true },
    });

    const result = addId(recurring);
    result.client = client ? addId(client) : null;
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Facture recurrente introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE /:id - Delete recurring invoice
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.recurringInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Facture recurrente introuvable" });

    await prisma.recurringInvoice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Facture recurrente introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
