const prisma = require("../db");
const logger = require("./logger");
const { createNotification } = require("./notify");
const { getNextSequence } = require("../helpers/counter");

/**
 * Check all overdue invoices and create notifications + update status.
 */
async function checkOverdueInvoices() {
  try {
    const now = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "envoyee",
        dueDate: { lt: now },
        deleted: false,
      },
      include: {
        client: true,
      },
    });

    if (overdueInvoices.length === 0) {
      logger.info("No overdue invoices found");
      return;
    }

    // Group by tenantId
    const grouped = {};
    for (const invoice of overdueInvoices) {
      const tid = invoice.tenantId || "unknown";
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(invoice);
    }

    for (const [tenantId, invoices] of Object.entries(grouped)) {
      for (const invoice of invoices) {
        const diffMs = now.getTime() - new Date(invoice.dueDate).getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const clientName = invoice.client?.name || "Client inconnu";

        await createNotification({
          tenantId,
          type: "invoice_overdue",
          title: "Facture en retard",
          message: `La facture ${invoice.number} de ${clientName} est en retard de ${days} jours`,
          link: `/commerce/factures/${invoice.id}`,
        });

        // Update status to "en_retard"
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "en_retard" },
        });

        logger.info(`Invoice ${invoice.number} marked as en_retard (${days} days overdue)`);
      }
    }

    logger.info(`Processed ${overdueInvoices.length} overdue invoice(s)`);
  } catch (err) {
    logger.error("Error checking overdue invoices", { error: err.message, stack: err.stack });
  }
}

/**
 * Generate invoices from active recurring invoice templates.
 */
async function generateRecurringInvoices() {
  try {
    const now = new Date();

    const recurringInvoices = await prisma.recurringInvoice.findMany({
      where: {
        active: true,
        nextDate: { lte: now },
      },
    });

    if (recurringInvoices.length === 0) {
      logger.info("No recurring invoices to generate");
      return;
    }

    for (const recurring of recurringInvoices) {
      const seq = await getNextSequence("invoice");
      const invoiceNumber = `FAC-${String(seq).padStart(5, "0")}`;

      // Parse template items
      const templateItems =
        typeof recurring.templateItems === "string"
          ? JSON.parse(recurring.templateItems)
          : recurring.templateItems || [];

      // Calculate totals
      let subtotal = 0;
      for (const item of templateItems) {
        subtotal += (item.quantity || 1) * (item.unitPrice || 0);
      }

      const taxAmount = recurring.showTax ? subtotal * (recurring.taxRate / 100) : 0;
      const total = subtotal + taxAmount;

      // Create the invoice with items
      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber,
          type: "facture",
          status: "envoyee",
          clientId: recurring.clientId,
          date: now,
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days
          subtotal,
          showTax: recurring.showTax,
          taxRate: recurring.taxRate,
          taxAmount,
          total,
          notes: recurring.notes,
          tenantId: recurring.tenantId,
          createdBy: recurring.createdBy,
          items: {
            create: templateItems.map((item, index) => ({
              type: item.type || "product",
              productId: item.productId || null,
              variantId: item.variantId || null,
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              purchasePrice: item.purchasePrice || 0,
              total: (item.quantity || 1) * (item.unitPrice || 0),
              sortOrder: index,
            })),
          },
        },
      });

      // Calculate nextDate based on frequency
      const nextDate = new Date(recurring.nextDate);
      switch (recurring.frequency) {
        case "hebdomadaire":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "mensuel":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "trimestriel":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "annuel":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Update recurring invoice
      await prisma.recurringInvoice.update({
        where: { id: recurring.id },
        data: {
          nextDate,
          lastGeneratedAt: now,
          totalGenerated: { increment: 1 },
        },
      });

      // Create notification
      if (recurring.tenantId) {
        await createNotification({
          tenantId: recurring.tenantId,
          type: "invoice_generated",
          title: "Facture recurrente generee",
          message: `La facture ${invoiceNumber} a ete generee automatiquement`,
          link: `/commerce/factures/${invoice.id}`,
        });
      }

      logger.info(`Generated recurring invoice ${invoiceNumber} from template ${recurring.id}`);
    }

    logger.info(`Generated ${recurringInvoices.length} recurring invoice(s)`);
  } catch (err) {
    logger.error("Error generating recurring invoices", { error: err.message, stack: err.stack });
  }
}

module.exports = { checkOverdueInvoices, generateRecurringInvoices };
