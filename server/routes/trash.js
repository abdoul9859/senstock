const express = require("express");
const prisma = require("../db");

const router = express.Router();

const modelConfig = {
  product: { model: "product", label: "Produit" },
  invoice: { model: "invoice", label: "Facture", include: { client: { select: { name: true } } } },
  quote: { model: "quote", label: "Devis", include: { client: { select: { name: true } } } },
  deliveryNote: { model: "deliveryNote", label: "Bon de livraison", include: { client: { select: { name: true } } } },
  client: { model: "client", label: "Client" },
  supplier: { model: "supplier", label: "Fournisseur" },
  category: { model: "category", label: "Catégorie" },
  employee: { model: "employee", label: "Employé" },
  purchaseOrder: { model: "purchaseOrder", label: "Bon de commande", include: { supplier: { select: { name: true } } } },
};

function logMovement(data) {
  prisma.stockMovement.create({ data }).catch(() => {});
}

// GET /api/trash — list all deleted items
router.get("/", async (req, res) => {
  try {
    const result = {};
    await Promise.all(
      Object.entries(modelConfig).map(async ([key, config]) => {
        const query = { where: { deleted: true, tenantId: req.tenantId }, orderBy: { deletedAt: "desc" } };
        if (config.include) query.include = config.include;
        const items = await prisma[config.model].findMany(query);
        result[key] = items.map((item) => ({ ...item, _id: item.id, _type: key }));
      })
    );
    res.json(result);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/trash/count — total deleted items count
router.get("/count", async (req, res) => {
  try {
    const counts = await Promise.all(
      Object.values(modelConfig).map((config) =>
        prisma[config.model].count({ where: { deleted: true, tenantId: req.tenantId } })
      )
    );
    res.json({ total: counts.reduce((a, b) => a + b, 0) });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/trash/restore — restore a deleted item
router.post("/restore", async (req, res) => {
  try {
    const { type, id } = req.body;
    const config = modelConfig[type];
    if (!config) return res.status(400).json({ error: "Type invalide" });

    const item = await prisma[config.model].findFirst({ where: { id, tenantId: req.tenantId } });
    if (!item || !item.deleted) return res.status(404).json({ error: "Élément non trouvé dans la corbeille" });

    await prisma[config.model].update({
      where: { id },
      data: { deleted: false, deletedAt: null },
    });

    logMovement({
      type: "trash_restore",
      productId: type === "product" ? id : undefined,
      productName: item.name || item.number || item.firstName || "—",
      details: `${config.label} restauré depuis la corbeille`,
      userId: req.userId,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/trash/:type/:id — permanently delete a single item
router.delete("/:type/:id", async (req, res) => {
  try {
    const config = modelConfig[req.params.type];
    if (!config) return res.status(400).json({ error: "Type invalide" });

    const item = await prisma[config.model].findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!item || !item.deleted) return res.status(404).json({ error: "Élément non trouvé dans la corbeille" });

    await prisma[config.model].delete({ where: { id: req.params.id } });

    logMovement({
      type: "trash_permanent_delete",
      productName: item.name || item.number || item.firstName || "—",
      details: `${config.label} supprimé définitivement`,
      userId: req.userId,
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/trash/empty — permanently delete all trashed items
router.delete("/empty", async (req, res) => {
  try {
    const counts = {};
    await Promise.all(
      Object.entries(modelConfig).map(async ([key, config]) => {
        const result = await prisma[config.model].deleteMany({ where: { deleted: true, tenantId: req.tenantId } });
        counts[key] = result.count;
      })
    );

    logMovement({
      type: "trash_empty",
      productName: "Corbeille",
      details: "Corbeille vidée",
      userId: req.userId,
    });

    res.json({ success: true, counts });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
