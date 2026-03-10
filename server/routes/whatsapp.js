const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const { getWhatsAppConfig, sendText, sendDocument, getConnectionStatus, connectInstance, disconnectInstance, logMessage } = require("../lib/whatsapp");
const { invoiceSent, quoteSent, deliveryNotification, debtReminder } = require("../lib/whatsappTemplates");
const { generateInvoicePDF } = require("../lib/pdfGenerator");

const router = express.Router();

// ─── GET /api/whatsapp/status ───
router.get("/status", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.json({ enabled: false, connected: false });

    const status = await getConnectionStatus(config);

    // Sync connected state to DB
    if (status.connected !== config.connected) {
      await prisma.companySettings.updateMany({
        where: { tenantId: req.tenantId },
        data: { whatsappConnected: status.connected },
      });
    }

    res.json({ enabled: true, ...status });
  } catch (err) {
    logger.error("WhatsApp status error:", err);
    res.json({ enabled: false, connected: false, error: err.message });
  }
});

// ─── POST /api/whatsapp/connect ───
router.post("/connect", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    const result = await connectInstance(config);
    res.json(result);
  } catch (err) {
    logger.error("WhatsApp connect error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/disconnect ───
router.post("/disconnect", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    await disconnectInstance(config);
    await prisma.companySettings.updateMany({
      where: { tenantId: req.tenantId },
      data: { whatsappConnected: false },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("WhatsApp disconnect error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-invoice/:id ───
router.post("/send-invoice/:id", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true, items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!invoice) return res.status(404).json({ error: "Facture introuvable" });
    if (!invoice.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.commerceSettings.findUnique({ where: { tenantId: req.tenantId } });
    const companyName = settings?.businessName || "StockFlow";

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, settings || {});
    const caption = invoiceSent({
      clientName: invoice.client.name,
      number: invoice.number,
      total: invoice.total,
      dueDate: invoice.dueDate,
      companyName,
    });

    // Send PDF + text
    await sendDocument(config, invoice.client.phone, pdfBuffer, `Facture_${invoice.number}.pdf`, caption);

    await logMessage({
      tenantId: req.tenantId,
      recipientPhone: invoice.client.phone,
      recipientName: invoice.client.name,
      type: "document",
      documentType: "invoice",
      documentId: invoice.id,
      documentNumber: invoice.number,
      message: caption,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Facture envoyee par WhatsApp" });
  } catch (err) {
    logger.error("WhatsApp send invoice error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-quote/:id ───
router.post("/send-quote/:id", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true, items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!quote) return res.status(404).json({ error: "Devis introuvable" });
    if (!quote.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.commerceSettings.findUnique({ where: { tenantId: req.tenantId } });
    const companyName = settings?.businessName || "StockFlow";

    // Generate PDF (reuse invoice PDF generator with type=devis)
    const pdfBuffer = await generateInvoicePDF({ ...quote, type: "devis" }, settings || {});
    const caption = quoteSent({
      clientName: quote.client.name,
      number: quote.number,
      total: quote.total,
      validUntil: quote.validUntil,
      companyName,
    });

    await sendDocument(config, quote.client.phone, pdfBuffer, `Devis_${quote.number}.pdf`, caption);

    await logMessage({
      tenantId: req.tenantId,
      recipientPhone: quote.client.phone,
      recipientName: quote.client.name,
      type: "document",
      documentType: "quote",
      documentId: quote.id,
      documentNumber: quote.number,
      message: caption,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Devis envoye par WhatsApp" });
  } catch (err) {
    logger.error("WhatsApp send quote error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-delivery-note/:id ───
router.post("/send-delivery-note/:id", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    const note = await prisma.deliveryNote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true },
    });
    if (!note) return res.status(404).json({ error: "Bon de livraison introuvable" });
    if (!note.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.commerceSettings.findUnique({ where: { tenantId: req.tenantId } });
    const companyName = settings?.businessName || "StockFlow";

    const message = deliveryNotification({
      clientName: note.client.name,
      number: note.number,
      deliveryDate: note.deliveryDate,
      companyName,
    });

    await sendText(config, note.client.phone, message);

    await logMessage({
      tenantId: req.tenantId,
      recipientPhone: note.client.phone,
      recipientName: note.client.name,
      type: "text",
      documentType: "delivery_note",
      documentId: note.id,
      documentNumber: note.number,
      message,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Notification de livraison envoyee" });
  } catch (err) {
    logger.error("WhatsApp send delivery note error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-debt-reminder/:id ───
router.post("/send-debt-reminder/:id", async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.tenantId);
    if (!config) return res.status(400).json({ error: "WhatsApp non configure" });

    const creance = await prisma.creance.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true },
    });
    if (!creance) return res.status(404).json({ error: "Creance introuvable" });
    if (!creance.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.commerceSettings.findUnique({ where: { tenantId: req.tenantId } });
    const companyName = settings?.businessName || "StockFlow";

    const remaining = creance.amount - creance.amountPaid;
    const message = debtReminder({
      clientName: creance.client.name,
      number: creance.invoiceNumber || creance.number,
      amount: remaining,
      dueDate: creance.dueDate,
      companyName,
    });

    await sendText(config, creance.client.phone, message);

    await logMessage({
      tenantId: req.tenantId,
      recipientPhone: creance.client.phone,
      recipientName: creance.client.name,
      type: "text",
      documentType: "debt_reminder",
      documentId: creance.id,
      documentNumber: creance.number,
      message,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Relance envoyee par WhatsApp" });
  } catch (err) {
    logger.error("WhatsApp send debt reminder error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/whatsapp/messages ───
router.get("/messages", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.whatsAppMessage.count({ where: { tenantId: req.tenantId } }),
    ]);

    res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error("WhatsApp messages error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
