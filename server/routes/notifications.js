const router = require("express").Router();
const prisma = require("../db");

// GET notifications for current user
router.get("/", async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        tenantId: req.tenantId,
        OR: [
          { userId: req.userId },
          { userId: null }, // tenant-wide notifications
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications.map((n) => ({ ...n, _id: n.id })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET unread count
router.get("/unread-count", async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        tenantId: req.tenantId,
        read: false,
        OR: [
          { userId: req.userId },
          { userId: null },
        ],
      },
    });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT mark as read
router.put("/:id/read", async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT mark all as read
router.put("/read-all", async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        tenantId: req.tenantId,
        read: false,
        OR: [
          { userId: req.userId },
          { userId: null },
        ],
      },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
