const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatSalary(salary) {
  if (!salary) return salary;
  const result = addId(salary);
  if (result.employee) result.employee = addId(result.employee);
  if (result.bonuses) result.bonuses = result.bonuses.map(addId);
  if (result.deductions) result.deductions = result.deductions.map(addId);
  return result;
}

const salaryInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, position: true, department: true, phone: true },
  },
  bonuses: true,
  deductions: true,
};

// GET all salaries
router.get("/", async (req, res) => {
  try {
    const salaries = await prisma.salary.findMany({
      where: { tenantId: req.tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
        bonuses: true,
        deductions: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(salaries.map(formatSalary));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET stats
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const all = await prisma.salary.findMany({ where: { tenantId: req.tenantId } });
    const currentMonth = all.filter((s) => s.period === currentPeriod);
    const activeEmployees = await prisma.employee.count({ where: { status: "actif", tenantId: req.tenantId } });

    const stats = {
      activeEmployees,
      currentMonthTotal: currentMonth.reduce((s, sal) => s + sal.netSalary, 0),
      currentMonthPaid: currentMonth.filter((s) => s.status === "payee").length,
      currentMonthPending: currentMonth.filter((s) => s.status === "en_attente").length,
      totalPaidAllTime: all
        .filter((s) => s.status === "payee")
        .reduce((s, sal) => s + sal.netSalary, 0),
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST generate salaries for a period
router.post("/generate", async (req, res) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ error: "Periode requise" });

    const activeEmployees = await prisma.employee.findMany({
      where: { status: "actif", tenantId: req.tenantId },
    });
    const existing = await prisma.salary.findMany({
      where: { period, tenantId: req.tenantId },
      select: { employeeId: true },
    });
    const existingIds = new Set(existing.map((s) => s.employeeId));

    const toCreate = activeEmployees.filter(
      (emp) => !existingIds.has(emp.id)
    );

    const created = [];
    for (const emp of toCreate) {
      const seq = await getNextSequence("salary");
      const number = `SAL-${String(seq).padStart(4, "0")}`;
      const salary = await prisma.salary.create({
        data: {
          number,
          employeeId: emp.id,
          period,
          baseSalary: emp.baseSalary || 0,
          totalBonuses: 0,
          totalDeductions: 0,
          netSalary: emp.baseSalary || 0,
          tenantId: req.tenantId,
          createdBy: req.userId,
        },
      });
      created.push(salary);
    }

    res.json({
      created: created.length,
      skipped: existingIds.size,
      message: `${created.length} fiches creees, ${existingIds.size} deja existantes`,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET single salary
router.get("/:id", async (req, res) => {
  try {
    const salary = await prisma.salary.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: salaryInclude,
    });
    if (!salary) return res.status(404).json({ error: "Fiche introuvable" });
    res.json(formatSalary(salary));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create single salary
router.post("/", async (req, res) => {
  try {
    const seq = await getNextSequence("salary");
    const number = `SAL-${String(seq).padStart(4, "0")}`;

    const bonuses = req.body.bonuses || [];
    const deductions = req.body.deductions || [];
    const totalBonuses = bonuses.reduce((s, b) => s + (b.amount || 0), 0);
    const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
    const netSalary = (req.body.baseSalary || 0) + totalBonuses - totalDeductions;

    const salary = await prisma.salary.create({
      data: {
        number,
        employeeId: req.body.employee || req.body.employeeId,
        period: req.body.period,
        baseSalary: req.body.baseSalary || 0,
        totalBonuses,
        totalDeductions,
        netSalary,
        paymentMethod: req.body.paymentMethod || "especes",
        notes: req.body.notes || "",
        status: req.body.status || "en_attente",
        tenantId: req.tenantId,
        createdBy: req.userId,
        bonuses: {
          create: bonuses.map((b) => ({
            label: b.label || "",
            amount: b.amount || 0,
          })),
        },
        deductions: {
          create: deductions.map((d) => ({
            label: d.label || "",
            amount: d.amount || 0,
          })),
        },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
        bonuses: true,
        deductions: true,
      },
    });
    res.status(201).json(formatSalary(salary));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update salary
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.salary.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Fiche introuvable" });
    const bonuses = req.body.bonuses || [];
    const deductions = req.body.deductions || [];
    const totalBonuses = bonuses.reduce((s, b) => s + (b.amount || 0), 0);
    const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
    const netSalary = (req.body.baseSalary || 0) + totalBonuses - totalDeductions;

    // Delete existing bonuses/deductions and recreate
    await prisma.salaryBonus.deleteMany({ where: { salaryId: req.params.id } });
    await prisma.salaryDeduction.deleteMany({ where: { salaryId: req.params.id } });

    const salary = await prisma.salary.update({
      where: { id: req.params.id },
      data: {
        baseSalary: req.body.baseSalary,
        totalBonuses,
        totalDeductions,
        netSalary,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        status: req.body.status,
        period: req.body.period,
        bonuses: {
          create: bonuses.map((b) => ({
            label: b.label || "",
            amount: b.amount || 0,
          })),
        },
        deductions: {
          create: deductions.map((d) => ({
            label: d.label || "",
            amount: d.amount || 0,
          })),
        },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
        bonuses: true,
        deductions: true,
      },
    });
    if (!salary) return res.status(404).json({ error: "Fiche introuvable" });
    res.json(formatSalary(salary));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Fiche introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// PUT mark as paid
router.put("/:id/pay", async (req, res) => {
  try {
    const existing = await prisma.salary.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Fiche introuvable" });
    const salary = await prisma.salary.update({
      where: { id: req.params.id },
      data: {
        status: "payee",
        paymentDate: new Date(),
        ...(req.body.paymentMethod ? { paymentMethod: req.body.paymentMethod } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, department: true },
        },
        bonuses: true,
        deductions: true,
      },
    });
    if (!salary) return res.status(404).json({ error: "Fiche introuvable" });
    res.json(formatSalary(salary));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Fiche introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE salary
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.salary.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Fiche introuvable" });
    await prisma.salary.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Fiche introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
