const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");

const router = express.Router();

// Valid invoice status transitions (same as in invoices.js)
const VALID_TRANSITIONS = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["payee", "partielle", "en_retard", "annulee"],
  partielle: ["payee", "en_retard", "annulee"],
  en_retard: ["payee", "partielle", "annulee"],
  payee: [],
  annulee: ["brouillon"],
};

function validateStatusTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

// POST /api/bulk/products/delete — Bulk soft-delete products
router.post("/products/delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids est requis (tableau non vide)" });
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: ids },
        tenantId: req.tenantId,
      },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    res.json({ count: result.count });
  } catch (err) {
    logger.error("Bulk delete products error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/bulk/invoices/status — Bulk status change
router.post("/invoices/status", async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids est requis (tableau non vide)" });
    }
    if (!status) {
      return res.status(400).json({ error: "status est requis" });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: ids },
        tenantId: req.tenantId,
      },
      select: { id: true, status: true, number: true },
    });

    let updated = 0;
    const errors = [];

    for (const invoice of invoices) {
      if (!validateStatusTransition(invoice.status, status)) {
        const allowed = VALID_TRANSITIONS[invoice.status] || [];
        errors.push({
          id: invoice.id,
          error: `Transition invalide de "${invoice.status}" a "${status}" pour la facture ${invoice.number}. Autorisees: ${allowed.join(", ") || "aucune"}`,
        });
        continue;
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });
      updated++;
    }

    // Check for ids not found
    const foundIds = new Set(invoices.map((i) => i.id));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ id, error: "Facture introuvable" });
      }
    }

    res.json({ updated, errors });
  } catch (err) {
    logger.error("Bulk status change error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/bulk/products/price — Bulk price update
router.post("/products/price", async (req, res) => {
  try {
    const { ids, field, value, percentage } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids est requis (tableau non vide)" });
    }
    if (!field || !["sellingPrice", "purchasePrice"].includes(field)) {
      return res.status(400).json({ error: "field doit etre 'sellingPrice' ou 'purchasePrice'" });
    }
    if (value === undefined && percentage === undefined) {
      return res.status(400).json({ error: "value ou percentage est requis" });
    }

    let count = 0;

    if (percentage !== undefined) {
      // Percentage increase: fetch products, compute new prices, update each
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, tenantId: req.tenantId },
        select: { id: true, [field]: true },
      });

      for (const product of products) {
        const currentPrice = product[field] || 0;
        const newPrice = Math.round(currentPrice * (1 + percentage / 100) * 100) / 100;
        await prisma.product.update({
          where: { id: product.id },
          data: { [field]: newPrice },
        });
        count++;
      }
    } else {
      // Absolute value
      const result = await prisma.product.updateMany({
        where: { id: { in: ids }, tenantId: req.tenantId },
        data: { [field]: value },
      });
      count = result.count;
    }

    res.json({ count });
  } catch (err) {
    logger.error("Bulk price update error", { error: err.message });
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
