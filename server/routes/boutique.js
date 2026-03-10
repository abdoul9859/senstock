const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatProduct(p) {
  if (!p) return p;
  const result = addId(p);
  if (result.category) result.category = addId(result.category);
  if (result.supplier) result.supplier = addId(result.supplier);
  if (result.variants) result.variants = result.variants.map((v) => {
    const vr = addId(v);
    if (vr.supplier) vr.supplier = addId(vr.supplier);
    return vr;
  });
  return result;
}

function formatOrder(order) {
  if (!order) return order;
  const result = addId(order);
  // Reconstruct nested customer object for frontend compat
  result.customer = {
    name: order.customerName || "",
    phone: order.customerPhone || "",
    email: order.customerEmail || "",
    address: order.customerAddress || "",
  };
  if (result.items) result.items = result.items.map(addId);
  return result;
}

// ─── Helper: generate slug from product name ───
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function uniqueSlug(base, existingId, tenantId) {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.product.findFirst({
      where: {
        slug: candidate,
        id: { not: existingId || undefined },
        tenantId,
      },
    });
    if (!existing) return candidate;
    suffix++;
  }
}

// ═══ PRODUCTS ═══

// PUT publish/unpublish a product
router.put("/products/:id/publish", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    const published = !product.published;
    const data = { published };
    if (published && !product.slug) {
      data.slug = await uniqueSlug(product.name, product.id, req.tenantId);
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true, supplier: true, variants: { include: { supplier: true } } },
    });
    res.json(formatProduct(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update online info
router.put("/products/:id/online-info", async (req, res) => {
  try {
    const {
      onlineDescription, onlineImages, onlinePrice, onlineMinPrice, onlineMaxPrice,
      onlineTags, onlineHighlights, seoTitle, seoDescription,
      featured, slug, attributes,
    } = req.body;
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    const data = {};
    if (onlineDescription !== undefined) data.onlineDescription = onlineDescription;
    if (onlineImages !== undefined) data.onlineImages = onlineImages;
    if (onlinePrice !== undefined) data.onlinePrice = onlinePrice;
    if (onlineMinPrice !== undefined) data.onlineMinPrice = onlineMinPrice;
    if (onlineMaxPrice !== undefined) data.onlineMaxPrice = onlineMaxPrice;
    if (onlineTags !== undefined) data.onlineTags = onlineTags;
    if (onlineHighlights !== undefined) data.onlineHighlights = onlineHighlights;
    if (seoTitle !== undefined) data.seoTitle = seoTitle;
    if (seoDescription !== undefined) data.seoDescription = seoDescription;
    if (featured !== undefined) data.featured = featured;
    if (slug !== undefined) data.slug = await uniqueSlug(slug || product.name, product.id, req.tenantId);
    if (attributes !== undefined) data.attributes = attributes;

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true, supplier: true, variants: { include: { supplier: true } } },
    });
    res.json(formatProduct(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ ORDERS ═══

// GET all orders
router.get("/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.tenantId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders.map(formatOrder));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single order
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: "Commande introuvable" });
    res.json(formatOrder(order));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create manual order
router.post("/orders", async (req, res) => {
  try {
    const seq = await getNextSequence("order");
    const number = `ORD-${String(seq).padStart(4, "0")}`;

    const { customer, items, subtotal, discount, shipping, total, paymentMethod, paymentStatus, promoCode, notes } = req.body;
    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({ error: "Nom et telephone client requis" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Au moins un article requis" });
    }

    const order = await prisma.order.create({
      data: {
        number,
        source: "manuel",
        tenantId: req.tenantId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
        subtotal: subtotal || 0,
        discount: discount || 0,
        shipping: shipping || 0,
        total: total || 0,
        paymentMethod: paymentMethod || "a_la_livraison",
        paymentStatus: paymentStatus || "en_attente",
        promoCode: promoCode || "",
        notes: notes || "",
        createdBy: req.userId,
        items: {
          create: items.map((it) => ({
            productId: it.product || it.productId || null,
            name: it.name || "",
            variant: it.variant || "",
            quantity: it.quantity || 1,
            price: it.price || 0,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(formatOrder(order));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update order status
router.put("/orders/:id/status", async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Commande introuvable" });

    const data = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: { items: true },
    });
    res.json(formatOrder(order));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Commande introuvable" });
    res.status(500).json({ error: e.message });
  }
});

// DELETE order
router.delete("/orders/:id", async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Commande introuvable" });
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Commande introuvable" });
    res.status(500).json({ error: e.message });
  }
});

// ═══ PROMOTIONS ═══

// GET all promotions
router.get("/promotions", async (req, res) => {
  try {
    const promos = await prisma.promotion.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(promos.map(addId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create promotion
router.post("/promotions", async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.userId, tenantId: req.tenantId };
    if (data.validFrom) data.validFrom = new Date(data.validFrom);
    if (data.validUntil) data.validUntil = new Date(data.validUntil);
    const promo = await prisma.promotion.create({ data });
    res.status(201).json(addId(promo));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update promotion
router.put("/promotions/:id", async (req, res) => {
  try {
    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Promotion introuvable" });

    const data = { ...req.body };
    delete data.tenantId;
    if (data.validFrom) data.validFrom = new Date(data.validFrom);
    if (data.validUntil) data.validUntil = new Date(data.validUntil);
    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data,
    });
    res.json(addId(promo));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Promotion introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE promotion
router.delete("/promotions/:id", async (req, res) => {
  try {
    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Promotion introuvable" });
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Promotion introuvable" });
    res.status(500).json({ error: e.message });
  }
});

// ═══ STATS ═══

router.get("/stats", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId: req.tenantId },
      include: { items: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    const totalRevenue = orders
      .filter((o) => o.status !== "annulee")
      .reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter((o) =>
      ["nouvelle", "confirmee", "en_preparation"].includes(o.status)
    ).length;
    const publishedProducts = await prisma.product.count({
      where: { published: true, archived: false, tenantId: req.tenantId },
    });

    res.json({
      todayOrders: todayOrders.length,
      todayRevenue: todayOrders
        .filter((o) => o.status !== "annulee")
        .reduce((s, o) => s + (o.total || 0), 0),
      totalRevenue,
      totalOrders: orders.length,
      pendingOrders,
      publishedProducts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
