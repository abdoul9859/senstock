const express = require("express");
const prisma = require("../db");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

async function recalculateSupplierRating(supplierId) {
  const ratings = await prisma.supplierRating.findMany({
    where: { supplierId },
  });

  if (ratings.length === 0) {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: { rating: 0, ratingCount: 0 },
    });
    return;
  }

  let totalScore = 0;
  for (const r of ratings) {
    const avg = (r.qualityScore + r.deliveryScore + r.priceScore + r.serviceScore) / 4;
    totalScore += avg;
  }

  const averageRating = Math.round((totalScore / ratings.length) * 100) / 100;

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { rating: averageRating, ratingCount: ratings.length },
  });
}

// GET /:supplierId - Get all ratings for a supplier
router.get("/:supplierId", async (req, res) => {
  try {
    const ratings = await prisma.supplierRating.findMany({
      where: { supplierId: req.params.supplierId, tenantId: req.tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json(ratings.map(addId));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / - Create a rating
router.post("/", async (req, res) => {
  try {
    const { supplierId, qualityScore, deliveryScore, priceScore, serviceScore, comment, orderId } = req.body;

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: req.tenantId, deleted: false },
    });
    if (!supplier) return res.status(404).json({ error: "Fournisseur introuvable" });

    const rating = await prisma.supplierRating.create({
      data: {
        supplierId,
        qualityScore: qualityScore || 3,
        deliveryScore: deliveryScore || 3,
        priceScore: priceScore || 3,
        serviceScore: serviceScore || 3,
        comment: comment || "",
        orderId: orderId || null,
        ratedBy: req.userId || "",
        tenantId: req.tenantId,
      },
    });

    await recalculateSupplierRating(supplierId);

    res.status(201).json(addId(rating));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /:id - Delete a rating and recalculate
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.supplierRating.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Notation introuvable" });

    await prisma.supplierRating.delete({ where: { id: req.params.id } });
    await recalculateSupplierRating(existing.supplierId);

    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Notation introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
