const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function formatTicket(ticket) {
  if (!ticket) return ticket;
  const result = addId(ticket);
  // Reconstruct nested client object for frontend compat
  result.client = {
    name: ticket.clientName || "",
    phone: ticket.clientPhone || "",
    email: ticket.clientEmail || "",
  };
  if (result.product) result.product = addId(result.product);
  if (result.partsUsed) result.partsUsed = result.partsUsed.map(addId);
  return result;
}

// Status workflow
const statusFlow = {
  recu: ["diagnostic", "annule"],
  diagnostic: ["en_reparation", "annule"],
  en_reparation: ["pret", "annule"],
  pret: ["rendu"],
  rendu: [],
  annule: [],
};

const ticketInclude = {
  product: {
    select: { id: true, name: true, brand: true, model: true, image: true, categoryId: true },
  },
  partsUsed: true,
};

// GET all tickets
router.get("/", async (req, res) => {
  try {
    const tickets = await prisma.maintenanceTicket.findMany({
      where: { tenantId: req.tenantId },
      include: {
        product: {
          select: { id: true, name: true, brand: true, model: true, image: true, categoryId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets.map(formatTicket));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET stats
router.get("/stats", async (req, res) => {
  try {
    const all = await prisma.maintenanceTicket.findMany({ where: { tenantId: req.tenantId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: all.length,
      recu: all.filter((t) => t.status === "recu").length,
      diagnostic: all.filter((t) => t.status === "diagnostic").length,
      en_reparation: all.filter((t) => t.status === "en_reparation").length,
      pret: all.filter((t) => t.status === "pret").length,
      rendu: all.filter((t) => t.status === "rendu").length,
      annule: all.filter((t) => t.status === "annule").length,
      todayReceived: all.filter(
        (t) => new Date(t.createdAt) >= today
      ).length,
      totalRevenue: all
        .filter((t) => t.status === "rendu")
        .reduce((s, t) => s + (t.finalCost || 0), 0),
      unpaid: all.filter(
        (t) =>
          t.paymentStatus !== "payee" &&
          t.status !== "annule" &&
          t.finalCost > 0
      ).length,
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single ticket
router.get("/:id", async (req, res) => {
  try {
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: ticketInclude,
    });
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
    res.json(formatTicket(ticket));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST create ticket
router.post("/", async (req, res) => {
  try {
    const seq = await getNextSequence("maintenance");
    const number = `MNT-${String(seq).padStart(4, "0")}`;

    const { client, partsUsed, product, ...rest } = req.body;

    const data = {
      ...rest,
      number,
      tenantId: req.tenantId,
      createdBy: req.userId,
      clientName: client?.name || req.body.clientName || "",
      clientPhone: client?.phone || req.body.clientPhone || "",
      clientEmail: client?.email || req.body.clientEmail || "",
    };

    if (product) data.productId = product;
    if (req.body.productId) data.productId = req.body.productId;

    if (partsUsed && partsUsed.length > 0) {
      data.partsUsed = {
        create: partsUsed.map((p) => ({
          name: p.name || "",
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
        })),
      };
    }

    const ticket = await prisma.maintenanceTicket.create({
      data,
      include: ticketInclude,
    });
    res.status(201).json(formatTicket(ticket));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT update ticket
router.put("/:id", async (req, res) => {
  try {
    const existingTicket = await prisma.maintenanceTicket.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existingTicket) return res.status(404).json({ error: "Ticket introuvable" });
    const { client, partsUsed, product, ...rest } = req.body;

    const data = { ...rest };

    if (client) {
      data.clientName = client.name;
      data.clientPhone = client.phone;
      data.clientEmail = client.email || "";
    }
    if (req.body.clientName !== undefined) data.clientName = req.body.clientName;
    if (req.body.clientPhone !== undefined) data.clientPhone = req.body.clientPhone;
    if (req.body.clientEmail !== undefined) data.clientEmail = req.body.clientEmail;

    if (product) data.productId = product;
    if (req.body.productId !== undefined) data.productId = req.body.productId;

    if (partsUsed) {
      await prisma.maintenancePart.deleteMany({ where: { ticketId: req.params.id } });
      data.partsUsed = {
        create: partsUsed.map((p) => ({
          name: p.name || "",
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
        })),
      };
    }

    const ticket = await prisma.maintenanceTicket.update({
      where: { id: req.params.id },
      data,
      include: ticketInclude,
    });
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });
    res.json(formatTicket(ticket));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Ticket introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// PUT change status
router.put("/:id/status", async (req, res) => {
  try {
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!ticket) return res.status(404).json({ error: "Ticket introuvable" });

    const { status } = req.body;
    const allowed = statusFlow[ticket.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Transition ${ticket.status} -> ${status} non autorisee`,
      });
    }

    const data = { status };

    // Auto-set dates
    if (status === "diagnostic" && !ticket.diagnosticDate) {
      data.diagnosticDate = new Date();
    }
    if (status === "pret" && !ticket.completedDate) {
      data.completedDate = new Date();
    }
    if (status === "rendu" && !ticket.returnedDate) {
      data.returnedDate = new Date();
    }

    const updated = await prisma.maintenanceTicket.update({
      where: { id: req.params.id },
      data,
      include: ticketInclude,
    });
    res.json(formatTicket(updated));
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Ticket introuvable" });
    res.status(400).json({ error: e.message });
  }
});

// DELETE ticket
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.maintenanceTicket.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: "Ticket introuvable" });
    await prisma.maintenanceTicket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    if (e.code === "P2025") return res.status(404).json({ error: "Ticket introuvable" });
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
