const router = require("express").Router();
const prisma = require("../db");

// Backwards compat: add _id alias
function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/search?q=...
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ products: [], variants: [], suppliers: [], clients: [] });

    const limit = 8;

    // Products by name, brand, model
    const products = await prisma.product.findMany({
      where: {
        tenantId: req.tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brand: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        image: true,
        sellingPrice: true,
        archived: true,
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        variants: true,
      },
      take: limit,
    });

    // Map products for backwards compat
    const productsOut = products.map((p) => ({
      ...p,
      _id: p.id,
      category: p.category ? { ...p.category, _id: p.category.id } : null,
      supplier: p.supplier ? { ...p.supplier, _id: p.supplier.id } : null,
      variants: p.variants.map((v) => ({ ...v, _id: v.id })),
    }));

    // Variants by serialNumber or barcode — query the Variant table directly
    const matchingVariants = await prisma.variant.findMany({
      where: {
        product: { tenantId: req.tenantId },
        OR: [
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            image: true,
            category: { select: { name: true } },
          },
        },
      },
      take: limit,
    });

    const variants = matchingVariants.map((v) => ({
      _id: v.id,
      id: v.id,
      serialNumber: v.serialNumber,
      barcode: v.barcode,
      condition: v.condition,
      sold: v.sold,
      price: v.price,
      productId: v.product?.id || v.productId,
      productName: v.product?.name || "",
      productBrand: v.product?.brand || "",
      productImage: v.product?.image || "",
      category: v.product?.category?.name || "",
    }));

    // Suppliers by name, phone, email
    const suppliers = await prisma.supplier.findMany({
      where: {
        deleted: false,
        tenantId: req.tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
      take: limit,
    });

    // Clients by name, phone, email
    const clients = await prisma.client.findMany({
      where: {
        deleted: false,
        tenantId: req.tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, phone: true, email: true },
      take: limit,
    });

    res.json({
      products: productsOut,
      variants,
      suppliers: suppliers.map(addId),
      clients: clients.map(addId),
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur de recherche" });
  }
});

// GET /api/search/advanced — Advanced search with filters
router.get("/advanced", async (req, res) => {
  try {
    const {
      q,
      type = "all",
      dateFrom,
      dateTo,
      priceMin,
      priceMax,
      status,
      category,
      limit: limitParam,
    } = req.query;

    const limit = Math.min(100, Math.max(1, parseInt(limitParam) || 20));
    const results = {};
    const counts = {};

    const searchTypes = type === "all" ? ["product", "invoice", "client"] : [type];

    // Products
    if (searchTypes.includes("product")) {
      const where = {
        tenantId: req.tenantId,
        deleted: false,
      };
      if (q && q.trim().length >= 2) {
        where.OR = [
          { name: { contains: q.trim(), mode: "insensitive" } },
          { brand: { contains: q.trim(), mode: "insensitive" } },
          { model: { contains: q.trim(), mode: "insensitive" } },
          { barcode: { contains: q.trim(), mode: "insensitive" } },
        ];
      }
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }
      if (priceMin !== undefined || priceMax !== undefined) {
        where.sellingPrice = {};
        if (priceMin !== undefined) where.sellingPrice.gte = parseFloat(priceMin);
        if (priceMax !== undefined) where.sellingPrice.lte = parseFloat(priceMax);
      }
      if (category) {
        where.categoryId = category;
      }

      const [products, productCount] = await Promise.all([
        prisma.product.findMany({
          where,
          select: {
            id: true, name: true, brand: true, model: true, barcode: true,
            image: true, sellingPrice: true, purchasePrice: true, quantity: true,
            archived: true, createdAt: true,
            category: { select: { id: true, name: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.count({ where }),
      ]);

      results.products = products.map(addId);
      counts.products = productCount;
    }

    // Invoices
    if (searchTypes.includes("invoice")) {
      const where = {
        tenantId: req.tenantId,
        deleted: { not: true },
      };
      if (q && q.trim().length >= 2) {
        where.OR = [
          { number: { contains: q.trim(), mode: "insensitive" } },
          { client: { name: { contains: q.trim(), mode: "insensitive" } } },
        ];
      }
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
      }
      if (priceMin !== undefined || priceMax !== undefined) {
        where.total = {};
        if (priceMin !== undefined) where.total.gte = parseFloat(priceMin);
        if (priceMax !== undefined) where.total.lte = parseFloat(priceMax);
      }
      if (status) {
        where.status = status;
      }

      const [invoices, invoiceCount] = await Promise.all([
        prisma.invoice.findMany({
          where,
          select: {
            id: true, number: true, type: true, status: true,
            date: true, total: true, createdAt: true,
            client: { select: { id: true, name: true, phone: true } },
          },
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.invoice.count({ where }),
      ]);

      results.invoices = invoices.map(addId);
      counts.invoices = invoiceCount;
    }

    // Clients
    if (searchTypes.includes("client")) {
      const where = {
        tenantId: req.tenantId,
        deleted: false,
      };
      if (q && q.trim().length >= 2) {
        where.OR = [
          { name: { contains: q.trim(), mode: "insensitive" } },
          { phone: { contains: q.trim(), mode: "insensitive" } },
          { email: { contains: q.trim(), mode: "insensitive" } },
        ];
      }
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [clients, clientCount] = await Promise.all([
        prisma.client.findMany({
          where,
          select: { id: true, name: true, phone: true, email: true, address: true, createdAt: true },
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.client.count({ where }),
      ]);

      results.clients = clients.map(addId);
      counts.clients = clientCount;
    }

    res.json({ results, counts });
  } catch (err) {
    res.status(500).json({ error: "Erreur de recherche avancee" });
  }
});

module.exports = router;
