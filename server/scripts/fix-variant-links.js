const prisma = require("../db");

async function fixVariantLinks() {
  const { Client } = require("pg");
  const oldDb = new Client({ connectionString: "postgresql://senstock:senstock_pass@postgres:5432/gapsapp_import" });
  await oldDb.connect();

  // Get all old invoices with SERIALS in notes
  const { rows: oldInvoices } = await oldDb.query("SELECT invoice_id, invoice_number, notes FROM invoices WHERE notes LIKE '%SERIALS%'");
  console.log("Old invoices with serials:", oldInvoices.length);

  let fixed = 0;
  let notFound = 0;

  for (const old of oldInvoices) {
    const match = old.notes.match(/__SERIALS__=(\[.+\])\s*$/m);
    if (!match) continue;

    let serials;
    try {
      // Fix all non-standard quote characters
      let jsonStr = match[1];
      // Log hex of problematic area for first invoice
      if (old.invoice_number === "FAC-0003") {
        const chars = jsonStr.split("").map((c, i) => `${i}:${c}(${c.charCodeAt(0).toString(16)})`).join(" ");
        console.log("  HEX:", chars);
      }
      jsonStr = jsonStr.replace(/[\u201c\u201d\u201e\u201f\u2033\u2036\uff02]/g, '"');
      jsonStr = jsonStr.replace(/[\u2018\u2019\u201a\u201b\u2032\u2035\uff07]/g, "'");
      serials = JSON.parse(jsonStr);
    } catch (e) {
      console.log("  Parse error for", old.invoice_number, ":", e.message, "raw hex[40-50]:", [...match[1].substring(40, 50)].map(c => c.charCodeAt(0).toString(16)).join(","));
      continue;
    }

    // Find new invoice by number
    const newInvoice = await prisma.invoice.findFirst({
      where: { number: old.invoice_number },
      include: { items: true },
    });

    if (!newInvoice) {
      notFound++;
      continue;
    }

    for (const serial of serials) {
      for (const imei of serial.imeis || []) {
        // Find variant by serial number
        const variant = await prisma.variant.findFirst({
          where: { serialNumber: imei },
          include: { product: { select: { id: true, name: true } } },
        });

        if (!variant) {
          console.log("  Variant not found for IMEI:", imei);
          continue;
        }

        // Find invoice item that doesn't have a variantId yet
        const item = newInvoice.items.find((i) => !i.variantId);
        if (item) {
          await prisma.invoiceItem.update({
            where: { id: item.id },
            data: { variantId: variant.id, productId: variant.productId },
          });
          // Mark as used
          item.variantId = variant.id;
          fixed++;
          console.log("  Fixed:", old.invoice_number, "IMEI:", imei, "->", variant.product?.name);
        }
      }
    }
  }

  await oldDb.end();
  console.log("\nDone! Fixed:", fixed, "| Invoice not found:", notFound);
  process.exit(0);
}

fixVariantLinks().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
