const express = require("express");
const prisma = require("../db");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// ─── BOARDS ───

// GET /api/tasks/boards
router.get("/boards", async (req, res) => {
  try {
    const boards = await prisma.taskBoard.findMany({
      where: { tenantId: req.tenantId, archived: false },
      include: {
        columns: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { cards: true } },
          },
        },
        labels: true,
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(addId(boards));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// POST /api/tasks/boards
router.post("/boards", async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const board = await prisma.taskBoard.create({
      data: {
        name,
        description: description || "",
        color: color || "#10b981",
        tenantId: req.tenantId,
        createdBy: req.userId,
        columns: {
          create: [
            { name: "A faire", color: "#6b7280", sortOrder: 0 },
            { name: "En cours", color: "#f59e0b", sortOrder: 1 },
            { name: "Terminé", color: "#10b981", sortOrder: 2 },
          ],
        },
      },
      include: { columns: { orderBy: { sortOrder: "asc" } }, labels: true },
    });
    res.json(addId(board));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// GET /api/tasks/boards/:id
router.get("/boards/:id", async (req, res) => {
  try {
    const board = await prisma.taskBoard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        columns: {
          orderBy: { sortOrder: "asc" },
          include: {
            cards: {
              orderBy: { sortOrder: "asc" },
              include: {
                labels: { include: { label: true } },
                checklist: { orderBy: { sortOrder: "asc" } },
                comments: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        },
        labels: true,
      },
    });
    if (!board) return res.status(404).json({ error: "Tableau non trouvé" });
    res.json(addId(board));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/boards/:id
router.put("/boards/:id", async (req, res) => {
  try {
    const { name, description, color, archived } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (color !== undefined) data.color = color;
    if (archived !== undefined) data.archived = archived;

    const existing = await prisma.taskBoard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Tableau non trouvé" });

    const board = await prisma.taskBoard.update({
      where: { id: req.params.id },
      data,
    });
    res.json(addId(board));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/boards/:id
router.delete("/boards/:id", async (req, res) => {
  try {
    const existing = await prisma.taskBoard.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: "Tableau non trouvé" });
    await prisma.taskBoard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── COLUMNS ───

// POST /api/tasks/boards/:boardId/columns
router.post("/boards/:boardId/columns", async (req, res) => {
  try {
    const maxOrder = await prisma.taskColumn.aggregate({
      where: { boardId: req.params.boardId },
      _max: { sortOrder: true },
    });
    const column = await prisma.taskColumn.create({
      data: {
        boardId: req.params.boardId,
        name: req.body.name || "Nouvelle colonne",
        color: req.body.color || "",
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.json(addId(column));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/columns/:id
router.put("/columns/:id", async (req, res) => {
  try {
    const { name, color, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const column = await prisma.taskColumn.update({
      where: { id: req.params.id },
      data,
    });
    res.json(addId(column));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/columns/:id
router.delete("/columns/:id", async (req, res) => {
  try {
    await prisma.taskColumn.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/columns/reorder — reorder columns
router.put("/columns/reorder", async (req, res) => {
  try {
    const { columns } = req.body; // [{ id, sortOrder }]
    await Promise.all(
      columns.map((c) =>
        prisma.taskColumn.update({ where: { id: c.id }, data: { sortOrder: c.sortOrder } })
      )
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── CARDS ───

// POST /api/tasks/columns/:columnId/cards
router.post("/columns/:columnId/cards", async (req, res) => {
  try {
    const maxOrder = await prisma.taskCard.aggregate({
      where: { columnId: req.params.columnId },
      _max: { sortOrder: true },
    });
    const { title, description, priority, dueDate, assignee } = req.body;
    const card = await prisma.taskCard.create({
      data: {
        columnId: req.params.columnId,
        title,
        description: description || "",
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignee: assignee || "",
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        tenantId: req.tenantId,
        createdBy: req.userId,
      },
      include: {
        labels: { include: { label: true } },
        checklist: true,
        comments: true,
      },
    });
    res.json(addId(card));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/cards/:id
router.put("/cards/:id", async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignee, columnId, sortOrder, completed } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignee !== undefined) data.assignee = assignee;
    if (columnId !== undefined) data.columnId = columnId;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (completed !== undefined) {
      data.completed = completed;
      data.completedAt = completed ? new Date() : null;
    }

    const card = await prisma.taskCard.update({
      where: { id: req.params.id },
      data,
      include: {
        labels: { include: { label: true } },
        checklist: true,
        comments: true,
      },
    });
    res.json(addId(card));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/cards/:id
router.delete("/cards/:id", async (req, res) => {
  try {
    await prisma.taskCard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/cards/move — move card to another column or reorder
router.put("/cards/move", async (req, res) => {
  try {
    const { cardId, columnId, sortOrder } = req.body;
    const card = await prisma.taskCard.update({
      where: { id: cardId },
      data: { columnId, sortOrder },
    });
    res.json(addId(card));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── LABELS ───

// POST /api/tasks/boards/:boardId/labels
router.post("/boards/:boardId/labels", async (req, res) => {
  try {
    const label = await prisma.taskLabel.create({
      data: {
        boardId: req.params.boardId,
        name: req.body.name,
        color: req.body.color || "#6366f1",
      },
    });
    res.json(addId(label));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/cards/:cardId/labels — toggle label on card
router.put("/cards/:cardId/labels", async (req, res) => {
  try {
    const { labelId } = req.body;
    const existing = await prisma.taskCardLabel.findFirst({
      where: { cardId: req.params.cardId, labelId },
    });
    if (existing) {
      await prisma.taskCardLabel.delete({ where: { id: existing.id } });
    } else {
      await prisma.taskCardLabel.create({
        data: { cardId: req.params.cardId, labelId },
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/labels/:id
router.delete("/labels/:id", async (req, res) => {
  try {
    await prisma.taskLabel.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── CHECKLIST ───

// POST /api/tasks/cards/:cardId/checklist
router.post("/cards/:cardId/checklist", async (req, res) => {
  try {
    const maxOrder = await prisma.taskChecklist.aggregate({
      where: { cardId: req.params.cardId },
      _max: { sortOrder: true },
    });
    const item = await prisma.taskChecklist.create({
      data: {
        cardId: req.params.cardId,
        text: req.body.text,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.json(addId(item));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// PUT /api/tasks/checklist/:id
router.put("/checklist/:id", async (req, res) => {
  try {
    const data = {};
    if (req.body.text !== undefined) data.text = req.body.text;
    if (req.body.checked !== undefined) data.checked = req.body.checked;
    const item = await prisma.taskChecklist.update({
      where: { id: req.params.id },
      data,
    });
    res.json(addId(item));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/checklist/:id
router.delete("/checklist/:id", async (req, res) => {
  try {
    await prisma.taskChecklist.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── COMMENTS ───

// POST /api/tasks/cards/:cardId/comments
router.post("/cards/:cardId/comments", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const comment = await prisma.taskComment.create({
      data: {
        cardId: req.params.cardId,
        text: req.body.text,
        author: user?.name || "Inconnu",
      },
    });
    res.json(addId(comment));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/tasks/comments/:id
router.delete("/comments/:id", async (req, res) => {
  try {
    await prisma.taskComment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── AGENDA ───

// GET /api/tasks/agenda?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/agenda", async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {
      tenantId: req.tenantId,
      dueDate: { not: null },
    };
    if (start) where.dueDate.gte = new Date(start);
    if (end) where.dueDate.lte = new Date(end);

    const cards = await prisma.taskCard.findMany({
      where,
      include: {
        column: {
          include: {
            board: { select: { id: true, name: true, color: true } },
          },
        },
        labels: { include: { label: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    res.json(cards.map((c) => ({
      ...addId(c),
      boardName: c.column?.board?.name || "",
      boardColor: c.column?.board?.color || "#6b7280",
      boardId: c.column?.board?.id || "",
      columnName: c.column?.name || "",
    })));
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── NOTIFICATION COUNT ───

// GET /api/tasks/notification-count — count of overdue + due-today + urgent tasks
router.get("/notification-count", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [overdueCount, dueTodayCount, urgentCount] = await Promise.all([
      prisma.taskCard.count({
        where: {
          tenantId: req.tenantId,
          completed: false,
          dueDate: { lt: todayStart },
        },
      }),
      prisma.taskCard.count({
        where: {
          tenantId: req.tenantId,
          completed: false,
          dueDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.taskCard.count({
        where: {
          tenantId: req.tenantId,
          completed: false,
          priority: "urgent",
        },
      }),
    ]);

    res.json({
      overdue: overdueCount,
      dueToday: dueTodayCount,
      urgent: urgentCount,
      total: overdueCount + dueTodayCount + urgentCount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// ─── STATS ───

// GET /api/tasks/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalBoards, totalCards, completedCards, urgentCards, overdueCards] = await Promise.all([
      prisma.taskBoard.count({ where: { tenantId: req.tenantId, archived: false } }),
      prisma.taskCard.count({ where: { tenantId: req.tenantId } }),
      prisma.taskCard.count({ where: { tenantId: req.tenantId, completed: true } }),
      prisma.taskCard.count({ where: { tenantId: req.tenantId, priority: "urgent", completed: false } }),
      prisma.taskCard.count({
        where: {
          tenantId: req.tenantId,
          completed: false,
          dueDate: { lt: new Date() },
        },
      }),
    ]);
    res.json({ totalBoards, totalCards, completedCards, urgentCards, overdueCards });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

module.exports = router;
