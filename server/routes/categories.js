const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const router = express.Router();

// Backwards compat: add _id alias
function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/categories — list all (tenant-scoped)
router.get("/", async (req, res) => {
  try {
    const where = { deleted: false, tenantId: req.tenantId };
    const categories = await prisma.category.findMany({
      where,
      include: { attributes: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(categories.map(addId));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/categories — create (tenant-scoped)
router.post("/", async (req, res) => {
  try {
    const { name, description, hasVariants, attributes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    // Check for active duplicate within same tenant
    const exists = await prisma.category.findFirst({
      where: { tenantId: req.tenantId, name: name.trim(), deleted: false },
    });
    if (exists) {
      return res.status(409).json({ error: "Une catégorie avec ce nom existe déjà" });
    }

    // Restore if a deleted one exists with same name (same tenant), otherwise create
    const deletedExisting = await prisma.category.findFirst({
      where: { tenantId: req.tenantId, name: name.trim(), deleted: true },
    });

    let category;
    if (deletedExisting) {
      // First delete old attributes, then update
      await prisma.categoryAttribute.deleteMany({ where: { categoryId: deletedExisting.id } });
      category = await prisma.category.update({
        where: { id: deletedExisting.id },
        data: {
          deleted: false,
          deletedAt: null,
          description: description || "",
          hasVariants: !!hasVariants,
          createdBy: req.userId,
          attributes: {
            create: (attributes || []).map((attr, i) => ({
              name: attr.name,
              type: attr.type || "text",
              options: attr.options || [],
              required: !!attr.required,
              sortOrder: attr.sortOrder ?? i,
            })),
          },
        },
        include: { attributes: true },
      });
    } else {
      category = await prisma.category.create({
        data: {
          name: name.trim(),
          description: description || "",
          hasVariants: !!hasVariants,
          tenantId: req.tenantId,
          createdBy: req.userId,
          attributes: {
            create: (attributes || []).map((attr, i) => ({
              name: attr.name,
              type: attr.type || "text",
              options: attr.options || [],
              required: !!attr.required,
              sortOrder: attr.sortOrder ?? i,
            })),
          },
        },
        include: { attributes: true },
      });
    }

    res.status(201).json(addId(category));
  } catch (err) {
    logger.error("POST /api/categories error:", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/categories/:id — update
router.put("/:id", async (req, res) => {
  try {
    const { name, description, hasVariants, attributes } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    // Verify category belongs to tenant
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    if (name) {
      const exists = await prisma.category.findFirst({
        where: { tenantId: req.tenantId, name: name.trim(), id: { not: req.params.id }, deleted: false },
      });
      if (exists) {
        return res.status(409).json({ error: "Une catégorie avec ce nom existe déjà" });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (hasVariants !== undefined) updateData.hasVariants = hasVariants;

    // Handle attributes: delete old and create new
    if (attributes !== undefined) {
      await prisma.categoryAttribute.deleteMany({ where: { categoryId: req.params.id } });
      updateData.attributes = {
        create: (attributes || []).map((attr, i) => ({
          name: attr.name,
          type: attr.type || "text",
          options: attr.options || [],
          required: !!attr.required,
          sortOrder: attr.sortOrder ?? i,
        })),
      };
    }

    const category = await prisma.category.update({
      where: { id: existing.id },
      data: updateData,
      include: { attributes: true },
    });

    res.json(addId(category));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/categories/:id — delete
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    await prisma.category.update({
      where: { id: existing.id },
      data: { deleted: true, deletedAt: new Date() },
    });

    res.json({ message: "Categorie deplacee dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
