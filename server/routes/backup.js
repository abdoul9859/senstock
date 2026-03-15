const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const prisma = require("../db");
const logger = require("../lib/logger");

const router = express.Router();

// Multer for JSON file uploads (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.toLowerCase().endsWith(".json");
    const mime = file.mimetype === "application/json" || file.mimetype === "application/octet-stream";
    cb(null, ext || mime);
  },
});

// ════════════════════════════════════════════════════════════════
// POST /api/backup/export — Export tenant data as JSON download
// ════════════════════════════════════════════════════════════════
router.post("/export", async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Query all tenant data in parallel
    const [categories, suppliers, clients, products, invoices, quotes] = await Promise.all([
      // Categories with attributes
      prisma.category.findMany({
        where: { tenantId, deleted: false },
        include: { attributes: { orderBy: { sortOrder: "asc" } } },
      }),
      // Suppliers
      prisma.supplier.findMany({
        where: { tenantId, deleted: false },
      }),
      // Clients
      prisma.client.findMany({
        where: { tenantId, deleted: false },
      }),
      // Products with variants
      prisma.product.findMany({
        where: { tenantId, deleted: false },
        include: {
          variants: true,
        },
      }),
      // Invoices with items, exchange items, payment history
      prisma.invoice.findMany({
        where: { tenantId, deleted: false },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          exchangeItems: true,
          paymentHistory: { orderBy: { date: "asc" } },
        },
      }),
      // Quotes with items
      prisma.quote.findMany({
        where: { tenantId, deleted: false },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    const exportData = {
      version: "senstock-v1",
      exportedAt: new Date().toISOString(),
      tenantId,
      data: {
        categories,
        suppliers,
        clients,
        products,
        invoices,
        quotes,
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `senstock_backup_${date}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(json);

    logger.info("Backup exported", {
      tenantId,
      categories: categories.length,
      suppliers: suppliers.length,
      clients: clients.length,
      products: products.length,
      invoices: invoices.length,
      quotes: quotes.length,
    });
  } catch (err) {
    logger.error("Backup export error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'export: " + err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/backup/import — Import data from SenStock JSON file
// ════════════════════════════════════════════════════════════════
router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Fichier JSON manquant" });
  }

  try {
    const raw = req.file.buffer.toString("utf-8");
    const backup = JSON.parse(raw);

    // Validate version
    if (!backup.version || backup.version !== "senstock-v1") {
      return res.status(400).json({
        error: `Version non supportée: ${backup.version || "inconnue"}. Attendu: senstock-v1`,
      });
    }

    if (!backup.data) {
      return res.status(400).json({ error: "Données manquantes dans le fichier" });
    }

    const tenantId = req.tenantId;
    const userId = req.user.id;
    const data = backup.data;

    // ID mapping: old UUID → new UUID
    const idMap = {
      categories: {},
      suppliers: {},
      clients: {},
      products: {},
      variants: {},
      invoices: {},
      quotes: {},
    };

    const stats = {
      categories: 0,
      suppliers: 0,
      clients: 0,
      products: 0,
      variants: 0,
      invoices: 0,
      invoiceItems: 0,
      exchangeItems: 0,
      quotes: 0,
      quoteItems: 0,
      errors: [],
    };

    // ─── 1. Import Categories ───
    for (const cat of data.categories || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.categories[cat.id] = newId;

        const attributes = (cat.attributes || []).map((attr, idx) => ({
          name: attr.name,
          type: attr.type || "text",
          options: attr.options || [],
          required: attr.required || false,
          sortOrder: attr.sortOrder ?? idx,
        }));

        await prisma.category.create({
          data: {
            id: newId,
            name: cat.name,
            description: cat.description || "",
            hasVariants: cat.hasVariants || false,
            tenantId,
            createdBy: userId,
            createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
            attributes: attributes.length > 0 ? { create: attributes } : undefined,
          },
        });
        stats.categories++;
      } catch (e) {
        stats.errors.push(`Category "${cat.name}": ${e.message}`);
      }
    }

    // ─── 2. Import Suppliers ───
    for (const sup of data.suppliers || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.suppliers[sup.id] = newId;

        await prisma.supplier.create({
          data: {
            id: newId,
            name: sup.name || "Sans nom",
            phone: sup.phone || "",
            email: sup.email || "",
            address: sup.address || "",
            notes: sup.notes || "",
            rating: sup.rating || 0,
            ratingCount: sup.ratingCount || 0,
            tenantId,
            createdBy: userId,
            createdAt: sup.createdAt ? new Date(sup.createdAt) : new Date(),
          },
        });
        stats.suppliers++;
      } catch (e) {
        stats.errors.push(`Supplier "${sup.name}": ${e.message}`);
      }
    }

    // ─── 3. Import Clients ───
    for (const client of data.clients || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.clients[client.id] = newId;

        await prisma.client.create({
          data: {
            id: newId,
            name: client.name || "Sans nom",
            phone: client.phone || "",
            email: client.email || "",
            address: client.address || "",
            notes: client.notes || "",
            tenantId,
            createdBy: userId,
            createdAt: client.createdAt ? new Date(client.createdAt) : new Date(),
          },
        });
        stats.clients++;
      } catch (e) {
        stats.errors.push(`Client "${client.name}": ${e.message}`);
      }
    }

    // ─── 4. Import Products with Variants ───
    for (const prod of data.products || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.products[prod.id] = newId;

        const categoryId = prod.categoryId ? idMap.categories[prod.categoryId] : undefined;
        const supplierId = prod.supplierId ? idMap.suppliers[prod.supplierId] : undefined;

        const variants = (prod.variants || []).map((v) => {
          const newVariantId = crypto.randomUUID();
          idMap.variants[v.id] = newVariantId;
          return {
            id: newVariantId,
            serialNumber: v.serialNumber || "",
            barcode: v.barcode || "",
            condition: v.condition || "neuf",
            sold: v.sold || false,
            price: v.price ?? null,
            attributes: v.attributes || {},
            createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
          };
        });

        await prisma.product.create({
          data: {
            id: newId,
            name: prod.name || "Sans nom",
            description: prod.description || "",
            brand: prod.brand || "",
            model: prod.model || "",
            barcode: prod.barcode || "",
            image: prod.image || "",
            purchasePrice: prod.purchasePrice ?? null,
            costPrice: prod.costPrice ?? null,
            sellingPrice: prod.sellingPrice ?? null,
            quantity: prod.quantity || 0,
            attributes: prod.attributes || {},
            notes: prod.notes || "",
            archived: prod.archived || false,
            published: false,
            categoryId: categoryId || undefined,
            supplierId: supplierId || undefined,
            tenantId,
            createdBy: userId,
            createdAt: prod.createdAt ? new Date(prod.createdAt) : new Date(),
            variants: variants.length > 0 ? { create: variants } : undefined,
          },
        });
        stats.products++;
        stats.variants += variants.length;
      } catch (e) {
        stats.errors.push(`Product "${prod.name}": ${e.message}`);
      }
    }

    // ─── 5. Import Invoices with Items, Exchange Items, Payment History ───
    for (const inv of data.invoices || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.invoices[inv.id] = newId;

        // Generate a new unique invoice number to avoid conflicts
        const newNumber = `IMP-${inv.number || crypto.randomUUID().slice(0, 8)}`;
        const clientId = inv.clientId ? idMap.clients[inv.clientId] : undefined;

        const items = (inv.items || []).map((item, idx) => ({
          type: item.type || "product",
          productId: item.productId ? idMap.products[item.productId] : undefined,
          variantId: item.variantId ? idMap.variants[item.variantId] : undefined,
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          externalPrice: item.externalPrice ?? null,
          purchasePrice: item.purchasePrice || 0,
          discountAmount: item.discountAmount || 0,
          discountReason: item.discountReason || "",
          total: item.total || 0,
          sortOrder: item.sortOrder ?? idx,
        }));

        const exchangeItems = (inv.exchangeItems || []).map((ex) => ({
          description: ex.description || "",
          productId: ex.productId ? idMap.products[ex.productId] : undefined,
          variantId: ex.variantId ? idMap.variants[ex.variantId] : undefined,
          variantLabel: ex.variantLabel || "",
          price: ex.price || 0,
          quantity: ex.quantity || 1,
          notes: ex.notes || "",
          addToStock: ex.addToStock || false,
          disposition: ex.disposition || null,
        }));

        const paymentHistory = (inv.paymentHistory || []).map((p) => ({
          amount: p.amount || 0,
          method: p.method || "especes",
          date: p.date ? new Date(p.date) : new Date(),
          note: p.note || "",
        }));

        await prisma.invoice.create({
          data: {
            id: newId,
            number: newNumber,
            type: inv.type || "facture",
            status: inv.status || "brouillon",
            clientId: clientId || undefined,
            date: inv.date ? new Date(inv.date) : new Date(),
            dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
            subtotal: inv.subtotal || 0,
            discountAmount: inv.discountAmount || 0,
            discountReason: inv.discountReason || "",
            showTax: inv.showTax || false,
            taxRate: inv.taxRate || 18,
            taxAmount: inv.taxAmount || 0,
            total: inv.total || 0,
            showItemPrices: inv.showItemPrices !== false,
            showSectionTotals: inv.showSectionTotals || false,
            paymentEnabled: inv.paymentEnabled || false,
            paymentAmount: inv.paymentAmount || 0,
            paymentMethod: inv.paymentMethod || "especes",
            warrantyEnabled: inv.warrantyEnabled || false,
            warrantyDuration: inv.warrantyDuration || "",
            warrantyDescription: inv.warrantyDescription || "",
            notes: inv.notes || "",
            signature: inv.signature || "",
            lastEditedOn: "web",
            tenantId,
            createdBy: userId,
            createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
            items: items.length > 0 ? { create: items } : undefined,
            exchangeItems: exchangeItems.length > 0 ? { create: exchangeItems } : undefined,
            paymentHistory: paymentHistory.length > 0 ? { create: paymentHistory } : undefined,
          },
        });

        stats.invoices++;
        stats.invoiceItems += items.length;
        stats.exchangeItems += exchangeItems.length;
      } catch (e) {
        stats.errors.push(`Invoice "${inv.number}": ${e.message}`);
      }
    }

    // ─── 6. Import Quotes with Items ───
    for (const q of data.quotes || []) {
      try {
        const newId = crypto.randomUUID();
        idMap.quotes[q.id] = newId;

        const newNumber = `IMP-${q.number || crypto.randomUUID().slice(0, 8)}`;
        const clientId = q.clientId ? idMap.clients[q.clientId] : undefined;

        const items = (q.items || []).map((item, idx) => ({
          type: item.type || "product",
          productId: item.productId ? idMap.products[item.productId] : undefined,
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: item.total || 0,
          sortOrder: item.sortOrder ?? idx,
        }));

        await prisma.quote.create({
          data: {
            id: newId,
            number: newNumber,
            status: q.status || "brouillon",
            clientId: clientId || undefined,
            date: q.date ? new Date(q.date) : new Date(),
            validUntil: q.validUntil ? new Date(q.validUntil) : undefined,
            subtotal: q.subtotal || 0,
            showTax: q.showTax || false,
            taxRate: q.taxRate || 18,
            taxAmount: q.taxAmount || 0,
            total: q.total || 0,
            showItemPrices: q.showItemPrices !== false,
            showSectionTotals: q.showSectionTotals || false,
            notes: q.notes || "",
            signature: q.signature || "",
            tenantId,
            createdBy: userId,
            createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
            items: items.length > 0 ? { create: items } : undefined,
          },
        });

        stats.quotes++;
        stats.quoteItems += items.length;
      } catch (e) {
        stats.errors.push(`Quote "${q.number}": ${e.message}`);
      }
    }

    logger.info("Backup imported", { tenantId, stats });

    res.json({
      message: "Import terminé",
      stats: {
        categories: stats.categories,
        suppliers: stats.suppliers,
        clients: stats.clients,
        products: stats.products,
        variants: stats.variants,
        invoices: stats.invoices,
        invoiceItems: stats.invoiceItems,
        exchangeItems: stats.exchangeItems,
        quotes: stats.quotes,
        quoteItems: stats.quoteItems,
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    });
  } catch (err) {
    logger.error("Backup import error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'import: " + err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/backup/import-legacy — Import from old app (.dump file)
// ════════════════════════════════════════════════════════════════
const uploadDump = multer({
  storage: multer.diskStorage({
    destination: "/tmp",
    filename: (_req, _file, cb) => cb(null, `legacy_import_${Date.now()}.dump`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.post("/import-legacy", uploadDump.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Fichier .dump manquant" });
  }

  const { execSync } = require("child_process");
  const fs = require("fs");
  const { Client } = require("pg");
  const dumpPath = req.file.path;
  const tempDb = `legacy_import_${Date.now()}`;
  const tenantId = req.tenantId;
  const userId = req.userId;

  try {
    // 1. Create temp database
    const adminClient = new Client({ connectionString: process.env.DATABASE_URL });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${tempDb}"`);
    await adminClient.end();

    // 2. Restore dump into temp database
    const baseUrl = process.env.DATABASE_URL.replace(/\/[^/]+$/, `/${tempDb}`);
    execSync(`pg_restore -U senstock -d ${tempDb} --no-owner --no-privileges ${dumpPath}`, {
      env: { ...process.env, PGPASSWORD: "senstock_pass" },
      timeout: 60000,
    });

    // 3. Connect to temp DB and import
    const oldDb = new Client({ connectionString: baseUrl });
    await oldDb.connect();

    const idMap = { categories: {}, suppliers: {}, clients: {}, products: {}, variants: {} };
    const stats = { categories: 0, suppliers: 0, clients: 0, products: 0, variants: 0, invoices: 0, invoiceItems: 0, exchangeItems: 0, quotations: 0, errors: [] };

    // Categories
    const { rows: cats } = await oldDb.query("SELECT * FROM categories ORDER BY category_id");
    const catNameMap = {};
    for (const row of cats) {
      catNameMap[row.name] = row.category_id;
      try {
        const { rows: attrs } = await oldDb.query("SELECT * FROM category_attributes WHERE category_id = $1", [row.category_id]);
        const attributes = [];
        for (const attr of attrs) {
          const { rows: vals } = await oldDb.query("SELECT value FROM category_attribute_values WHERE attribute_id = $1", [attr.attribute_id]);
          attributes.push({ name: attr.name, type: attr.type === "select" ? "select" : attr.type === "number" ? "number" : "text", options: vals.map(v => v.value), required: attr.required || false, sortOrder: 0 });
        }
        const cat = await prisma.category.create({ data: { name: row.name, description: row.description || "", hasVariants: row.requires_variants || false, tenantId, attributes: attributes.length > 0 ? { create: attributes } : undefined } });
        idMap.categories[row.category_id] = cat.id;
        stats.categories++;
      } catch (e) { stats.errors.push(`Cat ${row.name}: ${e.message.substring(0, 100)}`); }
    }

    // Suppliers
    const { rows: sups } = await oldDb.query("SELECT * FROM suppliers ORDER BY supplier_id");
    for (const row of sups) {
      try {
        const s = await prisma.supplier.create({ data: { name: row.name || "Sans nom", phone: row.phone || "", email: row.email || "", address: row.address || "", tenantId } });
        idMap.suppliers[row.supplier_id] = s.id;
        stats.suppliers++;
      } catch (e) { stats.errors.push(`Sup ${row.name}: ${e.message.substring(0, 100)}`); }
    }

    // Clients
    const { rows: clis } = await oldDb.query("SELECT * FROM clients ORDER BY client_id");
    for (const row of clis) {
      try {
        const c = await prisma.client.create({ data: { name: row.name || "Sans nom", phone: row.phone || "", email: row.email || "", address: [row.address, row.city].filter(Boolean).join(", "), tenantId } });
        idMap.clients[row.client_id] = c.id;
        stats.clients++;
      } catch (e) { stats.errors.push(`Cli ${row.name}: ${e.message.substring(0, 100)}`); }
    }

    // Products + variants
    const { rows: prods } = await oldDb.query("SELECT * FROM products ORDER BY product_id");
    for (const row of prods) {
      try {
        let categoryId = null;
        if (row.category) { const oldCatId = catNameMap[row.category]; if (oldCatId && idMap.categories[oldCatId]) categoryId = idMap.categories[oldCatId]; }
        const { rows: vars } = await oldDb.query("SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variant_id", [row.product_id]);
        const p = await prisma.product.create({
          data: {
            name: row.name || "Sans nom", description: row.description || "", brand: row.brand || "", model: row.model || "",
            barcode: row.barcode || "", image: row.image_path || "",
            purchasePrice: parseFloat(row.purchase_price) || 0, sellingPrice: parseFloat(row.price) || 0,
            quantity: row.has_unique_serial ? vars.filter(v => !v.is_sold).length : (parseInt(row.quantity) || 0),
            notes: row.notes || "", archived: row.is_archived || false,
            categoryId: categoryId || undefined, supplierId: row.supplier_id ? idMap.suppliers[row.supplier_id] : undefined,
            tenantId, createdBy: userId, createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            variants: { create: vars.map(v => ({ serialNumber: v.imei_serial || "", barcode: v.barcode || "", condition: (v.condition || "neuf").toLowerCase(), sold: v.is_sold || false, price: v.price ? parseFloat(v.price) : undefined })) },
          },
          include: { variants: true },
        });
        idMap.products[row.product_id] = p.id;
        for (let i = 0; i < vars.length; i++) { if (p.variants[i]) idMap.variants[vars[i].variant_id] = p.variants[i].id; }
        stats.products++; stats.variants += vars.length;
      } catch (e) { stats.errors.push(`Prod ${row.name}: ${e.message.substring(0, 100)}`); }
    }

    // Invoices
    const { rows: invs } = await oldDb.query("SELECT * FROM invoices ORDER BY invoice_id");
    for (const row of invs) {
      try {
        let type = "facture"; if (row.invoice_type === "exchange") type = "echange";
        let status = "brouillon"; if (row.status === "payée") status = "payee"; else if (row.status === "en attente") status = "envoyee"; else if (row.status === "partiellement payée") status = "partielle";
        const clientId = row.client_id ? idMap.clients[row.client_id] : undefined;
        const { rows: items } = await oldDb.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [row.invoice_id]);
        const { rows: exItems } = await oldDb.query("SELECT * FROM invoice_exchange_items WHERE invoice_id = $1", [row.invoice_id]);
        const { rows: payments } = await oldDb.query("SELECT * FROM invoice_payments WHERE invoice_id = $1", [row.invoice_id]);
        const invData = {
          number: row.invoice_number, type, status,
          date: row.date ? new Date(row.date) : new Date(),
          subtotal: parseFloat(row.subtotal) || 0, discountAmount: parseFloat(row.exchange_discount) || 0,
          showTax: row.show_tax || false, taxRate: parseFloat(row.tax_rate) || 0, taxAmount: parseFloat(row.tax_amount) || 0, total: parseFloat(row.total) || 0,
          showItemPrices: row.show_item_prices !== false, showSectionTotals: row.show_section_totals || false,
          paymentEnabled: parseFloat(row.paid_amount) > 0, paymentAmount: parseFloat(row.paid_amount) || 0, paymentMethod: row.payment_method || "",
          warrantyEnabled: row.has_warranty || false, warrantyDuration: row.warranty_duration ? String(row.warranty_duration) : "",
          notes: (row.notes || "").replace(/\n?\n?__(SERIALS|SIGNATURE|QUOTE_QTYS)__=.*$/gs, "").trim(), lastEditedOn: "web", tenantId, createdBy: userId, createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          items: { create: items.map((it, idx) => { const d = { type: "product", description: it.product_name || "", quantity: parseInt(it.quantity) || 1, unitPrice: parseFloat(it.price) || 0, purchasePrice: 0, total: parseFloat(it.total) || 0, sortOrder: idx }; if (it.product_id && idMap.products[it.product_id]) d.productId = idMap.products[it.product_id]; return d; }) },
          exchangeItems: { create: exItems.map(ex => { const d = { description: ex.product_name || "", variantLabel: ex.variant_imei || "", price: parseFloat(ex.price) || 0, quantity: parseInt(ex.quantity) || 1, notes: ex.notes || "", addToStock: true }; if (ex.product_id && idMap.products[ex.product_id]) d.productId = idMap.products[ex.product_id]; if (ex.variant_id && idMap.variants[ex.variant_id]) d.variantId = idMap.variants[ex.variant_id]; return d; }) },
          paymentHistory: { create: payments.map(p => ({ amount: parseFloat(p.amount) || 0, method: p.payment_method || "especes", date: p.payment_date ? new Date(p.payment_date) : new Date(), note: p.notes || "" })) },
        };
        if (clientId) invData.clientId = clientId;
        if (row.due_date) invData.dueDate = new Date(row.due_date);
        await prisma.invoice.create({ data: invData });
        stats.invoices++; stats.invoiceItems += items.length; stats.exchangeItems += exItems.length;
      } catch (e) { stats.errors.push(`Inv ${row.invoice_number}: ${e.message.substring(0, 100)}`); }
    }

    // Quotations
    const { rows: quots } = await oldDb.query("SELECT * FROM quotations ORDER BY quotation_id");
    for (const row of quots) {
      try {
        const clientId = row.client_id ? idMap.clients[row.client_id] : undefined;
        const { rows: items } = await oldDb.query("SELECT * FROM quotation_items WHERE quotation_id = $1", [row.quotation_id]);
        const qData = {
          number: row.quotation_number, status: row.is_sent ? "envoyee" : "brouillon",
          date: row.date ? new Date(row.date) : new Date(),
          subtotal: parseFloat(row.subtotal) || 0, showTax: parseFloat(row.tax_rate) > 0,
          taxRate: parseFloat(row.tax_rate) || 0, taxAmount: parseFloat(row.tax_amount) || 0, total: parseFloat(row.total) || 0,
          showItemPrices: row.show_item_prices !== false, notes: row.notes || "",
          tenantId, createdBy: userId, createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          items: { create: items.map((it, idx) => { const d = { type: "product", description: it.product_name || "", quantity: parseInt(it.quantity) || 1, unitPrice: parseFloat(it.price) || 0, total: parseFloat(it.total) || 0, sortOrder: idx }; if (it.product_id && idMap.products[it.product_id]) d.productId = idMap.products[it.product_id]; return d; }) },
        };
        if (clientId) qData.clientId = clientId;
        if (row.expiry_date) qData.validUntil = new Date(row.expiry_date);
        await prisma.quote.create({ data: qData });
        stats.quotations++;
      } catch (e) { stats.errors.push(`Devis ${row.quotation_number}: ${e.message.substring(0, 100)}`); }
    }

    await oldDb.end();

    // 4. Drop temp database
    const dropClient = new Client({ connectionString: process.env.DATABASE_URL });
    await dropClient.connect();
    await dropClient.query(`DROP DATABASE IF EXISTS "${tempDb}"`);
    await dropClient.end();

    // 5. Cleanup dump file
    try { fs.unlinkSync(dumpPath); } catch {}

    res.json({
      message: "Import depuis ancienne application termine",
      summary: { categories: stats.categories, suppliers: stats.suppliers, clients: stats.clients, products: stats.products, variants: stats.variants, invoices: stats.invoices, quotations: stats.quotations },
      errors: stats.errors.length > 0 ? stats.errors.slice(0, 20) : undefined,
    });
  } catch (err) {
    // Cleanup
    try { const dc = new Client({ connectionString: process.env.DATABASE_URL }); await dc.connect(); await dc.query(`DROP DATABASE IF EXISTS "${tempDb}"`); await dc.end(); } catch {}
    try { require("fs").unlinkSync(dumpPath); } catch {}
    logger.error("Legacy import error", { error: err.message });
    res.status(500).json({ error: "Erreur lors de l'import: " + err.message });
  }
});

module.exports = router;
