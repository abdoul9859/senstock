const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");

const router = express.Router();

// All permissions that can be assigned
const ALL_PERMISSIONS = {
  // Entrepot
  "entrepot.voir": "Voir l'entrepot",
  "entrepot.produits.creer": "Creer des produits",
  "entrepot.produits.modifier": "Modifier des produits",
  "entrepot.produits.supprimer": "Supprimer des produits",
  "entrepot.categories": "Gerer les categories",
  "entrepot.mouvements": "Voir les mouvements",
  "entrepot.parametres": "Parametres entrepot",
  // Commerce
  "commerce.voir": "Voir le commerce",
  "commerce.factures.creer": "Creer des factures",
  "commerce.factures.modifier": "Modifier des factures",
  "commerce.factures.supprimer": "Supprimer des factures",
  "commerce.clients": "Gerer les clients",
  "commerce.creances": "Gerer les creances",
  "commerce.devis": "Gerer les devis",
  "commerce.achats": "Achats quotidiens",
  "commerce.parametres": "Parametres commerce",
  // Boutique
  "boutique.voir": "Voir la boutique",
  "boutique.catalogue": "Gerer le catalogue",
  "boutique.commandes": "Gerer les commandes",
  "boutique.promotions": "Gerer les promotions",
  "boutique.parametres": "Parametres boutique",
  // Personnel
  "personnel.voir": "Voir le personnel",
  "personnel.employes": "Gerer les employes",
  "personnel.salaires": "Gerer les salaires",
  // Banque
  "banque.voir": "Voir la banque",
  "banque.comptes": "Gerer les comptes",
  "banque.transactions": "Gerer les transactions",
  "banque.virements": "Gerer les virements",
  "banque.parametres": "Parametres banque",
  // Analytique
  "analytique.voir": "Voir l'analytique",
  // Logistique
  "logistique.voir": "Voir la logistique",
  "logistique.fournisseurs": "Gerer les fournisseurs",
  "logistique.commandes": "Gerer les commandes fournisseurs",
  "logistique.livraisons": "Gerer les livraisons",
  // Pilotage
  "taches.voir": "Voir le pilotage",
  "taches.tableaux": "Gerer les tableaux",
  "taches.agenda": "Gerer l'agenda",
  // Confidentialite
  "confidentialite.chiffre_affaires": "Voir le chiffre d'affaires",
  "confidentialite.prix_achat": "Voir les prix d'achat",
  "confidentialite.marges": "Voir les marges et profits",
  "confidentialite.salaires": "Voir les salaires",
  "confidentialite.paiements": "Voir les montants des paiements",
  "confidentialite.valeur_stock": "Voir la valeur du stock",
  // Systeme
  "systeme.parametres": "Parametres generaux",
  "systeme.corbeille": "Gerer la corbeille",
  "systeme.equipe": "Gerer l'equipe",
};

// Middleware: require admin role
function requireAdmin(req, res, next) {
  // userId is set by auth middleware, look up user
  prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } })
    .then((user) => {
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Acces reserve a l'administrateur" });
      }
      next();
    })
    .catch(() => res.status(500).json({ error: "Erreur serveur" }));
}

// GET /api/team/permissions-list — return all available permissions
router.get("/permissions-list", requireAdmin, (_req, res) => {
  res.json(ALL_PERMISSIONS);
});

// GET /api/team — list team members (same tenant)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const members = await prisma.user.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    res.json(members.map((m) => ({ ...m, _id: m.id })));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/team — invite/create a new team member (gerant)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nom, email et mot de passe requis" });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: "Mot de passe minimum 4 caracteres" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ error: "Un compte avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "gerant",
        tenantId: req.tenantId,
        permissions: permissions || {},
      },
    });

    res.status(201).json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/team/:id — update member permissions (or name/password)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { name, password, permissions, role } = req.body;

    const member = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!member || member.tenantId !== req.tenantId) {
      return res.status(404).json({ error: "Membre non trouve" });
    }
    // Can't modify yourself through this endpoint
    if (member.id === req.userId) {
      return res.status(400).json({ error: "Utilisez le profil pour modifier votre compte" });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (password) {
      if (password.length < 4) return res.status(400).json({ error: "Mot de passe minimum 4 caracteres" });
      data.password = await bcrypt.hash(password, 10);
    }
    if (permissions !== undefined) data.permissions = permissions;
    if (role !== undefined && ["admin", "gerant"].includes(role)) data.role = role;

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, permissions: true, createdAt: true },
    });

    res.json({ ...updated, _id: updated.id });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/team/:id — remove a team member
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const member = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!member || member.tenantId !== req.tenantId) {
      return res.status(404).json({ error: "Membre non trouve" });
    }
    if (member.id === req.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "Membre supprime" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
