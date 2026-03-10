const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatCreance(c) {
  if (!c) return c;
  const obj = addId(c);
  if (obj.payments) obj.payments = addId(obj.payments);
  if (obj.client) obj.client = addId(obj.client);
  return obj;
}

// POST sync from invoices — auto-create creances for invoices with remaining balance
router.post("/sync-invoices", async (req, res) => {
  try {
    // Clean up duplicate créances (keep oldest per invoiceId)
    const allCreances = await prisma.creance.findMany({
      where: { tenantId: req.tenantId, invoiceId: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    const seen = new Set();
    for (const c of allCreances) {
      if (seen.has(c.invoiceId)) {
        await prisma.creancePayment.deleteMany({ where: { creanceId: c.id } });
        await prisma.creance.delete({ where: { id: c.id } });
      } else {
        seen.add(c.invoiceId);
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: { tenantId: req.tenantId, status: { in: ["partielle", "en_retard", "envoyee"] } },
      include: { client: true },
    });

    let created = 0;
    for (const inv of invoices) {
      const paid = inv.paymentEnabled ? (inv.paymentAmount || 0) : 0;
      const remaining = Math.max(0, (inv.total || 0) - paid);
      if (remaining <= 0) continue;

      // Check if creance already exists for this invoice
      const existing = await prisma.creance.findFirst({
        where: { invoiceId: inv.id, tenantId: req.tenantId },
        include: { payments: true },
      });
      if (existing) {
        // Update amount if invoice changed
        const newAmount = inv.total || 0;
        const newPaid = existing.payments.reduce((s, p) => s + p.amount, 0);
        if (existing.amount !== newAmount) {
          let status = "en_cours";
          if (newPaid >= newAmount) status = "soldee";
          else if (newPaid > 0) status = "partielle";
          await prisma.creance.update({
            where: { id: existing.id },
            data: { amount: newAmount, amountPaid: newPaid, status },
          });
        }
        continue;
      }

      const seq = await getNextSequence("creance");
      const number = `CRE-${String(seq).padStart(4, "0")}`;
      await prisma.creance.create({
        data: {
          tenantId: req.tenantId,
          number,
          clientId: inv.clientId || undefined,
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          description: `Creance liee a la facture ${inv.number}`,
          amount: inv.total || 0,
          amountPaid: paid,
          dueDate: inv.dueDate,
          status: paid > 0 ? "partielle" : "en_cours",
          createdBy: req.userId,
          payments: paid > 0 ? {
            create: [{
              amount: paid,
              method: inv.paymentMethod || "especes",
              date: inv.paymentDate || new Date(),
              notes: "Paiement initial (facture)",
            }],
          } : undefined,
        },
      });
      created++;
    }

    res.json({ created, message: `${created} creance(s) generee(s)` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all
router.get("/", async (req, res) => {
  try {
    const creances = await prisma.creance.findMany({
      where: { tenantId: req.tenantId },
      include: { client: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(creances.map(formatCreance));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const c = await prisma.creance.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true, payments: true },
    });
    if (!c) return res.status(404).json({ error: "Creance introuvable" });
    res.json(formatCreance(c));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create
router.post("/", async (req, res) => {
  try {
    const seq = await getNextSequence("creance");
    const number = `CRE-${String(seq).padStart(4, "0")}`;

    const { client, invoiceId, invoiceNumber, description, amount, amountPaid, dueDate, status, notes, payments } = req.body;

    const c = await prisma.creance.create({
      data: {
        tenantId: req.tenantId,
        number,
        clientId: client || undefined,
        invoiceId: invoiceId || undefined,
        invoiceNumber: invoiceNumber || "",
        description: description || "",
        amount: amount || 0,
        amountPaid: amountPaid || 0,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || "en_cours",
        notes: notes || "",
        createdBy: req.userId,
        payments: payments && payments.length > 0 ? {
          create: payments.map((p) => ({
            amount: p.amount,
            method: p.method || "especes",
            date: p.date ? new Date(p.date) : new Date(),
            notes: p.notes || "",
          })),
        } : undefined,
      },
      include: { client: true, payments: true },
    });
    res.status(201).json(formatCreance(c));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST create from invoice
router.post("/from-invoice/:invoiceId", async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({
      where: { id: req.params.invoiceId, tenantId: req.tenantId },
      include: { client: true },
    });
    if (!inv) return res.status(404).json({ error: "Facture introuvable" });

    // Check if creance already exists for this invoice
    const existing = await prisma.creance.findFirst({
      where: { invoiceId: inv.id, tenantId: req.tenantId },
    });
    if (existing) {
      return res.status(400).json({ error: "Une creance existe deja pour cette facture", existingId: existing.id });
    }

    const paid = inv.paymentEnabled ? (inv.paymentAmount || 0) : 0;
    const remaining = Math.max(0, (inv.total || 0) - paid);
    if (remaining <= 0) {
      return res.status(400).json({ error: "Cette facture est deja entierement payee" });
    }

    const seq = await getNextSequence("creance");
    const number = `CRE-${String(seq).padStart(4, "0")}`;

    const c = await prisma.creance.create({
      data: {
        tenantId: req.tenantId,
        number,
        clientId: inv.clientId || undefined,
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        description: `Creance liee a la facture ${inv.number}`,
        amount: remaining,
        amountPaid: 0,
        dueDate: inv.dueDate,
        createdBy: req.userId,
      },
      include: { client: true, payments: true },
    });
    res.status(201).json(formatCreance(c));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.creance.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Creance introuvable" });

    const data = {};
    const flatFields = ["status", "description", "amount", "amountPaid", "dueDate", "invoiceNumber", "notes"];
    for (const key of flatFields) {
      if (req.body[key] !== undefined) {
        if (key === "dueDate") {
          data[key] = req.body[key] ? new Date(req.body[key]) : undefined;
        } else {
          data[key] = req.body[key];
        }
      }
    }
    if (req.body.client !== undefined) {
      data.clientId = req.body.client || undefined;
    }
    if (req.body.invoiceId !== undefined) {
      data.invoiceId = req.body.invoiceId || undefined;
    }

    const c = await prisma.creance.update({
      where: { id: req.params.id },
      data,
    });
    const populated = await prisma.creance.findUnique({
      where: { id: req.params.id },
      include: { client: true, payments: true },
    });
    res.json(formatCreance(populated));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST add payment to creance
router.post("/:id/payment", async (req, res) => {
  try {
    const c = await prisma.creance.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { payments: true },
    });
    if (!c) return res.status(404).json({ error: "Creance introuvable" });

    const { amount, method, notes } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
    }

    await prisma.creancePayment.create({
      data: {
        creanceId: req.params.id,
        amount,
        method: method || "especes",
        notes: notes || "",
        date: new Date(),
      },
    });

    const newAmountPaid = c.payments.reduce((s, p) => s + p.amount, 0) + amount;
    let status = "en_cours";
    if (newAmountPaid >= c.amount) {
      status = "soldee";
    } else if (newAmountPaid > 0) {
      status = "partielle";
    }

    await prisma.creance.update({
      where: { id: req.params.id },
      data: { amountPaid: newAmountPaid, status },
    });

    // Sync payment back to the linked invoice
    if (c.invoiceId) {
      try {
        const invoice = await prisma.invoice.findUnique({ where: { id: c.invoiceId } });
        if (invoice) {
          const invoiceStatus = newAmountPaid >= c.amount ? "payee" : newAmountPaid > 0 ? "partielle" : invoice.status;
          await prisma.invoice.update({
            where: { id: c.invoiceId },
            data: {
              paymentEnabled: true,
              paymentAmount: newAmountPaid,
              paymentMethod: method || "especes",
              paymentDate: new Date(),
              status: invoiceStatus,
            },
          });
          await prisma.paymentHistoryEntry.create({
            data: {
              invoiceId: c.invoiceId,
              amount,
              method: method || "especes",
              date: new Date(),
              note: "Paiement via creance",
            },
          });
        }
      } catch {
        // Non-blocking
      }
    }

    const populated = await prisma.creance.findUnique({
      where: { id: req.params.id },
      include: { client: true, payments: true },
    });
    res.json(formatCreance(populated));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE payment from creance
router.delete("/:id/payment/:paymentId", async (req, res) => {
  try {
    const c = await prisma.creance.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { payments: true },
    });
    if (!c) return res.status(404).json({ error: "Creance introuvable" });

    await prisma.creancePayment.delete({
      where: { id: req.params.paymentId },
    }).catch(() => {});

    const remainingPayments = c.payments.filter((p) => p.id !== req.params.paymentId);
    const newAmountPaid = remainingPayments.reduce((s, p) => s + p.amount, 0);

    let status = "en_cours";
    if (newAmountPaid >= c.amount) {
      status = "soldee";
    } else if (newAmountPaid > 0) {
      status = "partielle";
    }

    await prisma.creance.update({
      where: { id: req.params.id },
      data: { amountPaid: newAmountPaid, status },
    });

    const populated = await prisma.creance.findUnique({
      where: { id: req.params.id },
      include: { client: true, payments: true },
    });
    res.json(formatCreance(populated));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const c = await prisma.creance.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!c) return res.status(404).json({ error: "Creance introuvable" });
    // Delete payments first, then creance
    await prisma.creancePayment.deleteMany({ where: { creanceId: req.params.id } });
    await prisma.creance.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
