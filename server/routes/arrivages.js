const express = require("express");
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatArrivage(a) {
  if (!a) return a;
  const result = addId(a);
  if (result.supplier) result.supplier = addId(result.supplier);
  if (result.items) result.items = result.items.map((item) => {
    const i = addId(item);
    if (i.product) i.product = addId(i.product);
    return i;
  });
  return result;
}

const arrivageInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, brand: true, model: true, image: true, sellingPrice: true, purchasePrice: true } },
    },
  },
};

// GET / — List all arrivages
router.get("/", async (req, res) => {
  try {
    const arrivages = await prisma.arrivage.findMany({
      where: { tenantId: req.tenantId },
      include: arrivageInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(arrivages.map(formatArrivage));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /stats
router.get("/stats", async (req, res) => {
  try {
    const all = await prisma.arrivage.findMany({ where: { tenantId: req.tenantId } });
    res.json({
      total: all.length,
      en_cours: all.filter((a) => a.status === "en_cours").length,
      recu: all.filter((a) => a.status === "recu").length,
      totalCost: all.filter((a) => a.status !== "annule").reduce((s, a) => s + a.totalCost, 0),
      totalItems: all.filter((a) => a.status !== "annule").reduce((s, a) => s + a.totalItems, 0),
    });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  try {
    const arrivage = await prisma.arrivage.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: arrivageInclude,
    });
    if (!arrivage) return res.status(404).json({ error: "Arrivage non trouve" });
    res.json(formatArrivage(arrivage));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST / — Create arrivage
router.post("/", async (req, res) => {
  try {
    const { supplierId, date, notes, items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: "Au moins un article requis" });

    const seq = await getNextSequence("arrivage");
    const reference = `ARV-${String(seq).padStart(4, "0")}`;

    const processedItems = items.map((it) => ({
      productId: it.productId || null,
      productName: it.productName || "",
      quantity: it.quantity || 1,
      unitCost: it.unitCost || 0,
      total: (it.quantity || 1) * (it.unitCost || 0),
    }));

    const totalItems = processedItems.reduce((s, it) => s + it.quantity, 0);
    const totalCost = processedItems.reduce((s, it) => s + it.total, 0);

    const arrivage = await prisma.arrivage.create({
      data: {
        reference,
        tenantId: req.tenantId,
        supplierId: supplierId || null,
        date: date ? new Date(date) : new Date(),
        notes: notes || "",
        totalItems,
        totalCost,
        status: "en_cours",
        createdBy: req.userId,
        items: { create: processedItems },
      },
      include: arrivageInclude,
    });

    res.status(201).json(formatArrivage(arrivage));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /:id — Update arrivage
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.arrivage.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Arrivage non trouve" });

    const { supplierId, date, notes, items, status } = req.body;
    const update = {};

    if (supplierId !== undefined) update.supplierId = supplierId || null;
    if (date !== undefined) update.date = date ? new Date(date) : new Date();
    if (notes !== undefined) update.notes = notes;
    if (status !== undefined) update.status = status;

    if (items) {
      const processedItems = items.map((it) => ({
        productId: it.productId || null,
        productName: it.productName || "",
        quantity: it.quantity || 1,
        unitCost: it.unitCost || 0,
        total: (it.quantity || 1) * (it.unitCost || 0),
      }));
      update.totalItems = processedItems.reduce((s, it) => s + it.quantity, 0);
      update.totalCost = processedItems.reduce((s, it) => s + it.total, 0);

      await prisma.arrivageItem.deleteMany({ where: { arrivageId: req.params.id } });
      update.items = { create: processedItems };
    }

    const arrivage = await prisma.arrivage.update({
      where: { id: req.params.id },
      data: update,
      include: arrivageInclude,
    });
    res.json(formatArrivage(arrivage));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Arrivage non trouve" });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /:id/receive — Mark arrivage as received and update stock
router.post("/:id/receive", async (req, res) => {
  try {
    const arrivage = await prisma.arrivage.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: { include: { product: true } } },
    });
    if (!arrivage) return res.status(404).json({ error: "Arrivage non trouve" });
    if (arrivage.status === "recu") return res.status(400).json({ error: "Arrivage deja recu" });

    // Update product quantities
    for (const item of arrivage.items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });

        // Log stock movement
        await prisma.stockMovement.create({
          data: {
            type: "arrivage_recu",
            productId: item.productId,
            productName: item.product?.name || item.productName,
            details: `Arrivage ${arrivage.reference}: +${item.quantity} unites`,
            meta: { arrivageId: arrivage.id, arrivageRef: arrivage.reference, quantity: item.quantity },
            userId: req.userId,
            tenantId: req.tenantId,
          },
        });
      }
    }

    // Mark as received
    const updated = await prisma.arrivage.update({
      where: { id: req.params.id },
      data: { status: "recu" },
      include: arrivageInclude,
    });

    res.json(formatArrivage(updated));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.arrivage.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Arrivage non trouve" });
    if (existing.status === "recu") return res.status(400).json({ error: "Impossible de supprimer un arrivage deja recu" });

    await prisma.arrivageItem.deleteMany({ where: { arrivageId: req.params.id } });
    await prisma.arrivage.delete({ where: { id: req.params.id } });
    res.json({ message: "Arrivage supprime" });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Arrivage non trouve" });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
