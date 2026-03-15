/**
 * Import script: migrates data from old gapsapp_import DB to SenStock Prisma schema.
 *
 * Usage: node scripts/import-backup.js
 *
 * Requires: gapsapp_import database to be restored in the same PostgreSQL instance.
 */

const { Client } = require("pg");
const prisma = require("../db");
const bcrypt = require("bcryptjs");

// Target tenant & user
const TENANT_ID = process.env.IMPORT_TENANT_ID;
const USER_ID = process.env.IMPORT_USER_ID;

if (!TENANT_ID || !USER_ID) {
  console.error("Set IMPORT_TENANT_ID and IMPORT_USER_ID env vars");
  process.exit(1);
}

// Old DB connection
const oldDb = new Client({
  connectionString: process.env.DATABASE_URL.replace(/\/[^/]+$/, "/gapsapp_import"),
});

// ID mapping: old integer IDs → new UUIDs
const idMap = {
  categories: {},
  suppliers: {},
  clients: {},
  products: {},
  variants: {},
  invoices: {},
  quotations: {},
};

let stats = {
  categories: 0,
  suppliers: 0,
  clients: 0,
  products: 0,
  variants: 0,
  invoices: 0,
  invoiceItems: 0,
  exchangeItems: 0,
  quotations: 0,
  quotationItems: 0,
  errors: [],
};

async function importCategories() {
  console.log("📦 Importing categories...");
  const { rows } = await oldDb.query("SELECT * FROM categories ORDER BY category_id");

  for (const row of rows) {
    try {
      // Get attributes for this category
      const { rows: attrs } = await oldDb.query(
        "SELECT * FROM category_attributes WHERE category_id = $1 ORDER BY sort_order",
        [row.category_id]
      );

      const attributes = [];
      for (const attr of attrs) {
        const { rows: values } = await oldDb.query(
          "SELECT value FROM category_attribute_values WHERE attribute_id = $1 ORDER BY sort_order",
          [attr.attribute_id]
        );
        attributes.push({
          name: attr.name,
          type: attr.type === "select" ? "select" : attr.type === "number" ? "number" : "text",
          options: values.map((v) => v.value),
          required: attr.required || false,
        });
      }

      // Check if category already exists
      const existing = await prisma.category.findFirst({
        where: { name: row.name, tenantId: TENANT_ID },
      });
      if (existing) {
        idMap.categories[row.category_id] = existing.id;
        // Update hasVariants and attributes
        const updateData = {
          hasVariants: row.requires_variants || false,
          description: row.description || existing.description || "",
        };
        await prisma.category.update({ where: { id: existing.id }, data: updateData });
        // Create attributes if they don't exist
        if (attributes.length > 0) {
          const existingAttrs = await prisma.categoryAttribute.count({ where: { categoryId: existing.id } });
          if (existingAttrs === 0) {
            for (let i = 0; i < attributes.length; i++) {
              await prisma.categoryAttribute.create({
                data: { categoryId: existing.id, name: attributes[i].name, type: attributes[i].type, options: attributes[i].options, required: attributes[i].required, sortOrder: i },
              });
            }
          }
        }
        stats.categories++;
        continue;
      }

      const cat = await prisma.category.create({
        data: {
          name: row.name,
          description: row.description || "",
          hasVariants: row.requires_variants || false,
          tenantId: TENANT_ID,
          attributes: attributes.length > 0 ? {
            create: attributes.map((a, idx) => ({
              name: a.name,
              type: a.type,
              options: a.options,
              required: a.required,
              sortOrder: idx,
            })),
          } : undefined,
        },
      });
      idMap.categories[row.category_id] = cat.id;
      stats.categories++;
    } catch (e) {
      stats.errors.push(`Category ${row.name}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.categories} categories imported`);
}

async function importSuppliers() {
  console.log("🏭 Importing suppliers...");
  const { rows } = await oldDb.query("SELECT * FROM suppliers ORDER BY supplier_id");

  for (const row of rows) {
    try {
      const sup = await prisma.supplier.create({
        data: {
          name: row.name || "Sans nom",
          phone: row.phone || "",
          email: row.email || "",
          address: row.address || "",
          tenantId: TENANT_ID,
        },
      });
      idMap.suppliers[row.supplier_id] = sup.id;
      stats.suppliers++;
    } catch (e) {
      stats.errors.push(`Supplier ${row.name}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.suppliers} suppliers imported`);
}

async function importClients() {
  console.log("👥 Importing clients...");
  const { rows } = await oldDb.query("SELECT * FROM clients ORDER BY client_id");

  for (const row of rows) {
    try {
      const client = await prisma.client.create({
        data: {
          name: row.name || "Sans nom",
          phone: row.phone || "",
          email: row.email || "",
          address: [row.address, row.city, row.postal_code, row.country].filter(Boolean).join(", "),
          tenantId: TENANT_ID,
        },
      });
      idMap.clients[row.client_id] = client.id;
      stats.clients++;
    } catch (e) {
      stats.errors.push(`Client ${row.name}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.clients} clients imported`);
}

async function importProducts() {
  console.log("📱 Importing products...");
  const { rows } = await oldDb.query("SELECT * FROM products ORDER BY product_id");

  // Build category name → ID mapping for products that reference by name
  const catNameMap = {};
  const { rows: cats } = await oldDb.query("SELECT category_id, name FROM categories");
  for (const c of cats) catNameMap[c.name] = c.category_id;

  for (const row of rows) {
    try {
      // Resolve category
      let categoryId = null;
      if (row.category) {
        const oldCatId = catNameMap[row.category];
        if (oldCatId && idMap.categories[oldCatId]) {
          categoryId = idMap.categories[oldCatId];
        }
      }

      // If no category found, create one
      if (!categoryId && row.category) {
        const existing = await prisma.category.findFirst({
          where: { name: row.category, tenantId: TENANT_ID },
        });
        if (existing) {
          categoryId = existing.id;
        } else {
          const newCat = await prisma.category.create({
            data: { name: row.category, tenantId: TENANT_ID },
          });
          categoryId = newCat.id;
          stats.categories++;
        }
      }

      // Get variants for this product
      const { rows: variants } = await oldDb.query(
        "SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variant_id",
        [row.product_id]
      );

      const product = await prisma.product.create({
        data: {
          name: row.name || "Sans nom",
          description: row.description || "",
          brand: row.brand || "",
          model: row.model || "",
          barcode: row.barcode || "",
          image: row.image_path || "",
          purchasePrice: parseFloat(row.purchase_price) || 0,
          costPrice: 0,
          sellingPrice: parseFloat(row.price) || 0,
          quantity: row.has_unique_serial ? variants.filter((v) => !v.is_sold).length : (parseInt(row.quantity) || 0),
          notes: row.notes || "",
          archived: row.is_archived || false,
          categoryId: categoryId || undefined,
          supplierId: row.supplier_id ? idMap.suppliers[row.supplier_id] : undefined,
          tenantId: TENANT_ID,
          createdBy: USER_ID,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          variants: {
            create: variants.map((v) => {
              const variant = {
                serialNumber: v.imei_serial || "",
                barcode: v.barcode || "",
                condition: (v.condition || "neuf").toLowerCase(),
                sold: v.is_sold || false,
                price: v.price ? parseFloat(v.price) : undefined,
                createdAt: v.created_at ? new Date(v.created_at) : new Date(),
              };
              return variant;
            }),
          },
        },
        include: { variants: true },
      });

      idMap.products[row.product_id] = product.id;
      // Map old variant IDs to new
      for (let i = 0; i < variants.length; i++) {
        if (product.variants[i]) {
          idMap.variants[variants[i].variant_id] = product.variants[i].id;
        }
      }
      stats.products++;
      stats.variants += variants.length;

      // Import variant attributes
      for (const v of variants) {
        const { rows: vAttrs } = await oldDb.query(
          "SELECT * FROM product_variant_attributes WHERE variant_id = $1",
          [v.variant_id]
        );
        if (vAttrs.length > 0 && idMap.variants[v.variant_id]) {
          const attrs = {};
          for (const va of vAttrs) {
            attrs[va.attribute_name] = va.attribute_value;
          }
          await prisma.variant.update({
            where: { id: idMap.variants[v.variant_id] },
            data: { attributes: attrs },
          });
        }
      }
    } catch (e) {
      stats.errors.push(`Product ${row.name}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.products} products, ${stats.variants} variants imported`);
}

async function importInvoices() {
  console.log("🧾 Importing invoices...");
  const { rows } = await oldDb.query("SELECT * FROM invoices ORDER BY invoice_id");

  for (const row of rows) {
    try {
      // Map invoice type
      let type = "facture";
      if (row.invoice_type === "exchange") type = "echange";
      else if (row.invoice_type === "proforma") type = "proforma";

      // Map status
      let status = "brouillon";
      if (row.status === "payée") status = "payee";
      else if (row.status === "en attente") status = "envoyee";
      else if (row.status === "partiellement payée") status = "partielle";

      const clientId = row.client_id ? idMap.clients[row.client_id] : undefined;

      // Get items
      const { rows: items } = await oldDb.query(
        "SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY item_id",
        [row.invoice_id]
      );

      // Get exchange items
      const { rows: exchangeItems } = await oldDb.query(
        "SELECT * FROM invoice_exchange_items WHERE invoice_id = $1 ORDER BY exchange_item_id",
        [row.invoice_id]
      );

      // Get payments
      const { rows: payments } = await oldDb.query(
        "SELECT * FROM invoice_payments WHERE invoice_id = $1 ORDER BY payment_id",
        [row.invoice_id]
      );

      const invoiceData = {
          number: row.invoice_number || `IMP-${row.invoice_id}`,
          type,
          status,
          date: row.date ? new Date(row.date) : new Date(),
          subtotal: parseFloat(row.subtotal) || 0,
          discountAmount: parseFloat(row.exchange_discount) || 0,
          showTax: row.show_tax || false,
          taxRate: parseFloat(row.tax_rate) || 0,
          taxAmount: parseFloat(row.tax_amount) || 0,
          total: parseFloat(row.total) || 0,
          showItemPrices: row.show_item_prices !== false,
          showSectionTotals: row.show_section_totals || false,
          paymentEnabled: parseFloat(row.paid_amount) > 0,
          paymentAmount: parseFloat(row.paid_amount) || 0,
          paymentMethod: row.payment_method || "",
          warrantyEnabled: row.has_warranty || false,
          warrantyDuration: row.warranty_duration ? String(row.warranty_duration) : "",
          notes: [row.notes, row.internal_notes, row.external_notes].filter(Boolean).join("\n").replace(/\n?\n?__(SERIALS|SIGNATURE|QUOTE_QTYS)__=.*$/gs, "").trim(),
          lastEditedOn: "web",
          tenantId: TENANT_ID,
          createdBy: USER_ID,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      };
      if (clientId) invoiceData.clientId = clientId;
      if (row.due_date) invoiceData.dueDate = new Date(row.due_date);

      const invoice = await prisma.invoice.create({
        data: {
          ...invoiceData,
          items: {
            create: items.map((item, idx) => {
              const d = {
                type: "product",
                description: item.product_name || "",
                quantity: parseInt(item.quantity) || 1,
                unitPrice: parseFloat(item.price) || 0,
                purchasePrice: 0,
                total: parseFloat(item.total) || 0,
                sortOrder: idx,
              };
              if (item.product_id && idMap.products[item.product_id]) d.productId = idMap.products[item.product_id];
              if (item.external_price) d.externalPrice = parseFloat(item.external_price);
              return d;
            }),
          },
          exchangeItems: {
            create: exchangeItems.map((ex) => {
              const d = {
                description: ex.product_name || "",
                variantLabel: ex.variant_imei || "",
                price: parseFloat(ex.price) || 0,
                quantity: parseInt(ex.quantity) || 1,
                notes: ex.notes || "",
                addToStock: true,
              };
              if (ex.product_id && idMap.products[ex.product_id]) d.productId = idMap.products[ex.product_id];
              if (ex.variant_id && idMap.variants[ex.variant_id]) d.variantId = idMap.variants[ex.variant_id];
              return d;
            }),
          },
          paymentHistory: {
            create: payments.map((p) => ({
              amount: parseFloat(p.amount) || 0,
              method: p.payment_method || "especes",
              date: p.payment_date ? new Date(p.payment_date) : new Date(),
              note: p.notes || "",
            })),
          },
        },
      });

      idMap.invoices[row.invoice_id] = invoice.id;
      stats.invoices++;
      stats.invoiceItems += items.length;
      stats.exchangeItems += exchangeItems.length;

      // Update sold variants to reference this invoice
      for (const item of items) {
        if (item.product_id && idMap.products[item.product_id]) {
          // For variant products, check if there's a matching sold variant
          const { rows: soldVariants } = await oldDb.query(
            "SELECT variant_id FROM product_variants WHERE product_id = $1 AND is_sold = true",
            [item.product_id]
          );
          // We can't perfectly match which variant was sold in which invoice
          // but we can set the soldInvoiceId on variants that are sold
        }
      }
    } catch (e) {
      if (stats.errors.filter(x => x.startsWith("Invoice")).length === 0) {
        require("fs").writeFileSync("/tmp/invoice_error.txt", e.message);
        console.log("  ✗ First invoice error written to /tmp/invoice_error.txt");
      }
      stats.errors.push(`Invoice ${row.invoice_number}`);
    }
  }
  console.log(`  ✓ ${stats.invoices} invoices, ${stats.invoiceItems} items, ${stats.exchangeItems} exchange items imported`);
}

async function importQuotations() {
  console.log("📋 Importing quotations...");
  const { rows } = await oldDb.query("SELECT * FROM quotations ORDER BY quotation_id");

  for (const row of rows) {
    try {
      const clientId = row.client_id ? idMap.clients[row.client_id] : undefined;

      const { rows: items } = await oldDb.query(
        "SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY item_id",
        [row.quotation_id]
      );

      let status = "brouillon";
      if (row.status === "sent" || row.is_sent) status = "envoyee";
      else if (row.status === "accepted") status = "accepte";
      else if (row.status === "rejected") status = "refuse";
      else if (row.status === "expired") status = "expire";

      const quote = await prisma.quote.create({
        data: {
          number: row.quotation_number || `DEV-IMP-${row.quotation_id}`,
          clientId: clientId || undefined,
          date: row.date ? new Date(row.date) : new Date(),
          validUntil: row.expiry_date ? new Date(row.expiry_date) : undefined,
          status,
          subtotal: parseFloat(row.subtotal) || 0,
          showTax: parseFloat(row.tax_rate) > 0,
          taxRate: parseFloat(row.tax_rate) || 0,
          taxAmount: parseFloat(row.tax_amount) || 0,
          total: parseFloat(row.total) || 0,
          showItemPrices: row.show_item_prices !== false,
          showSectionTotals: row.show_section_totals || false,
          notes: row.notes || "",
          tenantId: TENANT_ID,
          createdBy: USER_ID,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          items: {
            create: items.map((item, idx) => ({
              type: "product",
              productId: item.product_id ? idMap.products[item.product_id] : undefined,
              description: item.product_name || "",
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.price) || 0,
              total: parseFloat(item.total) || 0,
              sortOrder: idx,
            })),
          },
        },
      });

      idMap.quotations[row.quotation_id] = quote.id;
      stats.quotations++;
      stats.quotationItems += items.length;
    } catch (e) {
      stats.errors.push(`Quotation ${row.quotation_number}: ${e.message}`);
    }
  }
  console.log(`  ✓ ${stats.quotations} quotations imported`);
}

async function updateCounters() {
  console.log("🔢 Updating counters...");
  // Set invoice counter to max imported number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId: TENANT_ID },
    orderBy: { number: "desc" },
  });
  if (lastInvoice) {
    const match = lastInvoice.number.match(/(\d+)/);
    if (match) {
      await prisma.counter.upsert({
        where: { id: `${TENANT_ID}_facture` },
        update: { seq: parseInt(match[0]) },
        create: { id: `${TENANT_ID}_facture`, seq: parseInt(match[0]) },
      });
    }
  }

  const lastQuote = await prisma.quote.findFirst({
    where: { tenantId: TENANT_ID },
    orderBy: { number: "desc" },
  });
  if (lastQuote) {
    const match = lastQuote.number.match(/(\d+)/);
    if (match) {
      await prisma.counter.upsert({
        where: { id: `${TENANT_ID}_devis` },
        update: { seq: parseInt(match[0]) },
        create: { id: `${TENANT_ID}_devis`, seq: parseInt(match[0]) },
      });
    }
  }
  console.log("  ✓ Counters updated");
}

async function main() {
  console.log("===========================================");
  console.log("  SenStock Backup Import");
  console.log("===========================================");
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`User: ${USER_ID}`);
  console.log("");

  await oldDb.connect();
  console.log("Connected to old database\n");

  await importCategories();
  await importSuppliers();
  await importClients();
  await importProducts();
  await importInvoices();
  await importQuotations();
  await updateCounters();

  await oldDb.end();

  console.log("\n===========================================");
  console.log("  Import Summary");
  console.log("===========================================");
  console.log(`Categories:     ${stats.categories}`);
  console.log(`Suppliers:      ${stats.suppliers}`);
  console.log(`Clients:        ${stats.clients}`);
  console.log(`Products:       ${stats.products}`);
  console.log(`Variants:       ${stats.variants}`);
  console.log(`Invoices:       ${stats.invoices}`);
  console.log(`Invoice Items:  ${stats.invoiceItems}`);
  console.log(`Exchange Items: ${stats.exchangeItems}`);
  console.log(`Quotations:     ${stats.quotations}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors:`);
    stats.errors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\n✅ Import completed without errors!");
  }
}

main().catch(console.error).finally(() => process.exit());
