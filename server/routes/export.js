const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const { generateInvoicePDF } = require("../lib/pdfGenerator");

const router = express.Router();

// POST /api/export/invoices/pdf — Generate multi-invoice PDF
router.post("/invoices/pdf", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids est requis (tableau non vide)" });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: ids }, tenantId: req.tenantId },
      include: {
        items: { include: { product: true } },
        client: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (invoices.length === 0) {
      return res.status(404).json({ error: "Aucune facture trouvee" });
    }

    const settings = await prisma.commerceSettings.findFirst({
      where: { tenantId: req.tenantId },
    });

    const PDFDocument = require("pdfkit");
    const pdf = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));

    const pdfReady = new Promise((resolve, reject) => {
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
    });

    for (let i = 0; i < invoices.length; i++) {
      if (i > 0) pdf.addPage();
      renderInvoicePage(pdf, invoices[i], settings || {});
    }

    pdf.end();
    const pdfBuffer = await pdfReady;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="factures-export.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Export invoices PDF error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la generation du PDF" });
  }
});

/**
 * Render a single invoice page onto the given PDFDocument.
 */
function renderInvoicePage(pdf, doc, settings) {
  const pageWidth = 595.28 - 80;
  const formatNum = (n) => Number(n).toLocaleString("fr-FR");

  // Header
  pdf.fontSize(20).font("Helvetica-Bold")
    .text(settings.businessName || "StockFlow", 40, 40);

  if (settings.businessAddress) {
    pdf.fontSize(9).font("Helvetica").text(settings.businessAddress, 40, 65);
  }
  if (settings.businessPhone) pdf.text(`Tel: ${settings.businessPhone}`);
  if (settings.businessEmail) pdf.text(settings.businessEmail);

  // Title
  const typeLabels = {
    facture: "FACTURE", proforma: "FACTURE PROFORMA", avoir: "AVOIR",
    devis: "DEVIS", vente_flash: "VENTE FLASH", echange: "ECHANGE",
  };
  const title = typeLabels[doc.type] || "FACTURE";
  pdf.fontSize(16).font("Helvetica-Bold")
    .text(title, 350, 40, { width: pageWidth - 310, align: "right" });
  pdf.fontSize(10).font("Helvetica")
    .text(`N: ${doc.number}`, 350, 62, { width: pageWidth - 310, align: "right" });

  const dateStr = doc.date ? new Date(doc.date).toLocaleDateString("fr-FR") : "";
  pdf.text(`Date: ${dateStr}`, { width: pageWidth - 310, align: "right" });

  // Client
  const clientY = 130;
  pdf.fontSize(10).font("Helvetica-Bold").text("Client", 40, clientY);
  pdf.font("Helvetica").fontSize(10);
  if (doc.client?.name) pdf.text(doc.client.name, 40, clientY + 15);
  if (doc.client?.phone) pdf.text(`Tel: ${doc.client.phone}`);

  // Items
  let tableY = Math.max(pdf.y, clientY + 70) + 10;
  const cols = [40, 280, 340, 410, 480];
  pdf.rect(40, tableY, pageWidth, 20).fill("#f0f0f0");
  pdf.fill("#000").fontSize(9).font("Helvetica-Bold");
  pdf.text("Description", cols[0] + 5, tableY + 5);
  pdf.text("Qte", cols[1] + 5, tableY + 5, { width: 50, align: "center" });
  pdf.text("Prix unit.", cols[2] + 5, tableY + 5, { width: 60, align: "right" });
  pdf.text("Total", cols[3] + 5, tableY + 5, { width: 70, align: "right" });

  tableY += 22;
  pdf.font("Helvetica").fontSize(9);

  const items = doc.items || [];
  for (const item of items) {
    if (item.type === "section") {
      pdf.font("Helvetica-Bold").text(item.description || "", cols[0] + 5, tableY + 3);
      pdf.font("Helvetica");
      tableY += 18;
      continue;
    }
    const desc = item.description || item.product?.name || "";
    pdf.text(desc, cols[0] + 5, tableY + 3, { width: 230 });
    pdf.text(String(item.quantity || 1), cols[1] + 5, tableY + 3, { width: 50, align: "center" });
    pdf.text(formatNum(item.unitPrice || 0), cols[2] + 5, tableY + 3, { width: 60, align: "right" });
    pdf.text(formatNum(item.total || 0), cols[3] + 5, tableY + 3, { width: 70, align: "right" });
    pdf.moveTo(40, tableY + 17).lineTo(40 + pageWidth, tableY + 17).stroke("#e0e0e0");
    tableY += 18;

    if (tableY > 720) {
      pdf.addPage();
      tableY = 40;
    }
  }

  // Totals
  tableY += 10;
  const totalsX = 350;
  pdf.fontSize(10).font("Helvetica");
  pdf.text("Sous-total:", totalsX, tableY, { width: 80, align: "right" });
  pdf.text(formatNum(doc.subtotal || 0) + " F", totalsX + 90, tableY, { width: 80, align: "right" });

  if (doc.showTax && doc.taxRate > 0) {
    tableY += 18;
    pdf.text(`TVA (${doc.taxRate}%):`, totalsX, tableY, { width: 80, align: "right" });
    pdf.text(formatNum(doc.taxAmount || 0) + " F", totalsX + 90, tableY, { width: 80, align: "right" });
  }

  tableY += 22;
  pdf.font("Helvetica-Bold").fontSize(12);
  pdf.text("TOTAL:", totalsX, tableY, { width: 80, align: "right" });
  pdf.text(formatNum(doc.total || 0) + " F", totalsX + 90, tableY, { width: 80, align: "right" });

  // Footer
  pdf.fontSize(8).font("Helvetica").fillColor("#999")
    .text(`Document genere par StockFlow`, 40, 780, { width: pageWidth, align: "center" });
  pdf.fillColor("#000");
}

// GET /api/export/products/csv — Export products to CSV
router.get("/products/csv", async (req, res) => {
  try {
    const where = {
      tenantId: req.tenantId,
      deleted: false,
    };
    if (req.query.category) where.categoryId = req.query.category;
    if (req.query.archived !== undefined) where.archived = req.query.archived === "true";

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    const header = "name,brand,model,barcode,category,purchasePrice,sellingPrice,quantity";
    const rows = products.map((p) => {
      return [
        escapeCsv(p.name),
        escapeCsv(p.brand),
        escapeCsv(p.model),
        escapeCsv(p.barcode),
        escapeCsv(p.category?.name || ""),
        p.purchasePrice ?? "",
        p.sellingPrice ?? "",
        p.quantity,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="produits-export.csv"`);
    res.send("\uFEFF" + csv); // BOM for Excel compat
  } catch (err) {
    logger.error("Export products CSV error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'export CSV" });
  }
});

// GET /api/export/invoices/csv — Export invoices to CSV
router.get("/invoices/csv", async (req, res) => {
  try {
    const where = {
      tenantId: req.tenantId,
      deleted: { not: true },
    };
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.dateFrom || req.query.dateTo) {
      where.date = {};
      if (req.query.dateFrom) where.date.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.date.lte = new Date(req.query.dateTo);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const header = "number,type,status,client,date,subtotal,tax,total,paymentMethod";
    const rows = invoices.map((inv) => {
      return [
        escapeCsv(inv.number),
        escapeCsv(inv.type),
        escapeCsv(inv.status),
        escapeCsv(inv.client?.name || ""),
        inv.date ? new Date(inv.date).toISOString().split("T")[0] : "",
        inv.subtotal ?? "",
        inv.taxAmount ?? "",
        inv.total ?? "",
        escapeCsv(inv.paymentMethod),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="factures-export.csv"`);
    res.send("\uFEFF" + csv);
  } catch (err) {
    logger.error("Export invoices CSV error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'export CSV" });
  }
});

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = router;
