const express = require("express");
const prisma = require("../db");
const router = express.Router();

// GET /api/product-labels — liste toutes les étiquettes du tenant
router.get("/", async (req, res) => {
  try {
    const labels = await prisma.productLabel.findMany({
      where: { tenantId: req.tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(labels);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/product-labels — créer une étiquette
router.post("/", async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    const label = await prisma.productLabel.create({
      data: {
        name: name.trim(),
        description: description || "",
        color: color || "#6366f1",
        tenantId: req.tenantId,
      },
    });
    res.status(201).json(label);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/product-labels/:id — modifier une étiquette
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.productLabel.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Étiquette non trouvée" });

    const { name, description, color } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (color !== undefined) update.color = color;

    const label = await prisma.productLabel.update({
      where: { id: req.params.id },
      data: update,
    });
    res.json(label);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/product-labels/:id — supprimer une étiquette
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.productLabel.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Étiquette non trouvée" });

    await prisma.productLabel.delete({ where: { id: req.params.id } });
    res.json({ message: "Étiquette supprimée" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/product-labels/:id/products — assigner des produits à une étiquette
router.post("/:id/products", async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: "productIds doit être un tableau" });
    }
    const label = await prisma.productLabel.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!label) return res.status(404).json({ error: "Étiquette non trouvée" });

    await prisma.productLabelItem.createMany({
      data: productIds.map((pid) => ({ productId: pid, labelId: req.params.id })),
      skipDuplicates: true,
    });
    res.json({ message: "Produits assignés" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/product-labels/:id/products/:productId — retirer un produit d'une étiquette
router.delete("/:id/products/:productId", async (req, res) => {
  try {
    await prisma.productLabelItem.deleteMany({
      where: { labelId: req.params.id, productId: req.params.productId },
    });
    res.json({ message: "Produit retiré de l'étiquette" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
