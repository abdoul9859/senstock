const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const { getNextSequence } = require("../helpers/counter");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatQuote(q) {
  if (!q) return q;
  const obj = addId(q);
  if (obj.items) obj.items = addId(obj.items);
  if (obj.client) obj.client = addId(obj.client);
  return obj;
}

// GET /api/quotes/next-number — preview next number
router.get("/next-number", async (req, res) => {
  try {
    const counter = await prisma.counter.findUnique({ where: { id: "quote" } });
    const nextSeq = (counter ? counter.seq : 0) + 1;
    const number = `DEV-${String(nextSeq).padStart(4, "0")}`;
    res.json({ number });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/quotes — list with filters
router.get("/", async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.client) where.clientId = req.query.client;
    if (req.query.from || req.query.to) {
      where.date = {};
      if (req.query.from) where.date.gte = new Date(req.query.from);
      if (req.query.to) where.date.lte = new Date(req.query.to);
    }
    where.deleted = { not: true };
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(quotes.map(formatQuote));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/quotes/:id — single quote
router.get("/:id", async (req, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, brand: true, model: true, image: true },
            },
          },
        },
      },
    });
    if (!quote) return res.status(404).json({ error: "Devis non trouve" });

    const formatted = formatQuote(quote);
    if (formatted.items) {
      formatted.items = formatted.items.map((item) => {
        const i = { ...item };
        if (i.product) {
          i.product = addId(i.product);
          i.productId = addId(i.product);
        }
        return i;
      });
    }

    res.json(formatted);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/quotes — create quote
router.post("/", async (req, res) => {
  try {
    const {
      client, date, validUntil, items, subtotal,
      showTax, taxRate, taxAmount, total,
      showItemPrices, showSectionTotals, notes, signature,
    } = req.body;

    // Generate quote number atomically
    const seq = await getNextSequence("quote");
    const number = `DEV-${String(seq).padStart(4, "0")}`;

    const quote = await prisma.quote.create({
      data: {
        tenantId: req.tenantId,
        number,
        status: "brouillon",
        clientId: client || undefined,
        date: date ? new Date(date) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        subtotal: subtotal || 0,
        showTax: showTax ?? false,
        taxRate: taxRate ?? 18,
        taxAmount: taxAmount || 0,
        total: total || 0,
        showItemPrices: showItemPrices ?? true,
        showSectionTotals: showSectionTotals ?? false,
        notes: notes || "",
        signature: signature || "",
        createdBy: req.userId,
        items: {
          create: (items || []).map((item, idx) => ({
            type: item.type || "product",
            productId: item.productId || undefined,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
            sortOrder: idx,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
    });

    res.status(201).json(formatQuote(quote));
  } catch (err) {
    logger.error("Quote creation error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la creation du devis" });
  }
});

// PUT /api/quotes/:id — update quote
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Devis non trouve" });

    const data = {};
    const flatFields = [
      "date", "validUntil", "subtotal",
      "showTax", "taxRate", "taxAmount", "total",
      "showItemPrices", "showSectionTotals", "notes", "signature", "status",
    ];
    for (const key of flatFields) {
      if (req.body[key] !== undefined) {
        if (key === "date" || key === "validUntil") {
          data[key] = new Date(req.body[key]);
        } else {
          data[key] = req.body[key];
        }
      }
    }
    if (req.body.client !== undefined) {
      data.clientId = req.body.client;
    }

    // Handle items update
    if (req.body.items !== undefined) {
      await prisma.quoteItem.deleteMany({ where: { quoteId: req.params.id } });
      if (req.body.items && req.body.items.length > 0) {
        await prisma.quoteItem.createMany({
          data: req.body.items.map((item, idx) => ({
            quoteId: req.params.id,
            type: item.type || "product",
            productId: item.productId || undefined,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            total: item.total || 0,
            sortOrder: idx,
          })),
        });
      }
    }

    await prisma.quote.update({
      where: { id: req.params.id },
      data,
    });

    const updated = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
      },
    });
    res.json(formatQuote(updated));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/quotes/:id/convert — convert quote to invoice
router.post("/:id/convert", async (req, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: true },
    });
    if (!quote) return res.status(404).json({ error: "Devis non trouve" });
    if (quote.status === "converti") return res.status(400).json({ error: "Devis deja converti" });

    // Generate invoice number
    const type = req.body.invoiceType || "facture";
    const prefixMap = { facture: "FAC", proforma: "PRO", avoir: "AVO", echange: "ECH", vente_flash: "VF" };
    const prefix = prefixMap[type] || "FAC";
    const seq = await getNextSequence(`invoice_${type}`);
    const number = `${prefix}-${String(seq).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: req.tenantId,
        number,
        type,
        status: "brouillon",
        clientId: quote.clientId || undefined,
        date: new Date(),
        subtotal: quote.subtotal,
        showTax: quote.showTax,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        showItemPrices: quote.showItemPrices,
        showSectionTotals: quote.showSectionTotals,
        notes: quote.notes,
        signature: quote.signature,
        convertedFromId: quote.id,
        createdBy: req.userId,
        items: {
          create: quote.items.map((i, idx) => ({
            type: i.type,
            productId: i.productId || undefined,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
            sortOrder: idx,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        exchangeItems: true,
        paymentHistory: true,
      },
    });

    // Mark quote as converted
    await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: "converti", convertedToInvoiceId: invoice.id },
    });

    // Format the invoice for frontend compat
    const formatted = addId(invoice);
    formatted.payment = {
      enabled: invoice.paymentEnabled,
      amount: invoice.paymentAmount,
      method: invoice.paymentMethod,
      date: invoice.paymentDate,
    };
    formatted.warranty = {
      enabled: invoice.warrantyEnabled,
      duration: invoice.warrantyDuration,
      description: invoice.warrantyDescription,
    };
    if (formatted.items) formatted.items = addId(formatted.items);
    if (formatted.exchangeItems) formatted.exchangeItems = addId(formatted.exchangeItems);
    if (formatted.paymentHistory) formatted.paymentHistory = addId(formatted.paymentHistory);
    if (formatted.client) formatted.client = addId(formatted.client);

    res.json(formatted);
  } catch (err) {
    logger.error("Quote conversion error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la conversion du devis" });
  }
});

// DELETE /api/quotes/:id — delete quote
router.delete("/:id", async (req, res) => {
  try {
    const quote = await prisma.quote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!quote) return res.status(404).json({ error: "Devis non trouve" });
    await prisma.quote.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    res.json({ message: "Devis deplace dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
