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

function logMovement(data) {
  prisma.stockMovement.create({ data: {
    type: data.type,
    productId: data.productId || undefined,
    productName: data.productName,
    details: data.details || "",
    meta: data.meta || {},
    userId: data.user || undefined,
  }}).catch(() => {});
}

// ═══ Status transition validation ═══
const VALID_TRANSITIONS = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["payee", "partielle", "en_retard", "annulee"],
  partielle: ["payee", "en_retard", "annulee"],
  en_retard: ["payee", "partielle", "annulee"],
  payee: [],
  annulee: ["brouillon"],
};

function validateStatusTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

function getPrefix(type) {
  if (type === "proforma") return "PRO";
  if (type === "avoir") return "AVO";
  if (type === "echange") return "ECH";
  if (type === "vente_flash") return "VF";
  return "FAC";
}

// Reconstruct nested payment/warranty/paymentHistory objects for frontend compat
function formatInvoice(inv) {
  if (!inv) return inv;
  const obj = addId(inv);
  // Reconstruct nested payment object
  obj.payment = {
    enabled: inv.paymentEnabled,
    amount: inv.paymentAmount,
    method: inv.paymentMethod,
    date: inv.paymentDate,
  };
  // Reconstruct nested warranty object
  obj.warranty = {
    enabled: inv.warrantyEnabled,
    duration: inv.warrantyDuration,
    description: inv.warrantyDescription,
  };
  // Add _id to nested arrays
  if (obj.items) obj.items = addId(obj.items);
  if (obj.exchangeItems) obj.exchangeItems = addId(obj.exchangeItems);
  if (obj.paymentHistory) obj.paymentHistory = addId(obj.paymentHistory);
  if (obj.client) obj.client = addId(obj.client);
  return obj;
}

function formatInvoices(arr) {
  if (!arr) return arr;
  return arr.map(formatInvoice);
}

// GET /api/invoices/next-number?type=facture — preview next number
// MUST be before /:id to avoid Express treating "next-number" as an ID
router.get("/next-number", async (req, res) => {
  try {
    const type = req.query.type || "facture";
    const prefix = getPrefix(type);
    // Peek at next number without incrementing
    const counter = await prisma.counter.findUnique({ where: { id: `invoice_${type}` } });
    const nextSeq = (counter ? counter.seq : 0) + 1;
    const number = `${prefix}-${String(nextSeq).padStart(4, "0")}`;
    res.json({ number });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/invoices — list with filters
router.get("/", async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.client) where.clientId = req.query.client;
    if (req.query.from || req.query.to) {
      where.date = {};
      if (req.query.from) where.date.gte = new Date(req.query.from);
      if (req.query.to) where.date.lte = new Date(req.query.to);
    }

    // Search by IMEI / barcode / invoice number
    if (req.query.search) {
      const q = req.query.search.trim();
      if (q) {
        // Find products whose variants match the search term
        const matchingVariants = await prisma.variant.findMany({
          where: {
            OR: [
              { serialNumber: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { productId: true },
        });
        const productIds = [...new Set(matchingVariants.map((v) => v.productId))];

        const orConditions = [
          { number: { contains: q, mode: "insensitive" } },
        ];
        if (productIds.length > 0) {
          orConditions.push({
            items: { some: { productId: { in: productIds } } },
          });
        }
        where.OR = orConditions;
      }
    }

    where.deleted = { not: true };
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        exchangeItems: true,
        paymentHistory: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(formatInvoices(invoices));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/invoices/:id — single invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, brand: true, model: true, image: true,
                variants: true,
                supplier: { select: { id: true, name: true, phone: true } },
              },
            },
          },
        },
        exchangeItems: true,
        paymentHistory: true,
      },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    // Backfill paymentHistory for invoices created before the feature
    if (invoice.paymentEnabled && invoice.paymentAmount > 0 && (!invoice.paymentHistory || invoice.paymentHistory.length === 0)) {
      const entry = {
        amount: invoice.paymentAmount,
        method: invoice.paymentMethod || "especes",
        date: invoice.paymentDate || invoice.createdAt,
        note: "",
      };
      await prisma.paymentHistoryEntry.create({
        data: {
          invoiceId: invoice.id,
          amount: entry.amount,
          method: entry.method,
          date: entry.date,
          note: entry.note,
        },
      });
      invoice.paymentHistory = [{ ...entry, id: "backfill", invoiceId: invoice.id }];
    }

    // Add _id to product items for compat
    const formatted = formatInvoice(invoice);
    if (formatted.items) {
      formatted.items = formatted.items.map((item) => {
        const i = { ...item };
        if (i.product) {
          i.product = addId(i.product);
          i.productId = addId(i.product);
          if (i.product.variants) i.product.variants = addId(i.product.variants);
          if (i.product.supplier) i.product.supplier = addId(i.product.supplier);
        }
        return i;
      });
    }

    res.json(formatted);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/invoices — create invoice
router.post("/", async (req, res) => {
  try {
    const {
      type, client, date, dueDate, items, exchangeItems, subtotal,
      showTax, taxRate, taxAmount, total,
      showItemPrices, showSectionTotals,
      payment, warranty, notes, signature,
      discountAmount, discountReason,
    } = req.body;

    // Generate invoice number atomically
    const prefix = getPrefix(type || "facture");
    const seq = await getNextSequence(`invoice_${type || "facture"}`);
    const number = `${prefix}-${String(seq).padStart(4, "0")}`;

    // Determine initial status
    let status = "brouillon";
    if (payment?.enabled && payment.amount >= total) {
      status = "payee";
    } else if (payment?.enabled && payment.amount > 0) {
      status = "partielle";
    }

    // Build initial payment history
    const paymentHistoryData = [];
    if (payment?.enabled && payment.amount > 0) {
      paymentHistoryData.push({
        amount: payment.amount,
        method: payment.method || "especes",
        date: payment.date ? new Date(payment.date) : new Date(),
        note: "",
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: req.tenantId,
        number,
        type: type || "facture",
        status,
        clientId: client || undefined,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        subtotal: subtotal || 0,
        discountAmount: discountAmount || 0,
        discountReason: discountReason || "",
        showTax: showTax ?? false,
        taxRate: taxRate ?? 18,
        taxAmount: taxAmount || 0,
        total: total || 0,
        showItemPrices: showItemPrices ?? true,
        showSectionTotals: showSectionTotals ?? false,
        paymentEnabled: payment?.enabled || false,
        paymentAmount: payment?.amount || 0,
        paymentMethod: payment?.method || "especes",
        paymentDate: payment?.date ? new Date(payment.date) : undefined,
        warrantyEnabled: warranty?.enabled || false,
        warrantyDuration: warranty?.duration || "",
        warrantyDescription: warranty?.description || "",
        notes: notes || "",
        signature: signature || "",
        createdBy: req.userId,
        items: {
          create: (items || []).map((item, idx) => ({
            type: item.type || "product",
            productId: item.productId || undefined,
            variantId: item.variantId || undefined,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            externalPrice: item.externalPrice ?? undefined,
            purchasePrice: item.purchasePrice || 0,
            discountAmount: item.discountAmount || 0,
            discountReason: item.discountReason || "",
            total: item.total || 0,
            sortOrder: idx,
          })),
        },
        exchangeItems: {
          create: (exchangeItems || []).map((ei) => ({
            description: ei.description || "",
            productId: ei.productId || undefined,
            variantId: ei.variantId || undefined,
            variantLabel: ei.variantLabel || "",
            price: ei.price || 0,
            quantity: ei.quantity || 1,
            notes: ei.notes || "",
            addToStock: ei.addToStock || false,
          })),
        },
        paymentHistory: {
          create: paymentHistoryData,
        },
      },
      include: {
        items: true,
        exchangeItems: true,
        paymentHistory: true,
      },
    });

    // Mark variant products as sold & decrement simple product quantities
    if (type !== "avoir" && items) {
      for (const item of items) {
        if (item.type !== "product" || !item.productId) continue;

        if (item.variantId) {
          // Variant product — mark variant as sold
          await prisma.variant.update({
            where: { id: item.variantId },
            data: { sold: true, soldInvoiceId: invoice.id, soldInvoiceNumber: number },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "variant_sold",
              productId: item.productId,
              productName: product.name,
              details: `Vendu via facture ${number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: number, variantId: item.variantId },
              user: req.userId,
            });
          }
        } else {
          // Simple product — decrement quantity
          const qty = item.quantity || 1;
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: qty } },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "quantity_updated",
              productId: item.productId,
              productName: product.name,
              details: `Quantite -${qty} via facture ${number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: number, quantityChange: -qty },
              user: req.userId,
            });
          }
        }
      }
    }

    // Avoir (credit note) — reverse stock: un-sell variants, increment quantities
    if (type === "avoir" && items) {
      for (const item of items) {
        if (item.type !== "product" || !item.productId) continue;

        if (item.variantId) {
          // Variant product — mark variant as unsold (returned to stock)
          await prisma.variant.update({
            where: { id: item.variantId },
            data: { sold: false, soldInvoiceId: null, soldInvoiceNumber: "" },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "variant_returned",
              productId: item.productId,
              productName: product.name,
              details: `Retour stock via avoir ${number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: number, variantId: item.variantId },
              user: req.userId,
            });
          }
        } else {
          // Simple product — increment quantity (returned)
          const qty = item.quantity || 1;
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: qty } },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "quantity_updated",
              productId: item.productId,
              productName: product.name,
              details: `Retour +${qty} via avoir ${number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: number, quantityChange: qty },
              user: req.userId,
            });
          }
        }
      }
    }

    // Handle exchange items — add received products to stock if requested
    if (type === "echange" && exchangeItems) {
      for (const ei of exchangeItems) {
        if (!ei.addToStock || !ei.productId) continue;
        if (ei.variantId) {
          // Un-sold the variant (it's being returned/exchanged into stock)
          await prisma.variant.update({
            where: { id: ei.variantId },
            data: { sold: false, soldInvoiceId: null, soldInvoiceNumber: "" },
          });
          const product = await prisma.product.findUnique({
            where: { id: ei.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "variants_added",
              productId: ei.productId,
              productName: product.name,
              details: `Produit echange recu via facture ${number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: number },
              user: req.userId,
            });
          }
        } else {
          // Simple product — increment quantity
          const qty = ei.quantity || 1;
          await prisma.product.update({
            where: { id: ei.productId },
            data: { quantity: { increment: qty } },
          });
        }
      }
    }

    const populated = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        exchangeItems: true,
        paymentHistory: true,
      },
    });
    res.status(201).json(formatInvoice(populated));
  } catch (err) {
    logger.error("Invoice creation error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la creation de la facture" });
  }
});

// PUT /api/invoices/:id — update invoice
router.put("/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { paymentHistory: true },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    const data = {};

    // Map allowed flat fields
    const flatFields = [
      "type", "date", "dueDate", "subtotal",
      "discountAmount", "discountReason",
      "showTax", "taxRate", "taxAmount", "total",
      "showItemPrices", "showSectionTotals",
      "notes", "signature", "status",
    ];
    for (const key of flatFields) {
      if (req.body[key] !== undefined) {
        if (key === "date" || key === "dueDate") {
          data[key] = new Date(req.body[key]);
        } else {
          data[key] = req.body[key];
        }
      }
    }

    // Validate status transition if status is being changed directly
    if (req.body.status !== undefined && req.body.status !== invoice.status) {
      if (!validateStatusTransition(invoice.status, req.body.status)) {
        const allowed = VALID_TRANSITIONS[invoice.status] || [];
        const allowedStr = allowed.length > 0 ? allowed.join(", ") : "aucune";
        return res.status(400).json({
          error: `Transition de statut invalide : impossible de passer de "${invoice.status}" a "${req.body.status}". Transitions autorisees depuis "${invoice.status}" : ${allowedStr}.`,
        });
      }
    }

    if (req.body.client !== undefined) {
      data.clientId = req.body.client;
    }

    // Handle items update — delete old and create new
    if (req.body.items !== undefined) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
      if (req.body.items && req.body.items.length > 0) {
        await prisma.invoiceItem.createMany({
          data: req.body.items.map((item, idx) => ({
            invoiceId: req.params.id,
            type: item.type || "product",
            productId: item.productId || undefined,
            variantId: item.variantId || undefined,
            description: item.description || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            externalPrice: item.externalPrice ?? undefined,
            purchasePrice: item.purchasePrice || 0,
            discountAmount: item.discountAmount || 0,
            discountReason: item.discountReason || "",
            total: item.total || 0,
            sortOrder: idx,
          })),
        });
      }
    }

    // Handle exchangeItems update
    if (req.body.exchangeItems !== undefined) {
      await prisma.exchangeItem.deleteMany({ where: { invoiceId: req.params.id } });
      if (req.body.exchangeItems && req.body.exchangeItems.length > 0) {
        await prisma.exchangeItem.createMany({
          data: req.body.exchangeItems.map((ei) => ({
            invoiceId: req.params.id,
            description: ei.description || "",
            productId: ei.productId || undefined,
            variantId: ei.variantId || undefined,
            variantLabel: ei.variantLabel || "",
            price: ei.price || 0,
            quantity: ei.quantity || 1,
            notes: ei.notes || "",
            addToStock: ei.addToStock || false,
          })),
        });
      }
    }

    // Handle payment update
    const newPaymentHistoryEntries = [];
    if (req.body.payment !== undefined) {
      const payment = req.body.payment;
      const totalVal = req.body.total ?? invoice.total;
      data.paymentEnabled = payment.enabled || false;
      data.paymentAmount = payment.amount || 0;
      data.paymentMethod = payment.method || "especes";
      data.paymentDate = payment.date ? new Date(payment.date) : undefined;

      if (!payment.enabled || payment.amount <= 0) {
        // Payment cancelled
        if (!data.status) {
          data.status = invoice.status === "brouillon" ? "brouillon" : "envoyee";
        }
        const prevAmount = invoice.paymentEnabled ? (invoice.paymentAmount || 0) : 0;
        if (prevAmount > 0) {
          newPaymentHistoryEntries.push({
            invoiceId: req.params.id,
            amount: -prevAmount,
            method: payment.method || "especes",
            date: new Date(),
            note: "Paiement annule",
          });
        }
      } else {
        const prevAmount = invoice.paymentEnabled ? (invoice.paymentAmount || 0) : 0;
        const delta = payment.amount - prevAmount;
        if (delta > 0) {
          newPaymentHistoryEntries.push({
            invoiceId: req.params.id,
            amount: delta,
            method: payment.method || "especes",
            date: payment.date ? new Date(payment.date) : new Date(),
            note: "",
          });
        }
        if (payment.amount >= totalVal) {
          data.status = "payee";
        } else {
          data.status = "partielle";
        }
      }
    }

    // Handle warranty update
    if (req.body.warranty !== undefined) {
      const warranty = req.body.warranty;
      data.warrantyEnabled = warranty.enabled || false;
      data.warrantyDuration = warranty.duration || "";
      data.warrantyDescription = warranty.description || "";
    }

    await prisma.invoice.update({
      where: { id: req.params.id },
      data,
    });

    // Create new payment history entries
    if (newPaymentHistoryEntries.length > 0) {
      await prisma.paymentHistoryEntry.createMany({ data: newPaymentHistoryEntries });
    }

    const updated = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        exchangeItems: true,
        paymentHistory: true,
      },
    });
    res.json(formatInvoice(updated));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/invoices/:id — delete invoice + reverse stock
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    // Reverse stock changes and log movements
    if (invoice.type !== "avoir" && invoice.items) {
      for (const item of invoice.items) {
        if (item.type !== "product" || !item.productId) continue;
        if (item.variantId) {
          await prisma.variant.update({
            where: { id: item.variantId },
            data: { sold: false, soldInvoiceId: null, soldInvoiceNumber: "" },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "variant_returned",
              productId: item.productId,
              productName: product.name,
              details: `Retour stock — suppression facture ${invoice.number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: invoice.number, variantId: item.variantId },
              user: req.userId,
            });
          }
        } else {
          const qty = item.quantity || 1;
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: qty } },
          });
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          if (product) {
            logMovement({
              type: "quantity_updated",
              productId: item.productId,
              productName: product.name,
              details: `Quantite +${qty} — suppression facture ${invoice.number}`,
              meta: { invoiceId: invoice.id, invoiceNumber: invoice.number, quantityChange: qty },
              user: req.userId,
            });
          }
        }
      }
    }

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    res.json({ message: "Facture deplacee dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/invoices/:id/pdf — Generate PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const { generateInvoicePDF } = require("../lib/pdfGenerator");
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { items: { include: { product: true } }, client: true },
    });
    if (!invoice) return res.status(404).json({ error: "Facture introuvable" });

    // Get commerce settings for header
    const settings = await prisma.commerceSettings.findFirst({
      where: { tenantId: req.tenantId },
    });

    const pdfBuffer = await generateInvoicePDF(invoice, settings || {});

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${invoice.number}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
