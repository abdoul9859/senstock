const express = require("express");
const prisma = require("../db");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /stats - Leave statistics for this year
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const leaves = await prisma.leave.findMany({
      where: {
        tenantId: req.tenantId,
        startDate: { gte: startOfYear },
      },
    });

    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === "en_attente").length;
    const approved = leaves.filter((l) => l.status === "approuve").length;
    const refused = leaves.filter((l) => l.status === "refuse").length;

    res.json({ total, pending, approved, refused });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET / - List leaves for tenant
router.get("/", async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.employeeId) where.employeeId = req.query.employeeId;

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { startDate: "desc" },
    });

    res.json(
      leaves.map((l) => {
        const result = addId(l);
        if (result.employee) result.employee = addId(result.employee);
        return result;
      })
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / - Create leave
router.post("/", async (req, res) => {
  try {
    const { employeeId, type, startDate, endDate, days, reason } = req.body;
    const leave = await prisma.leave.create({
      data: {
        employeeId,
        type: type || "conge_paye",
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: days || 1,
        reason: reason || "",
        tenantId: req.tenantId,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const result = addId(leave);
    if (result.employee) result.employee = addId(result.employee);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /:id/approve - Approve leave
router.put("/:id/approve", async (req, res) => {
  try {
    const existing = await prisma.leave.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Conge introuvable" });

    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: "approuve", approvedBy: req.userId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const result = addId(leave);
    if (result.employee) result.employee = addId(result.employee);
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Conge introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// PUT /:id/refuse - Refuse leave
router.put("/:id/refuse", async (req, res) => {
  try {
    const existing = await prisma.leave.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Conge introuvable" });

    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: { status: "refuse" },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const result = addId(leave);
    if (result.employee) result.employee = addId(result.employee);
    res.json(result);
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Conge introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE /:id - Delete leave (only if en_attente)
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.leave.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Conge introuvable" });
    if (existing.status !== "en_attente") {
      return res.status(400).json({ error: "Seuls les conges en attente peuvent etre supprimes" });
    }

    await prisma.leave.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Conge introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
