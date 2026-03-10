const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatTx(tx) {
  if (!tx) return tx;
  const result = addId(tx);
  if (result.account) {
    result.accountId = addId(result.account);
    delete result.account;
  }
  if (result.toAccount) {
    result.toAccountId = addId(result.toAccount);
    delete result.toAccount;
  }
  if (result.invoice) result.invoiceId = addId(result.invoice);
  if (result.salary) result.salaryId = addId(result.salary);
  return result;
}

// GET /stats
router.get("/stats", async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({ where: { tenantId: req.tenantId } });
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthTx = await prisma.bankTransaction.findMany({
      where: { date: { gte: startOfMonth }, tenantId: req.tenantId },
    });
    let monthEntries = 0;
    let monthExits = 0;
    for (const tx of monthTx) {
      if (tx.type === "entree") monthEntries += tx.amount;
      else if (tx.type === "sortie") monthExits += tx.amount;
    }

    const unreconciledCount = await prisma.bankTransaction.count({
      where: { reconciled: false, tenantId: req.tenantId },
    });

    // Monthly data for chart (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const txs = await prisma.bankTransaction.findMany({
        where: { date: { gte: d, lt: end }, tenantId: req.tenantId },
      });
      let entries = 0;
      let exits = 0;
      for (const tx of txs) {
        if (tx.type === "entree") entries += tx.amount;
        else if (tx.type === "sortie") exits += tx.amount;
      }
      monthlyData.push({
        month: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        entrees: entries,
        sorties: exits,
      });
    }

    // Recent transactions
    const recent = await prisma.bankTransaction.findMany({
      where: { tenantId: req.tenantId },
      include: { account: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    });

    res.json({
      totalBalance,
      accountCount: accounts.length,
      monthEntries,
      monthExits,
      unreconciledCount,
      monthlyData,
      recent: recent.map((tx) => {
        const r = addId(tx);
        if (r.account) {
          r.accountId = addId(r.account);
          delete r.account;
        }
        return r;
      }),
      accounts: accounts.map((a) => ({ _id: a.id, name: a.name, balance: a.balance })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all transactions (paginated + filtered)
router.get("/", async (req, res) => {
  try {
    const { accountId, type, category, startDate, endDate, reconciled, page = 1, limit = 50, search } = req.query;
    const where = { tenantId: req.tenantId };

    if (accountId) {
      where.OR = [{ accountId }, { toAccountId: accountId }];
    }
    if (type) where.type = type;
    if (category) where.category = category;
    if (reconciled !== undefined && reconciled !== "") where.reconciled = reconciled === "true";
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true } },
          toAccount: { select: { id: true, name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: parseInt(limit),
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    res.json({
      transactions: transactions.map((tx) => {
        const r = addId(tx);
        if (r.account) {
          r.accountId = addId(r.account);
          delete r.account;
        }
        if (r.toAccount) {
          r.toAccountId = addId(r.toAccount);
          delete r.toAccount;
        }
        return r;
      }),
      total,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single transaction
router.get("/:id", async (req, res) => {
  try {
    const tx = await prisma.bankTransaction.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        account: true,
        toAccount: true,
      },
    });
    if (!tx) return res.status(404).json({ error: "Transaction introuvable" });
    const result = addId(tx);
    if (result.account) {
      result.accountId = addId(result.account);
      delete result.account;
    }
    if (result.toAccount) {
      result.toAccountId = addId(result.toAccount);
      delete result.toAccount;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create transaction
router.post("/", async (req, res) => {
  try {
    const { type, amount, accountId, toAccountId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Montant invalide" });

    const account = await prisma.bankAccount.findFirst({ where: { id: accountId, tenantId: req.tenantId } });
    if (!account) return res.status(404).json({ error: "Compte introuvable" });

    const seq = await getNextSequence("bank_transaction");
    const number = `TXN-${String(seq).padStart(4, "0")}`;

    let category = req.body.category || "autre";

    // Handle transfer
    if (type === "virement") {
      if (!toAccountId) return res.status(400).json({ error: "Compte destinataire requis" });
      const toAccount = await prisma.bankAccount.findFirst({ where: { id: toAccountId, tenantId: req.tenantId } });
      if (!toAccount) return res.status(404).json({ error: "Compte destinataire introuvable" });

      category = "virement_interne";

      // Debit source, credit destination
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } },
      });
      await prisma.bankAccount.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      });
    } else if (type === "entree") {
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { balance: { increment: amount } },
      });
    } else if (type === "sortie") {
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { balance: { decrement: amount } },
      });
    }

    const txData = {
      number,
      type: req.body.type,
      category,
      amount: req.body.amount,
      description: req.body.description || "",
      accountId: req.body.accountId,
      toAccountId: req.body.toAccountId || null,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      reference: req.body.reference || "",
      invoiceId: req.body.invoiceId || null,
      salaryId: req.body.salaryId || null,
      reconciled: req.body.reconciled || false,
      notes: req.body.notes || "",
      tenantId: req.tenantId,
      createdBy: req.userId,
    };

    const tx = await prisma.bankTransaction.create({
      data: txData,
      include: { account: { select: { id: true, name: true } } },
    });

    const result = addId(tx);
    if (result.account) {
      result.accountId = addId(result.account);
      delete result.account;
    }
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update transaction
router.put("/:id", async (req, res) => {
  try {
    const old = await prisma.bankTransaction.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!old) return res.status(404).json({ error: "Transaction introuvable" });

    // If amount changed, reverse old and apply new
    const newAmount = req.body.amount != null ? req.body.amount : old.amount;
    if (newAmount !== old.amount) {
      const diff = newAmount - old.amount;
      if (old.type === "entree") {
        await prisma.bankAccount.update({
          where: { id: old.accountId },
          data: { balance: { increment: diff } },
        });
      } else if (old.type === "sortie") {
        await prisma.bankAccount.update({
          where: { id: old.accountId },
          data: { balance: { decrement: diff } },
        });
      } else if (old.type === "virement") {
        await prisma.bankAccount.update({
          where: { id: old.accountId },
          data: { balance: { decrement: diff } },
        });
        if (old.toAccountId) {
          await prisma.bankAccount.update({
            where: { id: old.toAccountId },
            data: { balance: { increment: diff } },
          });
        }
      }
    }

    const updateData = { ...req.body };
    if (updateData.date) updateData.date = new Date(updateData.date);

    const tx = await prisma.bankTransaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    });

    const result = addId(tx);
    if (result.account) {
      result.accountId = addId(result.account);
      delete result.account;
    }
    if (result.toAccount) {
      result.toAccountId = addId(result.toAccount);
      delete result.toAccount;
    }
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Transaction introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// PUT reconcile single
router.put("/:id/reconcile", async (req, res) => {
  try {
    const existing = await prisma.bankTransaction.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Transaction introuvable" });
    const tx = await prisma.bankTransaction.update({
      where: { id: req.params.id },
      data: { reconciled: true, reconciledAt: new Date() },
      include: { account: { select: { id: true, name: true } } },
    });
    if (!tx) return res.status(404).json({ error: "Transaction introuvable" });
    const result = addId(tx);
    if (result.account) {
      result.accountId = addId(result.account);
      delete result.account;
    }
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Transaction introuvable" });
    res.status(500).json({ error: e.message });
  }
});

// PUT reconcile batch
router.put("/reconcile-batch", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: "Aucun ID fourni" });
    await prisma.bankTransaction.updateMany({
      where: { id: { in: ids }, tenantId: req.tenantId },
      data: { reconciled: true, reconciledAt: new Date() },
    });
    res.json({ success: true, count: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE transaction (reverse balance)
router.delete("/:id", async (req, res) => {
  try {
    const tx = await prisma.bankTransaction.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!tx) return res.status(404).json({ error: "Transaction introuvable" });

    // Reverse balance effect
    if (tx.type === "entree") {
      await prisma.bankAccount.update({
        where: { id: tx.accountId },
        data: { balance: { decrement: tx.amount } },
      });
    } else if (tx.type === "sortie") {
      await prisma.bankAccount.update({
        where: { id: tx.accountId },
        data: { balance: { increment: tx.amount } },
      });
    } else if (tx.type === "virement") {
      await prisma.bankAccount.update({
        where: { id: tx.accountId },
        data: { balance: { increment: tx.amount } },
      });
      if (tx.toAccountId) {
        await prisma.bankAccount.update({
          where: { id: tx.toAccountId },
          data: { balance: { decrement: tx.amount } },
        });
      }
    }

    await prisma.bankTransaction.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Transaction introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
