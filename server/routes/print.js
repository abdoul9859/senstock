const express = require("express");
const nunjucks = require("nunjucks");
const path = require("path");
const prisma = require("../db");
const router = express.Router();

// Configure Nunjucks
const env = nunjucks.configure(path.join(__dirname, "../templates"), {
  autoescape: true,
  noCache: true,
});

// ── Custom filters ──
env.addFilter("format_date", (val) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
});

env.addFilter("format_cfa", (val) => {
  if (val == null) return "0";
  return Number(val).toLocaleString("fr-FR");
});

env.addFilter("format_number", (val) => {
  if (val == null) return "0";
  return Number(val).toLocaleString("fr-FR");
});

env.addFilter("int", (val) => parseInt(val) || 0);

env.addFilter("replace_regex", (str, pattern, replacement) => {
  if (!str) return "";
  try {
    return String(str).replace(new RegExp(pattern, "g"), replacement || "");
  } catch {
    return str;
  }
});

env.addFilter("format_phone_sn", (val) => {
  if (!val) return "";
  const clean = val.replace(/\D/g, "");
  if (clean.length === 9) return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`;
  return val;
});

// ── Get company settings for header/footer ──
async function getSettings(tenantId) {
  const commerce = await prisma.commerceSettings.findFirst({ where: { tenantId } });
  return {
    company_name: commerce?.businessName || "Votre Entreprise",
    logo: commerce?.businessLogo || "",
    phone: commerce?.businessPhone || "",
    email: commerce?.businessEmail || "",
    address: commerce?.businessAddress || "",
    ninea: commerce?.businessNinea || "",
    accent_color: commerce?.accentColor || "#D4AF37",
    default_notes: commerce?.defaultNotes || "",
    default_warranty_text: commerce?.defaultWarrantyText || "",
  };
}

// ════════════════════════════════════════════════
// GET /api/print/invoice/:id
// ════════════════════════════════════════════════
router.get("/invoice/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId, deleted: { not: true } },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        exchangeItems: { include: { label: true } },
        paymentHistory: { orderBy: { date: "asc" } },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    const settings = await getSettings(req.tenantId);

    // Resolve variant serial numbers for items
    const variantIds = invoice.items.filter((i) => i.variantId).map((i) => i.variantId);
    const variants = variantIds.length > 0
      ? await prisma.variant.findMany({ where: { id: { in: variantIds } }, select: { id: true, serialNumber: true } })
      : [];
    const variantMap = {};
    for (const v of variants) variantMap[v.id] = v.serialNumber;

    // Map items to template format
    const mappedItems = invoice.items.map((item) => ({
      is_section: item.type === "section",
      name: item.description || "",
      product_name: item.description || "",
      qty: item.quantity || 1,
      price: item.unitPrice || 0,
      total: item.total || 0,
      imeis: item.variantId && variantMap[item.variantId] ? [variantMap[item.variantId]] : [],
      is_gift: false,
      external_price: item.externalPrice || null,
    }));

    // Group items by section
    const grouped_items = [];
    let currentSection = null;
    for (const item of mappedItems) {
      if (item.is_section) {
        currentSection = { title: item.name, items: [], subtotal: 0 };
        grouped_items.push(currentSection);
      } else {
        if (!currentSection) {
          currentSection = { title: null, items: [], subtotal: 0 };
          grouped_items.push(currentSection);
        }
        currentSection.items.push(item);
        currentSection.subtotal += item.total || 0;
      }
    }

    // Map status
    const statusMap = { brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée", partielle: "Partiellement payée", en_retard: "En retard", annulee: "Annulée" };

    // Always use the standard invoice template (it includes warranty section)
    const template = "print_invoice.html";

    const html = nunjucks.render(template, {
      invoice: {
        ...invoice,
        invoice_number: invoice.number,
        invoice_type: invoice.type,
        status: statusMap[invoice.status] || invoice.status,
        date: invoice.date,
        due_date: invoice.dueDate,
        payment_method: invoice.paymentMethod,
        paid_amount: invoice.paymentAmount,
        remaining_amount: Math.max(0, (invoice.total || 0) - (invoice.paymentAmount || 0)),
        show_tax: invoice.showTax,
        tax_rate: invoice.taxRate,
        tax_amount: invoice.taxAmount,
        show_item_prices: invoice.showItemPrices,
        show_section_totals: invoice.showSectionTotals,
        exchange_discount: invoice.discountAmount,
        has_warranty: invoice.warrantyEnabled,
        warranty_duration: invoice.warrantyDuration,
        items: mappedItems,
      },
      grouped_items: mappedItems,
      show_prices: invoice.showItemPrices !== false,
      settings,
      payments: invoice.paymentHistory || [],
      warranty_certificate: invoice.warrantyEnabled ? {
        duration: invoice.warrantyDuration,
      } : null,
      signature_data_url: invoice.signature || "",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// GET /api/print/quotation/:id
// ════════════════════════════════════════════════
router.get("/quotation/:id", async (req, res) => {
  try {
    const quotation = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId, deleted: { not: true } },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!quotation) return res.status(404).json({ error: "Devis non trouve" });

    const settings = await getSettings(req.tenantId);
    const style = req.query.style === "gold" ? "print_quotation_old.html" : "print_quotation.html";

    // Map items to template format
    const mappedItems = quotation.items.map((item) => ({
      ...item,
      product_name: item.description || "",
      price: item.unitPrice || 0,
      qty: item.quantity || 1,
      is_section: item.type === "section",
    }));

    const html = nunjucks.render(style, {
      quotation: {
        ...quotation,
        quotation_number: quotation.number,
        expiry_date: quotation.validUntil,
        show_item_prices: quotation.showItemPrices !== false,
        show_section_totals: quotation.showSectionTotals,
        items: mappedItems,
      },
      settings,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// GET /api/print/maintenance/:id
// ════════════════════════════════════════════════
router.get("/maintenance/:id", async (req, res) => {
  try {
    const maintenance = await prisma.maintenanceTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!maintenance) return res.status(404).json({ error: "Fiche non trouvee" });

    const settings = await getSettings(req.tenantId);

    // Determine template based on query: ?type=label|ticket|client|full
    const typeMap = {
      label: "print_maintenance_label.html",
      ticket: "print_maintenance_ticket.html",
      client: "print_maintenance_client.html",
      full: "print_maintenance.html",
    };
    const template = typeMap[req.query.type] || "print_maintenance.html";

    const html = nunjucks.render(template, {
      maintenance: {
        maintenance_number: maintenance.number,
        reception_date: maintenance.receivedDate,
        estimated_completion_date: maintenance.estimatedReturnDate,
        pickup_deadline: maintenance.estimatedReturnDate,
        warranty_days: 30,
        client_name: maintenance.clientName,
        client_phone: maintenance.clientPhone,
        client_email: maintenance.clientEmail,
        device_type: maintenance.deviceName,
        device_brand: maintenance.deviceBrand,
        device_model: maintenance.deviceModel,
        device_serial: maintenance.serialNumber,
        device_description: "",
        device_accessories: maintenance.accessories,
        device_condition: maintenance.conditionAtReception,
        problem_description: maintenance.issueDescription,
        diagnosis: maintenance.diagnostic,
        work_done: maintenance.repairNotes,
        estimated_cost: maintenance.estimatedCost,
        final_cost: maintenance.finalCost,
        advance_paid: maintenance.amountPaid,
        status: maintenance.status,
        priority: maintenance.priority,
      },
      settings,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// GET /api/print/delivery-note/:id
// ════════════════════════════════════════════════
router.get("/delivery-note/:id", async (req, res) => {
  try {
    const note = await prisma.deliveryNote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        items: { include: { product: true } },
        client: true,
      },
    });
    if (!note) return res.status(404).json({ error: "Bon de livraison non trouve" });

    const settings = await getSettings(req.tenantId);

    const html = nunjucks.render("print_delivery_note.html", {
      note: {
        ...note,
        number: note.number,
        delivery_date: note.deliveryDate || note.createdAt,
        client_name: note.client?.name || note.recipientName || "",
        delivery_address: note.deliveryAddress || note.client?.address || "",
        delivery_contact: note.recipientName || note.client?.name || "",
        delivery_phone: note.recipientPhone || note.client?.phone || "",
        items: note.items.map((it) => ({
          product_name: it.description || it.product?.name || "",
          quantity: it.quantity,
          serials: [],
        })),
      },
      settings,
      signature_data_url: note.signature || "",
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════
// GET /api/print/warranty/:id (standalone certificate)
// ════════════════════════════════════════════════
router.get("/warranty/:id", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    const settings = await getSettings(req.tenantId);

    const html = nunjucks.render("warranty_certificate.html", {
      invoice: {
        invoice_number: invoice.number,
        date: invoice.date,
        client: invoice.client,
      },
      warranty_duration: invoice.warrantyDuration || "0",
      settings,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
