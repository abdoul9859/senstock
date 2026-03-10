const express = require("express");
const prisma = require("../db");
const router = express.Router();

// Backwards compat: add _id alias
function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/suppliers — list all
router.get("/", async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { deleted: false, tenantId: req.tenantId },
      orderBy: { name: 'asc' },
    });
    res.json(suppliers.map(addId));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/suppliers — create
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        phone: phone || "",
        email: email || "",
        address: address || "",
        notes: notes || "",
        tenantId: req.tenantId,
        createdBy: req.userId,
      },
    });
    res.status(201).json(addId(supplier));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/suppliers/:id — update
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Fournisseur non trouvé" });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;

    const supplier = await prisma.supplier.update({
      where: { id: existing.id },
      data: updateData,
    });
    res.json(addId(supplier));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/suppliers/:id — delete
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Fournisseur non trouvé" });
    }

    await prisma.supplier.update({
      where: { id: existing.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    res.json({ message: "Fournisseur deplace dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
