const express = require("express");
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatItem(item) {
  if (!item) return item;
  const obj = addId(item);
  if (obj.invoice) {
    obj.invoice = addId(obj.invoice);
    if (obj.invoice.client) obj.invoice.client = addId(obj.invoice.client);
  }
  if (obj.label) obj.label = addId(obj.label);
  if (obj.maintenanceTicket) obj.maintenanceTicket = addId(obj.maintenanceTicket);
  return obj;
}

// GET /api/exchange-items/stats — count by disposition
router.get("/stats", async (req, res) => {
  try {
    const baseWhere = {
      addToStock: true,
      invoice: { tenantId: req.tenantId, deleted: false },
    };

    const [total, revente, maintenance, pending] = await Promise.all([
      prisma.exchangeItem.count({ where: baseWhere }),
      prisma.exchangeItem.count({ where: { ...baseWhere, disposition: "revente" } }),
      prisma.exchangeItem.count({ where: { ...baseWhere, disposition: "maintenance" } }),
      prisma.exchangeItem.count({ where: { ...baseWhere, disposition: null } }),
    ]);

    res.json({ total, revente, maintenance, pending });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/exchange-items — list all exchange items that were added to stock
router.get("/", async (req, res) => {
  try {
    const { disposition } = req.query;
    const where = {
      addToStock: true,
      invoice: { tenantId: req.tenantId, deleted: false },
    };
    if (disposition === "pending") {
      where.disposition = null;
    } else if (disposition && disposition !== "all") {
      where.disposition = disposition;
    }

    const items = await prisma.exchangeItem.findMany({
      where,
      include: {
        invoice: { include: { client: true } },
        label: true,
        maintenanceTicket: { select: { id: true, number: true, status: true } },
      },
      orderBy: { invoice: { createdAt: "desc" } },
    });

    // Enrich items with product info when productId is available
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, brand: true, model: true, image: true, variants: { select: { id: true, serialNumber: true, barcode: true, condition: true } } },
        })
      : [];
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const enriched = items.map((item) => {
      const formatted = formatItem(item);
      if (item.productId && productMap[item.productId]) {
        const prod = productMap[item.productId];
        formatted.product = addId(prod);
        if (item.variantId) {
          const variant = prod.variants?.find((v) => v.id === item.variantId);
          if (variant) formatted.variant = addId(variant);
        }
      }
      return formatted;
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/exchange-items/:id/disposition — update disposition
router.patch("/:id/disposition", async (req, res) => {
  try {
    const { disposition, maintenanceTicketId } = req.body; // disposition: "revente" | "maintenance" | null

    // Verify item belongs to this tenant via invoice
    const item = await prisma.exchangeItem.findFirst({
      where: { id: req.params.id, invoice: { tenantId: req.tenantId } },
      include: { invoice: { include: { client: true } } },
    });
    if (!item) return res.status(404).json({ error: "Item introuvable" });

    const updateData = { disposition: disposition || null };

    // If setting to maintenance, optionally link or auto-create a ticket
    if (disposition === "maintenance") {
      if (maintenanceTicketId) {
        // Link to an existing ticket
        updateData.maintenanceTicketId = maintenanceTicketId;
      } else if (!item.maintenanceTicketId) {
        // Auto-create a maintenance ticket
        const seq = await getNextSequence("maintenance");
        const number = `MNT-${String(seq).padStart(4, "0")}`;
        const client = item.invoice.client;

        const ticket = await prisma.maintenanceTicket.create({
          data: {
            number,
            tenantId: req.tenantId,
            createdBy: req.userId,
            deviceName: item.description,
            variantId: item.variantId || undefined,
            clientName: client?.name || "Client inconnu",
            clientPhone: client?.phone || "",
            clientEmail: client?.email || "",
            issueDescription: req.body.issueDescription || "Produit repris - a diagnostiquer",
            conditionAtReception: req.body.conditionAtReception || "moyen",
            priority: req.body.priority || "normale",
            status: "recu",
          },
        });
        updateData.maintenanceTicketId = ticket.id;
      }
    } else {
      // If changing away from maintenance, unlink the ticket
      updateData.maintenanceTicketId = null;
    }

    const updated = await prisma.exchangeItem.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        invoice: { include: { client: true } },
        label: true,
        maintenanceTicket: { select: { id: true, number: true, status: true } },
      },
    });

    res.json(formatItem(updated));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/exchange-items/:id/create-maintenance — create a maintenance ticket from an exchange item
router.post("/:id/create-maintenance", async (req, res) => {
  try {
    // Verify item belongs to this tenant
    const item = await prisma.exchangeItem.findFirst({
      where: { id: req.params.id, invoice: { tenantId: req.tenantId } },
      include: { invoice: { include: { client: true } } },
    });
    if (!item) return res.status(404).json({ error: "Item introuvable" });

    if (item.maintenanceTicketId) {
      return res.status(400).json({ error: "Un ticket maintenance existe deja pour cet item" });
    }

    const seq = await getNextSequence("maintenance");
    const number = `MNT-${String(seq).padStart(4, "0")}`;

    const {
      issueDescription,
      conditionAtReception,
      accessories,
      estimatedCost,
      priority,
    } = req.body;

    const client = item.invoice.client;

    const ticket = await prisma.maintenanceTicket.create({
      data: {
        number,
        tenantId: req.tenantId,
        createdBy: req.userId,
        deviceName: item.description,
        variantId: item.variantId || undefined,
        clientName: client?.name || req.body.clientName || "Client inconnu",
        clientPhone: client?.phone || req.body.clientPhone || "",
        clientEmail: client?.email || req.body.clientEmail || "",
        issueDescription: issueDescription || "",
        conditionAtReception: conditionAtReception || "moyen",
        accessories: accessories || "",
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : 0,
        priority: priority || "normale",
        status: "recu",
      },
    });

    // Link exchange item to ticket and set disposition
    await prisma.exchangeItem.update({
      where: { id: item.id },
      data: {
        disposition: "maintenance",
        maintenanceTicketId: ticket.id,
      },
    });

    res.status(201).json({ ...addId(ticket), _id: ticket.id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
