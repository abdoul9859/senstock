const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const { getNextSequence } = require("../helpers/counter");

const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatNote(note) {
  if (!note) return note;
  const obj = addId(note);
  if (obj.items) obj.items = addId(obj.items);
  if (obj.client) obj.client = addId(obj.client);
  return obj;
}

// GET /api/delivery-notes — list
router.get("/", async (req, res) => {
  try {
    const where = { tenantId: req.tenantId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.invoiceId) where.invoiceId = req.query.invoiceId;
    where.deleted = { not: true };
    const notes = await prisma.deliveryNote.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes.map(formatNote));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/delivery-notes/:id — single
router.get("/:id", async (req, res) => {
  try {
    const note = await prisma.deliveryNote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, brand: true, model: true, image: true },
            },
          },
        },
      },
    });
    if (!note) return res.status(404).json({ error: "Bon de livraison non trouve" });

    const formatted = formatNote(note);
    if (formatted.items) {
      formatted.items = formatted.items.map((item) => {
        const i = { ...item };
        if (i.product) {
          i.product = addId(i.product);
          i.productId = addId(i.product);
        }
        return i;
      });
    }

    res.json(formatted);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/delivery-notes/from-invoice/:invoiceId — generate from invoice
router.post("/from-invoice/:invoiceId", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.invoiceId, tenantId: req.tenantId },
      include: {
        client: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, brand: true, model: true },
            },
          },
        },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Facture non trouvee" });

    // Check if a BL already exists for this invoice
    const existing = await prisma.deliveryNote.findFirst({
      where: { invoiceId: invoice.id, tenantId: req.tenantId },
    });
    if (existing) return res.status(400).json({ error: "Un bon de livraison existe deja pour cette facture", existingId: existing.id });

    // Generate BL number
    const seq = await getNextSequence("delivery_note");
    const number = `BL-${String(seq).padStart(4, "0")}`;

    const deliveryItems = (invoice.items || [])
      .filter((i) => i.type !== "section")
      .map((i, idx) => ({
        type: i.type,
        productId: i.productId || undefined,
        description: i.product
          ? [i.product.name, i.product.brand, i.product.model].filter(Boolean).join(" ")
          : i.description,
        quantity: i.quantity || 1,
        delivered: i.quantity || 1,
        sortOrder: idx,
      }));

    const note = await prisma.deliveryNote.create({
      data: {
        tenantId: req.tenantId,
        number,
        status: "en_preparation",
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientId: invoice.clientId || undefined,
        date: new Date(),
        deliveryAddress: req.body.deliveryAddress || invoice.client?.address || "",
        notes: req.body.notes || "",
        createdBy: req.userId,
        items: {
          create: deliveryItems,
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: true,
      },
    });

    res.status(201).json(formatNote(note));
  } catch (err) {
    logger.error("Delivery note creation error:", { error: err.message });
    res.status(500).json({ error: "Erreur lors de la creation du bon de livraison" });
  }
});

// PUT /api/delivery-notes/:id — update
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.deliveryNote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Bon de livraison non trouve" });

    const data = {};
    const allowed = ["status", "deliveryDate", "deliveryAddress", "notes"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "deliveryDate") {
          data[key] = new Date(req.body[key]);
        } else {
          data[key] = req.body[key];
        }
      }
    }

    // Handle items update
    if (req.body.items !== undefined) {
      await prisma.deliveryItem.deleteMany({ where: { noteId: req.params.id } });
      if (req.body.items && req.body.items.length > 0) {
        await prisma.deliveryItem.createMany({
          data: req.body.items.map((item, idx) => ({
            noteId: req.params.id,
            type: item.type || "product",
            productId: item.productId || undefined,
            description: item.description || "",
            quantity: item.quantity || 1,
            delivered: item.delivered || 0,
            sortOrder: idx,
          })),
        });
      }
    }

    await prisma.deliveryNote.update({
      where: { id: req.params.id },
      data,
    });

    const updated = await prisma.deliveryNote.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: true,
      },
    });
    res.json(formatNote(updated));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/delivery-notes/:id — delete
router.delete("/:id", async (req, res) => {
  try {
    const note = await prisma.deliveryNote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!note) return res.status(404).json({ error: "Bon de livraison non trouve" });
    await prisma.deliveryNote.update({
      where: { id: req.params.id },
      data: { deleted: true, deletedAt: new Date() },
    });
    res.json({ message: "Bon de livraison deplace dans la corbeille" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
