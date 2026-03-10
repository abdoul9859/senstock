const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatPurchase(p) {
  if (!p) return p;
  const obj = addId(p);
  if (obj.items) obj.items = addId(obj.items);
  return obj;
}

// GET all purchases
router.get("/", async (req, res) => {
  try {
    const purchases = await prisma.dailyPurchase.findMany({
      where: { tenantId: req.tenantId },
      include: { items: true },
      orderBy: { date: "desc" },
    });
    res.json(purchases.map(formatPurchase));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET stats
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const all = await prisma.dailyPurchase.findMany({
      where: { tenantId: req.tenantId },
      select: { date: true, subtotal: true },
    });

    const todayTotal = all
      .filter((p) => new Date(p.date) >= todayStart)
      .reduce((s, p) => s + p.subtotal, 0);
    const weekTotal = all
      .filter((p) => new Date(p.date) >= weekStart)
      .reduce((s, p) => s + p.subtotal, 0);
    const monthTotal = all
      .filter((p) => new Date(p.date) >= monthStart)
      .reduce((s, p) => s + p.subtotal, 0);
    const todayCount = all.filter(
      (p) => new Date(p.date) >= todayStart
    ).length;

    res.json({ todayTotal, weekTotal, monthTotal, todayCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single purchase
router.get("/:id", async (req, res) => {
  try {
    const purchase = await prisma.dailyPurchase.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: true },
    });
    if (!purchase) return res.status(404).json({ error: "Achat introuvable" });
    res.json(formatPurchase(purchase));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create purchase
router.post("/", async (req, res) => {
  try {
    const seq = await getNextSequence("daily_purchase");
    const number = `ACH-${String(seq).padStart(4, "0")}`;

    const itemsData = (req.body.items || []).map((item) => ({
      description: item.description || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    }));
    const subtotal = itemsData.reduce((s, i) => s + i.total, 0);

    const purchase = await prisma.dailyPurchase.create({
      data: {
        tenantId: req.tenantId,
        number,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        subtotal,
        notes: req.body.notes || "",
        paymentMethod: req.body.paymentMethod || "especes",
        category: req.body.category || "general",
        supplier: req.body.supplier || "",
        createdBy: req.userId,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
    res.status(201).json(formatPurchase(purchase));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update purchase
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.dailyPurchase.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Achat introuvable" });

    const itemsData = (req.body.items || []).map((item) => ({
      description: item.description || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      total: (item.quantity || 1) * (item.unitPrice || 0),
    }));
    const subtotal = itemsData.reduce((s, i) => s + i.total, 0);

    // Delete old items and create new ones
    await prisma.dailyPurchaseItem.deleteMany({ where: { purchaseId: req.params.id } });

    const data = { subtotal };
    if (req.body.date !== undefined) data.date = new Date(req.body.date);
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    if (req.body.paymentMethod !== undefined) data.paymentMethod = req.body.paymentMethod;
    if (req.body.category !== undefined) data.category = req.body.category;
    if (req.body.supplier !== undefined) data.supplier = req.body.supplier;

    await prisma.dailyPurchase.update({
      where: { id: req.params.id },
      data,
    });

    if (itemsData.length > 0) {
      await prisma.dailyPurchaseItem.createMany({
        data: itemsData.map((item) => ({
          purchaseId: req.params.id,
          ...item,
        })),
      });
    }

    const purchase = await prisma.dailyPurchase.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    res.json(formatPurchase(purchase));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE purchase
router.delete("/:id", async (req, res) => {
  try {
    const purchase = await prisma.dailyPurchase.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!purchase) return res.status(404).json({ error: "Achat introuvable" });
    await prisma.dailyPurchaseItem.deleteMany({ where: { purchaseId: req.params.id } });
    await prisma.dailyPurchase.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
