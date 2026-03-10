const express = require("express");
const router = express.Router();
const prisma = require("../db");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function reconstructEmployee(emp) {
  if (!emp) return emp;
  const result = addId(emp);
  result.emergencyContact = {
    name: emp.emergencyName || "",
    phone: emp.emergencyPhone || "",
    relation: emp.emergencyRelation || "",
  };
  return result;
}

// GET all employees
router.get("/", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { deleted: false, tenantId: req.tenantId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    res.json(employees.map(reconstructEmployee));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single employee
router.get("/:id", async (req, res) => {
  try {
    const emp = await prisma.employee.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!emp) return res.status(404).json({ error: "Employe introuvable" });
    res.json(reconstructEmployee(emp));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create employee
router.post("/", async (req, res) => {
  try {
    const { emergencyContact, ...rest } = req.body;
    const data = {
      ...rest,
      tenantId: req.tenantId,
      createdBy: req.userId,
    };
    if (emergencyContact) {
      data.emergencyName = emergencyContact.name || "";
      data.emergencyPhone = emergencyContact.phone || "";
      data.emergencyRelation = emergencyContact.relation || "";
    }
    const emp = await prisma.employee.create({ data });
    res.status(201).json(reconstructEmployee(emp));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update employee
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.employee.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Employe introuvable" });
    const { emergencyContact, ...rest } = req.body;
    const data = { ...rest };
    if (emergencyContact) {
      data.emergencyName = emergencyContact.name || "";
      data.emergencyPhone = emergencyContact.phone || "";
      data.emergencyRelation = emergencyContact.relation || "";
    }
    const emp = await prisma.employee.update({
      where: { id: req.params.id },
      data,
    });
    res.json(reconstructEmployee(emp));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Employe introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE employee (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.employee.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Employe introuvable" });
    const emp = await prisma.employee.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Employe introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
