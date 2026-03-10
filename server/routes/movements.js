const express = require("express");
const prisma = require("../db");
const router = express.Router();

// Backwards compat: add _id alias
function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// GET /api/movements — list movements with optional filters
router.get("/", async (req, res) => {
  try {
    const { limit = 100, offset = 0, type, search } = req.query;

    const where = { tenantId: req.tenantId };
    if (type) where.type = type;
    if (search) {
      where.productName = { contains: search, mode: 'insensitive' };
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    // Fetch user names for movements that have a userId
    const userIds = [...new Set(movements.filter((m) => m.userId).map((m) => m.userId))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, { _id: u.id, id: u.id, name: u.name }]));

    const movementsWithUser = movements.map((m) => ({
      ...m,
      _id: m.id,
      user: m.userId ? (userMap[m.userId] || null) : null,
    }));

    res.json({ movements: movementsWithUser, total });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
