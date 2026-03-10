const router = require("express").Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatRequest(r) {
  if (!r) return r;
  const obj = addId(r);
  if (obj.items) obj.items = addId(obj.items);
  if (obj.client) obj.client = addId(obj.client);
  return obj;
}

// GET next number
router.get("/next-number", async (_req, res) => {
  try {
    const seq = await getNextSequence("client_request");
    const number = `DEM-${String(seq).padStart(4, "0")}`;
    res.json({ number });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all
router.get("/", async (req, res) => {
  try {
    const requests = await prisma.clientRequest.findMany({
      where: { tenantId: req.tenantId },
      include: { client: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests.map(formatRequest));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const r = await prisma.clientRequest.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { client: true, items: true },
    });
    if (!r) return res.status(404).json({ error: "Demande introuvable" });
    res.json(formatRequest(r));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create
router.post("/", async (req, res) => {
  try {
    const seq = await getNextSequence("client_request");
    const number = `DEM-${String(seq).padStart(4, "0")}`;

    const { client, items, status, priority, date, dueDate, notes, convertedToType, convertedToId, convertedToNumber } = req.body;

    const r = await prisma.clientRequest.create({
      data: {
        tenantId: req.tenantId,
        number,
        status: status || "nouvelle",
        priority: priority || "normale",
        clientId: client || undefined,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes || "",
        convertedToType: convertedToType || undefined,
        convertedToId: convertedToId || undefined,
        convertedToNumber: convertedToNumber || undefined,
        createdBy: req.userId,
        items: {
          create: (items || []).map((item) => ({
            description: item.description || "",
            quantity: item.quantity || 1,
            notes: item.notes || "",
          })),
        },
      },
      include: { client: true, items: true },
    });
    res.status(201).json(formatRequest(r));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.clientRequest.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Demande introuvable" });

    const data = {};
    const flatFields = ["status", "priority", "date", "dueDate", "notes", "convertedToType", "convertedToId", "convertedToNumber"];
    for (const key of flatFields) {
      if (req.body[key] !== undefined) {
        if (key === "date" || key === "dueDate") {
          data[key] = req.body[key] ? new Date(req.body[key]) : undefined;
        } else {
          data[key] = req.body[key];
        }
      }
    }
    if (req.body.client !== undefined) {
      data.clientId = req.body.client || undefined;
    }

    // Handle items update
    if (req.body.items !== undefined) {
      await prisma.clientRequestItem.deleteMany({ where: { requestId: req.params.id } });
      if (req.body.items && req.body.items.length > 0) {
        await prisma.clientRequestItem.createMany({
          data: req.body.items.map((item) => ({
            requestId: req.params.id,
            description: item.description || "",
            quantity: item.quantity || 1,
            notes: item.notes || "",
          })),
        });
      }
    }

    await prisma.clientRequest.update({
      where: { id: req.params.id },
      data,
    });

    const r = await prisma.clientRequest.findUnique({
      where: { id: req.params.id },
      include: { client: true, items: true },
    });
    res.json(formatRequest(r));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const r = await prisma.clientRequest.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!r) return res.status(404).json({ error: "Demande introuvable" });
    // Delete items first (cascade should handle it, but be explicit)
    await prisma.clientRequestItem.deleteMany({ where: { requestId: req.params.id } });
    await prisma.clientRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
