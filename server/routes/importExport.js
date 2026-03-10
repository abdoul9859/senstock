const express = require("express");
const prisma = require("../db");
const { getNextSequence } = require("../helpers/counter");
const router = express.Router();

function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

function parseCSV(csv) {
  const lines = csv.trim().split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

// POST /import-products - Import products from CSV
router.post("/import-products", async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: "CSV requis" });

    const { rows } = parseCSV(csv);
    // Expected columns: nom,categorie,marque,modele,prix_achat,prix_vente,quantite,code_barres

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const categoryName = row.categorie || "Sans categorie";

        // Find or create category
        let category = await prisma.category.findFirst({
          where: { name: categoryName, tenantId: req.tenantId, deleted: false },
        });
        if (!category) {
          category = await prisma.category.create({
            data: {
              name: categoryName,
              tenantId: req.tenantId,
              createdBy: req.userId,
            },
          });
        }

        await prisma.product.create({
          data: {
            name: row.nom || "Produit sans nom",
            categoryId: category.id,
            brand: row.marque || "",
            model: row.modele || "",
            purchasePrice: row.prix_achat ? parseFloat(row.prix_achat) : null,
            sellingPrice: row.prix_vente ? parseFloat(row.prix_vente) : null,
            quantity: row.quantite ? parseInt(row.quantite) : 0,
            barcode: row.code_barres || "",
            tenantId: req.tenantId,
            createdBy: req.userId,
          },
        });

        imported++;
      } catch (e) {
        errors.push({ line: i + 2, error: e.message });
      }
    }

    res.json({ imported, errors });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /import-bank-transactions - Import bank transactions from CSV
router.post("/import-bank-transactions", async (req, res) => {
  try {
    const { csv, accountId } = req.body;
    if (!csv) return res.status(400).json({ error: "CSV requis" });
    if (!accountId) return res.status(400).json({ error: "accountId requis" });

    const account = await prisma.bankAccount.findFirst({
      where: { id: accountId, tenantId: req.tenantId },
    });
    if (!account) return res.status(404).json({ error: "Compte introuvable" });

    const { rows } = parseCSV(csv);
    // Expected columns: date,type,description,montant,reference,categorie
    // type: entree/sortie

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const amount = parseFloat(row.montant);
        if (isNaN(amount) || amount <= 0) {
          errors.push({ line: i + 2, error: "Montant invalide" });
          continue;
        }

        const type = row.type === "entree" ? "entree" : "sortie";
        const seq = await getNextSequence("bank_transaction");
        const number = `TXN-${String(seq).padStart(4, "0")}`;

        await prisma.bankTransaction.create({
          data: {
            number,
            type,
            category: row.categorie || "autre",
            amount,
            description: row.description || "",
            accountId,
            date: row.date ? new Date(row.date) : new Date(),
            reference: row.reference || "",
            tenantId: req.tenantId,
            createdBy: req.userId,
          },
        });

        // Update account balance
        if (type === "entree") {
          await prisma.bankAccount.update({
            where: { id: accountId },
            data: { balance: { increment: amount } },
          });
        } else {
          await prisma.bankAccount.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
          });
        }

        imported++;
      } catch (e) {
        errors.push({ line: i + 2, error: e.message });
      }
    }

    res.json({ imported, errors });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
