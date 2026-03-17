const express = require("express");
const prisma = require("../db");
const wa = require("../lib/whatsapp");
const router = express.Router();

// ─── GET /api/whatsapp/status ───
router.get("/status", async (req, res) => {
  try {
    const status = wa.getStatus(req.tenantId);
    res.json({ enabled: true, ...status });
  } catch (err) {
    res.json({ enabled: false, connected: false, error: err.message });
  }
});

// ─── POST /api/whatsapp/connect ───
router.post("/connect", async (req, res) => {
  try {
    const result = await wa.connect(req.tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/whatsapp/qr — Poll for QR code ───
router.get("/qr", (req, res) => {
  const status = wa.getStatus(req.tenantId);
  res.json({ qr: status.qr, status: status.status });
});

// ─── POST /api/whatsapp/disconnect ───
router.post("/disconnect", async (req, res) => {
  try {
    await wa.disconnect(req.tenantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-invoice/:id ───
router.post("/send-invoice/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true, items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!invoice) return res.status(404).json({ error: "Facture introuvable" });
    if (!invoice.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.companySettings.findFirst({ where: { tenantId: req.tenantId } });
    const companyName = settings?.companyName || "SenStock";

    const caption = `Bonjour ${invoice.client.name},\n\nVeuillez trouver ci-joint votre facture *${invoice.number}* d'un montant de *${Number(invoice.total).toLocaleString("fr-FR")} F CFA*.\n\nCordialement,\n${companyName}`;

    // For now, send as text message (PDF integration later)
    await wa.sendText(req.tenantId, invoice.client.phone, caption);

    await wa.logMessage({
      tenantId: req.tenantId,
      recipientPhone: invoice.client.phone,
      recipientName: invoice.client.name,
      type: "text",
      documentType: "invoice",
      documentId: invoice.id,
      documentNumber: invoice.number,
      message: caption,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Facture envoyee par WhatsApp" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-quote/:id ───
router.post("/send-quote/:id", async (req, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true },
    });
    if (!quote) return res.status(404).json({ error: "Devis introuvable" });
    if (!quote.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.companySettings.findFirst({ where: { tenantId: req.tenantId } });
    const companyName = settings?.companyName || "SenStock";

    const caption = `Bonjour ${quote.client.name},\n\nVeuillez trouver ci-joint votre devis *${quote.number}* d'un montant de *${Number(quote.total).toLocaleString("fr-FR")} F CFA*.\n\nValable jusqu'au ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("fr-FR") : "N/A"}.\n\nCordialement,\n${companyName}`;

    await wa.sendText(req.tenantId, quote.client.phone, caption);

    await wa.logMessage({
      tenantId: req.tenantId,
      recipientPhone: quote.client.phone,
      recipientName: quote.client.name,
      type: "text",
      documentType: "quote",
      documentId: quote.id,
      documentNumber: quote.number,
      message: caption,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Devis envoye par WhatsApp" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp/send-debt-reminder/:id ───
router.post("/send-debt-reminder/:id", async (req, res) => {
  try {
    const creance = await prisma.creance.findFirst({
      where: { id: req.params.id },
      include: { client: true, invoice: true },
    });
    if (!creance) return res.status(404).json({ error: "Creance introuvable" });
    if (!creance.client?.phone) return res.status(400).json({ error: "Le client n'a pas de numero de telephone" });

    const settings = await prisma.companySettings.findFirst({ where: { tenantId: req.tenantId } });
    const companyName = settings?.companyName || "SenStock";

    const message = `Bonjour ${creance.client.name},\n\nNous vous rappelons qu'un montant de *${Number(creance.amount).toLocaleString("fr-FR")} F CFA* est en attente de paiement${creance.dueDate ? ` (echeance: ${new Date(creance.dueDate).toLocaleDateString("fr-FR")})` : ""}.\n\nMerci de proceder au reglement dans les meilleurs delais.\n\nCordialement,\n${companyName}`;

    await wa.sendText(req.tenantId, creance.client.phone, message);

    await wa.logMessage({
      tenantId: req.tenantId,
      recipientPhone: creance.client.phone,
      recipientName: creance.client.name,
      type: "text",
      documentType: "debt_reminder",
      documentId: creance.id,
      message,
      status: "sent",
      sentBy: req.user?.name || "",
    });

    res.json({ success: true, message: "Relance envoyee par WhatsApp" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/whatsapp/messages ───
router.get("/messages", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({ where: { tenantId: req.tenantId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.whatsAppMessage.count({ where: { tenantId: req.tenantId } }),
    ]);
    res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
