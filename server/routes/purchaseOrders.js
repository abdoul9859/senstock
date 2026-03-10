const express = require("express");
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatOrder(order) {
  if (!order) return order;
  const result = addId(order);
  if (result.supplier) result.supplier = addId(result.supplier);
  if (result.items) result.items = result.items.map((item) => {
    const i = addId(item);
    if (i.product) i.product = addId(i.product);
    return i;
  });
  return result;
}

const statusFlow = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["confirmee", "annulee"],
  confirmee: ["en_transit", "annulee"],
  en_transit: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

const orderInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, brand: true, model: true, image: true } },
    },
  },
};

// GET /
router.get("/", async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { deleted: false, tenantId: req.tenantId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(orders.map(formatOrder));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /stats
router.get("/stats", async (req, res) => {
  try {
    const all = await prisma.purchaseOrder.findMany({ where: { tenantId: req.tenantId } });
    const stats = {
      total: all.length,
      brouillon: all.filter((o) => o.status === "brouillon").length,
      envoyee: all.filter((o) => o.status === "envoyee").length,
      confirmee: all.filter((o) => o.status === "confirmee").length,
      en_transit: all.filter((o) => o.status === "en_transit").length,
      livree: all.filter((o) => o.status === "livree").length,
      totalValue: all
        .filter((o) => o.status !== "annulee")
        .reduce((s, o) => s + o.total, 0),
      pendingValue: all
        .filter((o) => !["livree", "annulee"].includes(o.status))
        .reduce((s, o) => s + o.total, 0),
    };
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        supplier: true,
        items: {
          include: {
            product: { select: { id: true, name: true, brand: true, model: true, image: true } },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ error: "Commande non trouvee" });
    res.json(formatOrder(order));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const { supplier, items, shipping, expectedDeliveryDate, paymentMethod, notes } = req.body;
    if (!supplier) return res.status(400).json({ error: "Fournisseur requis" });
    if (!items || items.length === 0) return res.status(400).json({ error: "Au moins un article requis" });

    const seq = await getNextSequence("purchase_order");
    const number = `CMD-${String(seq).padStart(4, "0")}`;

    const processedItems = items.map((it) => ({
      productId: it.product || it.productId || null,
      description: it.description || "",
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      total: (it.quantity || 1) * (it.unitPrice || 0),
    }));

    const subtotal = processedItems.reduce((s, it) => s + it.total, 0);
    const total = subtotal + (shipping || 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        number,
        tenantId: req.tenantId,
        supplierId: supplier,
        subtotal,
        shipping: shipping || 0,
        total,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        paymentMethod: paymentMethod || "especes",
        notes: notes || "",
        createdBy: req.userId,
        items: {
          create: processedItems,
        },
      },
      include: orderInclude,
    });

    res.status(201).json(formatOrder(order));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /:id
router.put("/:id", async (req, res) => {
  try {
    const existingOrder = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existingOrder) return res.status(404).json({ error: "Commande non trouvee" });
    const { items, shipping, expectedDeliveryDate, paymentMethod, paymentStatus, notes } = req.body;

    const update = {};
    if (notes !== undefined) update.notes = notes;
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
    if (expectedDeliveryDate !== undefined) update.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;

    if (items) {
      const processedItems = items.map((it) => ({
        productId: it.product || it.productId || null,
        description: it.description || "",
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        total: (it.quantity || 1) * (it.unitPrice || 0),
      }));
      const subtotal = processedItems.reduce((s, it) => s + it.total, 0);
      update.subtotal = subtotal;
      update.shipping = shipping !== undefined ? shipping : 0;
      update.total = subtotal + update.shipping;

      // Delete existing items and recreate
      await prisma.purchaseOrderItem.deleteMany({ where: { orderId: req.params.id } });
      update.items = { create: processedItems };
    } else if (shipping !== undefined) {
      const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
      update.shipping = shipping;
      update.total = (existing?.subtotal || 0) + shipping;
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: update,
      include: orderInclude,
    });
    if (!order) return res.status(404).json({ error: "Commande non trouvee" });
    res.json(formatOrder(order));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Commande non trouvee" });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /:id/status
router.put("/:id/status", async (req, res) => {
  try {
    const order = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!order) return res.status(404).json({ error: "Commande non trouvee" });

    const { status } = req.body;
    const allowed = statusFlow[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Transition ${order.status} -> ${status} non autorisee` });
    }

    const data = { status };
    if (status === "livree") {
      data.actualDeliveryDate = new Date();
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data,
      include: orderInclude,
    });
    res.json(formatOrder(updated));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /:id (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Commande non trouvee" });
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    if (!order) return res.status(404).json({ error: "Commande non trouvee" });
    res.json({ message: "Commande deplacee dans la corbeille" });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Commande non trouvee" });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
