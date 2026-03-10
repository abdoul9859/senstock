const PDFDocument = require("pdfkit");

/**
 * Generate a PDF invoice/quote and return as a Buffer.
 * @param {object} doc - The invoice/quote object with items, client, etc.
 * @param {object} settings - Commerce settings (businessName, logo, etc.)
 * @returns {Promise<Buffer>}
 */
function generateInvoicePDF(doc, settings = {}) {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      pdf.on("data", (chunk) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);

      const pageWidth = 595.28 - 80; // A4 width minus margins

      // ─── Header ───
      pdf.fontSize(20).font("Helvetica-Bold")
        .text(settings.businessName || "SenStock", 40, 40);

      if (settings.businessAddress) {
        pdf.fontSize(9).font("Helvetica")
          .text(settings.businessAddress, 40, 65);
      }
      if (settings.businessPhone) {
        pdf.text(`Tel: ${settings.businessPhone}`);
      }
      if (settings.businessEmail) {
        pdf.text(settings.businessEmail);
      }
      if (settings.businessNinea) {
        pdf.text(`NINEA: ${settings.businessNinea}`);
      }

      // ─── Document title ───
      const typeLabels = {
        facture: "FACTURE",
        proforma: "FACTURE PROFORMA",
        avoir: "AVOIR",
        devis: "DEVIS",
        vente_flash: "VENTE FLASH",
        echange: "ECHANGE",
      };
      const title = typeLabels[doc.type] || "FACTURE";

      pdf.fontSize(16).font("Helvetica-Bold")
        .text(title, 350, 40, { width: pageWidth - 310, align: "right" });

      pdf.fontSize(10).font("Helvetica")
        .text(`N°: ${doc.number}`, 350, 62, { width: pageWidth - 310, align: "right" });

      const dateStr = doc.date ? new Date(doc.date).toLocaleDateString("fr-FR") : "";
      pdf.text(`Date: ${dateStr}`, { width: pageWidth - 310, align: "right" });

      if (doc.dueDate) {
        const dueStr = new Date(doc.dueDate).toLocaleDateString("fr-FR");
        pdf.text(`Echeance: ${dueStr}`, { width: pageWidth - 310, align: "right" });
      }

      // ─── Client ───
      const clientY = 130;
      pdf.fontSize(10).font("Helvetica-Bold")
        .text("Client", 40, clientY);

      pdf.font("Helvetica").fontSize(10);
      if (doc.client?.name) pdf.text(doc.client.name, 40, clientY + 15);
      if (doc.client?.phone) pdf.text(`Tel: ${doc.client.phone}`);
      if (doc.client?.email) pdf.text(doc.client.email);
      if (doc.client?.address) pdf.text(doc.client.address);

      // ─── Items table ───
      let tableY = Math.max(pdf.y, clientY + 70) + 10;

      // Table header
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
          pdf.font("Helvetica-Bold")
            .text(item.description || "", cols[0] + 5, tableY + 3);
          pdf.font("Helvetica");
          tableY += 18;
          continue;
        }

        const desc = item.description || item.product?.name || "";
        pdf.text(desc, cols[0] + 5, tableY + 3, { width: 230 });
        pdf.text(String(item.quantity || 1), cols[1] + 5, tableY + 3, { width: 50, align: "center" });
        pdf.text(formatNum(item.unitPrice || 0), cols[2] + 5, tableY + 3, { width: 60, align: "right" });
        pdf.text(formatNum(item.total || 0), cols[3] + 5, tableY + 3, { width: 70, align: "right" });

        // Light border
        pdf.moveTo(40, tableY + 17).lineTo(40 + pageWidth, tableY + 17).stroke("#e0e0e0");
        tableY += 18;

        if (tableY > 720) {
          pdf.addPage();
          tableY = 40;
        }
      }

      // ─── Totals ───
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

      // ─── Notes ───
      if (doc.notes) {
        tableY += 40;
        pdf.font("Helvetica-Bold").fontSize(9).text("Notes:", 40, tableY);
        pdf.font("Helvetica").text(doc.notes, 40, tableY + 12, { width: pageWidth });
      }

      // ─── Footer ───
      pdf.fontSize(8).font("Helvetica").fillColor("#999")
        .text(
          `Document genere par SenStock — ${new Date().toLocaleDateString("fr-FR")}`,
          40, 780, { width: pageWidth, align: "center" }
        );

      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatNum(n) {
  return Number(n).toLocaleString("fr-FR");
}

module.exports = { generateInvoicePDF };
