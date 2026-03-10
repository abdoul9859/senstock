const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// ═══ PUBLIC — no auth required ═══

// GET published products (supports sort, pagination, price filters)
router.get("/products", async (req, res) => {
  try {
    const { category, search, featured, sort, page, limit, minPrice, maxPrice } = req.query;
    const where = { published: true, archived: false };
    if (category) where.categoryId = category;
    if (featured === "true") where.featured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ];
    }

    // Sort options
    let orderBy = [{ featured: "desc" }, { createdAt: "desc" }];
    switch (sort) {
      case "price_asc":
        orderBy = [{ onlinePrice: "asc" }, { sellingPrice: "asc" }];
        break;
      case "price_desc":
        orderBy = [{ onlinePrice: "desc" }, { sellingPrice: "desc" }];
        break;
      case "name":
        orderBy = [{ name: "asc" }];
        break;
      case "newest":
        orderBy = [{ createdAt: "desc" }];
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit) || 12)) : 0;

    const queryOpts = {
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy,
    };

    // Apply pagination only when limit is specified
    if (limitNum > 0) {
      queryOpts.skip = (pageNum - 1) * limitNum;
      queryOpts.take = limitNum;
    }

    const products = await prisma.product.findMany(queryOpts);

    // Map to safe public format
    const result = products
      .map((p) => {
        const price = p.onlinePrice || p.sellingPrice || 0;
        const hasVariants = p.category?.hasVariants;
        const availableVariants = hasVariants
          ? p.variants.filter((v) => !v.sold).length
          : null;
        const inStock = hasVariants ? availableVariants > 0 : p.quantity > 0;

        return {
          _id: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          slug: p.slug,
          image: p.image,
          images: p.onlineImages || [],
          description: p.onlineDescription || "",
          price,
          minPrice: p.onlineMinPrice || null,
          maxPrice: p.onlineMaxPrice || null,
          tags: p.onlineTags || [],
          category: p.category ? { _id: p.category.id, name: p.category.name } : null,
          featured: p.featured,
          inStock,
          availableVariants,
          quantity: hasVariants ? null : p.quantity,
        };
      })
      .filter((p) => {
        // Post-filter by computed price
        if (minPrice && p.price < Number(minPrice)) return false;
        if (maxPrice && p.price > Number(maxPrice)) return false;
        return true;
      });

    // If pagination was used, also return total count
    if (limitNum > 0) {
      const total = await prisma.product.count({ where });
      return res.json({ products: result, total, page: pageNum, limit: limitNum });
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single product by slug
router.get("/products/:slug", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        slug: req.params.slug,
        published: true,
        archived: false,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    const price = product.onlinePrice || product.sellingPrice || 0;
    const hasVariants = product.category?.hasVariants;
    const variants = hasVariants
      ? product.variants
          .filter((v) => !v.sold)
          .map((v) => ({
            _id: v.id,
            serialNumber: v.serialNumber,
            condition: v.condition,
            price: v.price || price,
          }))
      : [];

    // Parse attributes safely
    let attributes = {};
    try {
      attributes = typeof product.attributes === "string" ? JSON.parse(product.attributes) : (product.attributes || {});
    } catch { attributes = {}; }

    res.json({
      _id: product.id,
      name: product.name,
      brand: product.brand,
      model: product.model,
      slug: product.slug,
      image: product.image,
      images: product.onlineImages || [],
      description: product.onlineDescription || product.description || "",
      price,
      minPrice: product.onlineMinPrice || null,
      maxPrice: product.onlineMaxPrice || null,
      tags: product.onlineTags || [],
      highlights: product.onlineHighlights || [],
      attributes,
      seoTitle: product.seoTitle || "",
      seoDescription: product.seoDescription || "",
      category: product.category ? { _id: product.category.id, name: product.category.name } : null,
      featured: product.featured,
      inStock: hasVariants ? variants.length > 0 : product.quantity > 0,
      quantity: hasVariants ? null : product.quantity,
      variants,
      hasVariants,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET related products for a given product
router.get("/products/:slug/related", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        slug: req.params.slug,
        published: true,
        archived: false,
      },
    });
    if (!product) return res.status(404).json({ error: "Produit introuvable" });

    // Find products in same category, excluding current product
    const where = {
      published: true,
      archived: false,
      id: { not: product.id },
    };
    if (product.categoryId) where.categoryId = product.categoryId;

    const related = await prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 8,
    });

    const result = related.map((p) => {
      const price = p.onlinePrice || p.sellingPrice || 0;
      const hasVariants = p.category?.hasVariants;
      const availableVariants = hasVariants
        ? p.variants.filter((v) => !v.sold).length
        : null;
      const inStock = hasVariants ? availableVariants > 0 : p.quantity > 0;

      return {
        _id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        slug: p.slug,
        image: p.image,
        images: p.onlineImages || [],
        price,
        minPrice: p.onlineMinPrice || null,
        maxPrice: p.onlineMaxPrice || null,
        tags: p.onlineTags || [],
        category: p.category ? { _id: p.category.id, name: p.category.name } : null,
        featured: p.featured,
        inStock,
        availableVariants,
        quantity: hasVariants ? null : p.quantity,
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create order from storefront
router.post("/orders", async (req, res) => {
  try {
    const { customer, items, promoCode, paymentMethod, notes } = req.body;

    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({ error: "Nom et telephone requis" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Panier vide" });
    }

    // Validate items and compute totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true },
      });
      if (!product || !product.published) continue;

      const price = product.onlinePrice || product.sellingPrice || 0;
      const qty = item.quantity || 1;
      subtotal += price * qty;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        variant: item.variant || "",
        quantity: qty,
        price,
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({ error: "Aucun produit valide dans le panier" });
    }

    // Apply promo code
    let discount = 0;
    if (promoCode) {
      const promo = await prisma.promotion.findFirst({
        where: {
          code: promoCode.toUpperCase(),
          active: true,
        },
      });
      if (promo) {
        const now = new Date();
        const valid =
          (!promo.validFrom || now >= promo.validFrom) &&
          (!promo.validUntil || now <= promo.validUntil) &&
          (promo.maxUses === 0 || promo.usedCount < promo.maxUses) &&
          subtotal >= promo.minOrder;

        if (valid) {
          discount =
            promo.type === "pourcentage"
              ? Math.round((subtotal * promo.value) / 100)
              : promo.value;
          discount = Math.min(discount, subtotal);
          await prisma.promotion.update({
            where: { id: promo.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const total = Math.max(0, subtotal - discount);

    const seq = await getNextSequence("order");
    const number = `ORD-${String(seq).padStart(4, "0")}`;

    const order = await prisma.order.create({
      data: {
        number,
        source: "boutique",
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
        subtotal,
        discount,
        total,
        paymentMethod: paymentMethod || "a_la_livraison",
        promoCode: promoCode || "",
        notes: notes || "",
        items: {
          create: validatedItems,
        },
      },
    });

    res.status(201).json({ number: order.number, total: order.total, _id: order.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST validate promo code
router.post("/validate-promo", async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: "Code requis" });

    const promo = await prisma.promotion.findFirst({
      where: { code: code.toUpperCase(), active: true },
    });
    if (!promo) return res.status(404).json({ error: "Code promo invalide" });

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      return res.status(400).json({ error: "Ce code n'est pas encore actif" });
    }
    if (promo.validUntil && now > promo.validUntil) {
      return res.status(400).json({ error: "Ce code a expire" });
    }
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: "Ce code a atteint sa limite d'utilisation" });
    }
    if (subtotal && subtotal < promo.minOrder) {
      return res.status(400).json({
        error: `Montant minimum de commande: ${promo.minOrder.toLocaleString("fr-FR")} F`,
      });
    }

    const discount =
      promo.type === "pourcentage"
        ? Math.round(((subtotal || 0) * promo.value) / 100)
        : promo.value;

    res.json({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount: Math.min(discount, subtotal || discount),
      label: promo.type === "pourcentage" ? `-${promo.value}%` : `-${promo.value.toLocaleString("fr-FR")} F`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET categories (for filters)
router.get("/categories", async (_req, res) => {
  try {
    // Only return categories that have published products
    const categoriesWithProducts = await prisma.product.findMany({
      where: { published: true, archived: false },
      select: { categoryId: true },
      distinct: ["categoryId"],
    });
    const categoryIds = categoriesWithProducts.map((p) => p.categoryId);

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json(categories.map(addId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
