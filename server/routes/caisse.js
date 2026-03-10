const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

// ═══ Sessions de caisse ═══

// GET current open session (or null)
router.get("/session/current", async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { status: "ouverte", tenantId: req.tenantId },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
      },
      orderBy: { openedAt: "desc" },
    });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all sessions (history)
router.get("/sessions", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const [sessions, total] = await Promise.all([
      prisma.cashSession.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { openedAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          _count: { select: { sales: true } },
        },
      }),
      prisma.cashSession.count({ where: { tenantId: req.tenantId } }),
    ]);

    // Batch aggregate: single query instead of N+1
    const sessionIds = sessions.map((s) => s.id);
    const salesTotals = sessionIds.length
      ? await prisma.cashSale.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: sessionIds } },
          _sum: { total: true },
          _count: true,
        })
      : [];

    const totalsMap = {};
    for (const row of salesTotals) {
      totalsMap[row.sessionId] = { salesTotal: row._sum.total || 0, salesCount: row._count };
    }

    const sessionsWithTotals = sessions.map((s) => ({
      ...s,
      salesTotal: totalsMap[s.id]?.salesTotal || 0,
      salesCount: totalsMap[s.id]?.salesCount || 0,
    }));

    res.json({ sessions: sessionsWithTotals, total, page: pageNum, limit: limitNum });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single session with sales
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
      },
    });
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST open a new session
router.post("/session/open", async (req, res) => {
  try {
    // Check no session already open
    const existing = await prisma.cashSession.findFirst({
      where: { status: "ouverte", tenantId: req.tenantId },
    });
    if (existing) {
      return res.status(400).json({ error: "Une session est deja ouverte", session: existing });
    }

    const { openingAmount = 0 } = req.body;
    const seq = await getNextSequence("cashSession");
    const number = `CAISSE-${String(seq).padStart(4, "0")}`;

    const session = await prisma.cashSession.create({
      data: {
        number,
        openingAmount: parseFloat(openingAmount) || 0,
        openedBy: req.user?.name || "",
        tenantId: req.tenantId,
      },
    });

    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST close session
router.post("/session/:id/close", async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.status === "cloturee") {
      return res.status(400).json({ error: "Session deja cloturee" });
    }

    const { closingAmount, notes } = req.body;

    // Compute expected amount
    const agg = await prisma.cashSale.aggregate({
      where: { sessionId: session.id },
      _sum: { total: true },
    });
    const salesTotal = agg._sum.total || 0;
    const expectedAmount = session.openingAmount + salesTotal;

    const updated = await prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: "cloturee",
        closedAt: new Date(),
        closingAmount: parseFloat(closingAmount) || expectedAmount,
        expectedAmount,
        closedBy: req.user?.name || "",
        notes: notes || "",
      },
      include: {
        sales: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ Ventes (tickets de caisse) ═══

// POST create a sale in the current session
router.post("/sales", async (req, res) => {
  try {
    const { sessionId, items, clientName, paymentMethod, amountPaid, discount, notes } = req.body;

    if (!sessionId) return res.status(400).json({ error: "sessionId requis" });
    if (!items || items.length === 0) return res.status(400).json({ error: "Aucun article" });

    const session = await prisma.cashSession.findFirst({ where: { id: sessionId, tenantId: req.tenantId } });
    if (!session || session.status !== "ouverte") {
      return res.status(400).json({ error: "Session de caisse non ouverte" });
    }

    // Validate items outside transaction
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { category: true },
      });
      if (!product) continue;

      const unitPrice = item.unitPrice || product.sellingPrice || 0;
      const qty = item.quantity || 1;
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        description: product.name + (item.variantLabel ? ` (${item.variantLabel})` : ""),
        quantity: qty,
        unitPrice,
        total: itemTotal,
        hasVariants: product.category?.hasVariants || false,
      });
    }

    if (validatedItems.length === 0) {
      return res.status(400).json({ error: "Aucun produit valide" });
    }

    const discountVal = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountVal);
    const paid = parseFloat(amountPaid) || total;
    const change = Math.max(0, paid - total);

    const seq = await getNextSequence("cashSale");
    const number = `TK-${String(seq).padStart(5, "0")}`;

    // Use transaction for atomicity: create sale + decrement stock
    const sale = await prisma.$transaction(async (tx) => {
      // Create the sale
      const created = await tx.cashSale.create({
        data: {
          number,
          sessionId,
          tenantId: req.tenantId,
          clientName: clientName || "",
          subtotal,
          discount: discountVal,
          total,
          paymentMethod: paymentMethod || "especes",
          amountPaid: paid,
          changeGiven: change,
          notes: notes || "",
          createdBy: req.user?.name || "",
          items: {
            create: validatedItems.map(({ hasVariants, ...item }) => item),
          },
        },
        include: { items: true },
      });

      // Decrement stock within the same transaction
      for (const item of validatedItems) {
        if (item.hasVariants && item.variantId) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { sold: true },
          });
        } else if (!item.hasVariants) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      return created;
    });

    res.status(201).json(sale);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET sales for a session
router.get("/sessions/:id/sales", async (req, res) => {
  try {
    const sales = await prisma.cashSale.findMany({
      where: { sessionId: req.params.id, session: { tenantId: req.tenantId } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single sale (ticket)
router.get("/sales/:id", async (req, res) => {
  try {
    const sale = await prisma.cashSale.findFirst({
      where: { id: req.params.id, session: { tenantId: req.tenantId } },
      include: { items: true, session: true },
    });
    if (!sale) return res.status(404).json({ error: "Vente introuvable" });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET product search for POS (quick search)
router.get("/products/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const products = await prisma.product.findMany({
      where: {
        archived: false,
        tenantId: req.tenantId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        category: true,
        variants: { where: { sold: false } },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    const result = products.map((p) => ({
      _id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model,
      barcode: p.barcode,
      image: p.image,
      sellingPrice: p.sellingPrice,
      quantity: p.quantity,
      hasVariants: p.category?.hasVariants || false,
      variants: p.variants.map((v) => ({
        _id: v.id,
        serialNumber: v.serialNumber,
        condition: v.condition,
        price: v.price || p.sellingPrice,
      })),
      category: p.category ? { _id: p.category.id, name: p.category.name } : null,
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET daily stats for current session
router.get("/stats/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todaySales, currentSession] = await Promise.all([
      prisma.cashSale.aggregate({
        where: { createdAt: { gte: today }, session: { tenantId: req.tenantId } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.cashSession.findFirst({
        where: { status: "ouverte", tenantId: req.tenantId },
        orderBy: { openedAt: "desc" },
      }),
    ]);

    let sessionSales = null;
    if (currentSession) {
      sessionSales = await prisma.cashSale.aggregate({
        where: { sessionId: currentSession.id },
        _sum: { total: true },
        _count: true,
      });
    }

    // Payment method breakdown for today
    const byMethod = await prisma.cashSale.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: today }, session: { tenantId: req.tenantId } },
      _sum: { total: true },
      _count: true,
    });

    res.json({
      today: {
        total: todaySales._sum.total || 0,
        count: todaySales._count,
      },
      session: currentSession
        ? {
            id: currentSession.id,
            number: currentSession.number,
            openingAmount: currentSession.openingAmount,
            total: sessionSales?._sum.total || 0,
            count: sessionSales?._count || 0,
          }
        : null,
      byMethod: byMethod.map((m) => ({
        method: m.paymentMethod,
        total: m._sum.total || 0,
        count: m._count,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/caisse/sales/:id/refund — Refund a sale
router.post("/sales/:id/refund", async (req, res) => {
  try {
    const sale = await prisma.cashSale.findFirst({
      where: { id: req.params.id, session: { tenantId: req.tenantId } },
      include: { items: true, session: true },
    });
    if (!sale) return res.status(404).json({ error: "Vente introuvable" });

    // Create refund (negative sale) in the same session
    const { getNextSequence: getSeq } = require("../helpers/counter");
    const seq = await getSeq("cashSale");
    const number = `TK-${String(seq).padStart(5, "0")}-REM`;

    const refund = await prisma.$transaction(async (tx) => {
      const created = await tx.cashSale.create({
        data: {
          number,
          sessionId: sale.sessionId,
          clientName: sale.clientName,
          subtotal: -sale.subtotal,
          discount: -sale.discount,
          total: -sale.total,
          paymentMethod: sale.paymentMethod,
          amountPaid: -sale.amountPaid,
          changeGiven: 0,
          notes: `Remboursement de ${sale.number}`,
          createdBy: req.user?.name || "",
          items: {
            create: sale.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              description: item.description,
              quantity: -item.quantity,
              unitPrice: item.unitPrice,
              total: -item.total,
            })),
          },
        },
        include: { items: true },
      });

      // Restore stock
      for (const item of sale.items) {
        if (!item.productId) continue;
        if (item.variantId) {
          // Mark variant as unsold
          await tx.variant.update({
            where: { id: item.variantId },
            data: { sold: false, soldInvoiceId: null, soldInvoiceNumber: "" },
          });
        } else {
          // Increment product quantity
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }

      return created;
    });

    res.status(201).json(refund);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/caisse/session/:id/variance — Session variance analysis
router.get("/session/:id/variance", async (req, res) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!session) return res.status(404).json({ error: "Session introuvable" });

    const agg = await prisma.cashSale.aggregate({
      where: { sessionId: session.id },
      _sum: { total: true },
    });
    const salesTotal = agg._sum.total || 0;
    const expectedAmount = session.openingAmount + salesTotal;
    const closingAmount = session.closingAmount ?? null;
    const variance = closingAmount !== null ? closingAmount - expectedAmount : null;

    res.json({
      openingAmount: session.openingAmount,
      salesTotal,
      expectedAmount,
      closingAmount,
      variance,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
