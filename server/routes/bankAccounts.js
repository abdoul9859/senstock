const router = require("express").Router();
const prisma = require("../db");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET all accounts
router.get("/", async (req, res) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { tenantId: req.tenantId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json(accounts.map(addId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single account
router.get("/:id", async (req, res) => {
  try {
    const account = await prisma.bankAccount.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!account) return res.status(404).json({ error: "Compte introuvable" });
    res.json(addId(account));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create account
router.post("/", async (req, res) => {
  try {
    // If setting as default, unset others
    if (req.body.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { tenantId: req.tenantId },
        data: { isDefault: false },
      });
    }
    const account = await prisma.bankAccount.create({
      data: {
        ...req.body,
        balance: req.body.balance || 0,
        tenantId: req.tenantId,
        createdBy: req.userId,
      },
    });
    res.status(201).json(addId(account));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update account
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.bankAccount.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Compte introuvable" });
    // If setting as default, unset others
    if (req.body.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { id: { not: req.params.id }, tenantId: req.tenantId },
        data: { isDefault: false },
      });
    }
    const account = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(addId(account));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Compte introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE account (only if no transactions)
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.bankAccount.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Compte introuvable" });
    const txCount = await prisma.bankTransaction.count({
      where: {
        tenantId: req.tenantId,
        OR: [
          { accountId: req.params.id },
          { toAccountId: req.params.id },
        ],
      },
    });
    if (txCount > 0) {
      return res.status(400).json({ error: "Impossible de supprimer un compte avec des transactions" });
    }
    const account = await prisma.bankAccount.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Compte introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
