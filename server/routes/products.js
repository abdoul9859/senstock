const express = require("express");
const prisma = require("../db");
const logger = require("../lib/logger");
const { logAudit, computeChanges } = require("../lib/audit");
const router = express.Router();

// Backwards compat: add _id alias
function addId(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(addId);
  return { ...obj, _id: obj.id };
}

// Deep addId for product with nested relations
function addIdDeep(product) {
  if (!product) return product;
  if (Array.isArray(product)) return product.map(addIdDeep);
  const result = { ...product, _id: product.id };
  if (result.category) result.category = addId(result.category);
  if (result.supplier) result.supplier = addId(result.supplier);
  if (result.variants) {
    result.variants = result.variants.map((v) => {
      const vCopy = { ...v, _id: v.id };
      if (vCopy.supplier) vCopy.supplier = addId(vCopy.supplier);
      return vCopy;
    });
  }
  return result;
}

const productIncludes = {
  category: true,
  supplier: true,
  variants: { include: { supplier: true, label: true } },
  labels: { include: { label: true } },
};

// Helper: log a stock movement (fire-and-forget)
function logMovement(data, tenantId) {
  prisma.stockMovement.create({ data: { ...data, tenantId } }).catch(() => {});
}

// GET /api/products — list all (optimized payload for list view)
router.get("/", async (req, res) => {
  try {
    // Filtre par étiquettes: ?labelIds=id1,id2
    const { labelIds } = req.query;
    const where = { deleted: false, tenantId: req.tenantId };
    if (labelIds) {
      const ids = labelIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        where.labels = { some: { labelId: { in: ids } } };
      }
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        barcode: true,
        image: true,
        purchasePrice: true,
        costPrice: true,
        sellingPrice: true,
        quantity: true,
        archived: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true, hasVariants: true } },
        supplier: { select: { id: true, name: true } },
        variants: {
          select: {
            id: true,
            serialNumber: true,
            barcode: true,
            condition: true,
            sold: true,
            price: true,
            labelId: true,
            label: { select: { id: true, name: true, color: true } },
          },
        },
        labels: {
          select: {
            label: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products.map(addIdDeep));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/products — create
router.post("/", async (req, res) => {
  try {
    const { name, description, category, brand, model, purchasePrice, costPrice, sellingPrice, supplier, notes, image, quantity, attributes, variants, labelIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    if (!category) {
      return res.status(400).json({ error: "La catégorie est requise" });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description || "",
        categoryId: category,
        brand: brand || "",
        model: model || "",
        purchasePrice: purchasePrice ?? undefined,
        costPrice: costPrice ?? undefined,
        sellingPrice: sellingPrice ?? undefined,
        supplierId: supplier || undefined,
        notes: notes || "",
        image: image || "",
        quantity: quantity || 0,
        attributes: attributes || {},
        tenantId: req.tenantId,
        createdBy: req.userId,
        variants: {
          create: (variants || []).map((v) => ({
            serialNumber: v.serialNumber,
            barcode: v.barcode || "",
            condition: v.condition || "neuf",
            sold: !!v.sold,
            price: v.price ?? undefined,
            supplierId: v.supplier || v.supplierId || undefined,
            labelId: v.labelId || undefined,
            attributes: v.attributes || {},
          })),
        },
        labels: labelIds && labelIds.length > 0 ? {
          create: labelIds.map((lid) => ({ labelId: lid })),
        } : undefined,
      },
      include: productIncludes,
    });

    // Log: product created
    const variantCount = (variants || []).length;
    const qty = quantity || 0;
    let details = `Produit cree`;
    if (variantCount > 0) {
      details += ` avec ${variantCount} variante${variantCount > 1 ? "s" : ""}`;
    } else if (qty > 0) {
      details += ` avec ${qty} unite${qty > 1 ? "s" : ""}`;
    }
    logMovement({
      type: "product_created",
      productId: product.id,
      productName: product.name,
      details,
      userId: req.userId,
    }, req.tenantId);

    // Audit: product created
    logAudit({
      tenantId: req.tenantId,
      entity: "product",
      entityId: product.id,
      action: "create",
      changes: { name: product.name, brand: product.brand, model: product.model, sellingPrice: product.sellingPrice, quantity: product.quantity },
      userId: req.userId,
      userName: req.user?.name || "",
    });

    res.status(201).json(addIdDeep(product));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PUT /api/products/:id — update
router.put("/:id", async (req, res) => {
  try {
    const { name, description, category, brand, model, purchasePrice, costPrice, sellingPrice, supplier, notes, image, quantity, attributes, variants, labelIds } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: "Le nom est requis" });
    }

    // Fetch old product for comparison
    const oldProduct = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { variants: true },
    });
    if (!oldProduct) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.categoryId = category;
    if (brand !== undefined) update.brand = brand;
    if (model !== undefined) update.model = model;
    if (purchasePrice !== undefined) update.purchasePrice = purchasePrice;
    if (costPrice !== undefined) update.costPrice = costPrice;
    if (sellingPrice !== undefined) update.sellingPrice = sellingPrice;
    if (supplier !== undefined) update.supplierId = supplier || null;
    if (notes !== undefined) update.notes = notes;
    if (image !== undefined) update.image = image;
    if (quantity !== undefined) update.quantity = quantity;
    if (attributes !== undefined) update.attributes = attributes;
    if (req.body.archived !== undefined) update.archived = req.body.archived;

    // Handle variants: delete old and create new
    if (variants !== undefined) {
      await prisma.variant.deleteMany({ where: { productId: req.params.id } });
      update.variants = {
        create: (variants || []).map((v) => ({
          serialNumber: v.serialNumber,
          barcode: v.barcode || "",
          condition: v.condition || "neuf",
          sold: !!v.sold,
          soldInvoiceId: v.soldInvoiceId || undefined,
          soldInvoiceNumber: v.soldInvoiceNumber || "",
          price: v.price ?? undefined,
          supplierId: v.supplier || v.supplierId || undefined,
          labelId: v.labelId || undefined,
          attributes: v.attributes || {},
        })),
      };
    }

    // Sync labels if provided
    if (labelIds !== undefined) {
      await prisma.productLabelItem.deleteMany({ where: { productId: req.params.id } });
      if (labelIds.length > 0) {
        await prisma.productLabelItem.createMany({
          data: labelIds.map((lid) => ({ productId: req.params.id, labelId: lid })),
          skipDuplicates: true,
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: update,
      include: productIncludes,
    });

    const productName = product.name;

    // Log: compare variants
    if (variants !== undefined) {
      const oldSNs = new Set(oldProduct.variants.map((v) => v.serialNumber));
      const newSNs = new Set(variants.map((v) => v.serialNumber));

      // Added variants
      const added = variants.filter((v) => !oldSNs.has(v.serialNumber));
      if (added.length > 0) {
        logMovement({
          type: "variants_added",
          productId: product.id,
          productName,
          details: `${added.length} variante${added.length > 1 ? "s" : ""} ajoutee${added.length > 1 ? "s" : ""}: ${added.map((v) => v.serialNumber).join(", ")}`,
          meta: { serialNumbers: added.map((v) => v.serialNumber) },
          userId: req.userId,
        }, req.tenantId);
      }

      // Removed variants
      const removedSNs = [...oldSNs].filter((sn) => !newSNs.has(sn));
      if (removedSNs.length > 0) {
        logMovement({
          type: "variants_removed",
          productId: product.id,
          productName,
          details: `${removedSNs.length} variante${removedSNs.length > 1 ? "s" : ""} supprimee${removedSNs.length > 1 ? "s" : ""}: ${removedSNs.join(", ")}`,
          meta: { serialNumbers: removedSNs },
          userId: req.userId,
        }, req.tenantId);
      }

      // Sold variants
      const oldSoldSNs = new Set(oldProduct.variants.filter((v) => v.sold).map((v) => v.serialNumber));
      const newlySold = variants.filter((v) => v.sold && !oldSoldSNs.has(v.serialNumber));
      if (newlySold.length > 0) {
        logMovement({
          type: "variant_sold",
          productId: product.id,
          productName,
          details: `${newlySold.length} variante${newlySold.length > 1 ? "s" : ""} vendue${newlySold.length > 1 ? "s" : ""}: ${newlySold.map((v) => v.serialNumber).join(", ")}`,
          meta: { serialNumbers: newlySold.map((v) => v.serialNumber) },
          userId: req.userId,
        }, req.tenantId);
      }
    }

    // Log: quantity changed (for non-variant products)
    if (quantity !== undefined && quantity !== oldProduct.quantity) {
      const diff = quantity - oldProduct.quantity;
      logMovement({
        type: "quantity_updated",
        productId: product.id,
        productName,
        details: `Quantite: ${oldProduct.quantity} → ${quantity} (${diff > 0 ? "+" : ""}${diff})`,
        meta: { oldQuantity: oldProduct.quantity, newQuantity: quantity },
        userId: req.userId,
      }, req.tenantId);
    }

    // Log: general product update (if non-variant/quantity fields changed)
    const trackFields = ["name", "description", "brand", "model", "purchasePrice", "costPrice", "sellingPrice", "supplier", "notes", "image"];
    const rawUpdate = { name, description, brand, model, purchasePrice, costPrice, sellingPrice, supplier, notes, image };
    const changed = trackFields.some((f) => rawUpdate[f] !== undefined);
    if (changed) {
      logMovement({
        type: "product_updated",
        productId: product.id,
        productName,
        details: "Informations du produit modifiees",
        userId: req.userId,
      }, req.tenantId);
    }

    // Audit: product updated
    const auditFields = ["name", "description", "brand", "model", "purchasePrice", "costPrice", "sellingPrice", "quantity", "archived"];
    const auditChanges = computeChanges(oldProduct, product, auditFields);
    if (Object.keys(auditChanges).length > 0) {
      logAudit({
        tenantId: req.tenantId,
        entity: "product",
        entityId: product.id,
        action: "update",
        changes: auditChanges,
        userId: req.userId,
        userName: req.user?.name || "",
      });
    }

    res.json(addIdDeep(product));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /api/products/:id/archive — toggle archive
router.patch("/:id/archive", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!product) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { archived: !product.archived },
      include: { category: true },
    });

    logMovement({
      type: updated.archived ? "product_archived" : "product_unarchived",
      productId: updated.id,
      productName: updated.name,
      details: updated.archived ? "Produit archive" : "Produit desarchive",
      userId: req.userId,
    }, req.tenantId);

    res.json(addIdDeep(updated));
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/products/archive-sold — archive all products where all variants are sold
router.post("/archive-sold", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { archived: false, deleted: false, tenantId: req.tenantId },
      include: { category: true, variants: true },
    });
    let count = 0;
    for (const product of products) {
      if (product.category?.hasVariants && product.variants.length > 0) {
        const allSold = product.variants.every((v) => v.sold);
        if (allSold) {
          await prisma.product.update({ where: { id: product.id }, data: { archived: true } });
          logMovement({
            type: "product_archived",
            productId: product.id,
            productName: product.name,
            details: "Archive automatique (toutes variantes vendues)",
            userId: req.userId,
          }, req.tenantId);
          count++;
        }
      } else if (!product.category?.hasVariants && product.quantity === 0) {
        await prisma.product.update({ where: { id: product.id }, data: { archived: true } });
        logMovement({
          type: "product_archived",
          productId: product.id,
          productName: product.name,
          details: "Archive automatique (stock a 0)",
          userId: req.userId,
        }, req.tenantId);
        count++;
      }
    }
    res.json({ message: `${count} produit(s) archivé(s)`, count });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/products/merge — merge duplicate products
router.post("/merge", async (req, res) => {
  try {
    const { keepId, mergeIds, options } = req.body;
    if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return res.status(400).json({ error: "Parametres invalides" });
    }

    const keepProduct = await prisma.product.findFirst({
      where: { id: keepId, tenantId: req.tenantId },
      include: { category: true, variants: true },
    });
    if (!keepProduct) {
      return res.status(404).json({ error: "Produit cible introuvable" });
    }

    const sourceProducts = await prisma.product.findMany({
      where: { id: { in: mergeIds }, tenantId: req.tenantId },
      include: { category: true, variants: true },
    });
    if (sourceProducts.length === 0) {
      return res.status(404).json({ error: "Aucun produit source trouve" });
    }

    let variantsTransferred = 0;
    let quantityAdded = 0;
    let currentQuantity = keepProduct.quantity || 0;
    const keepUpdate = {};

    // Collect all existing variant serial numbers for the keep product
    const existingSNs = new Set(keepProduct.variants.map((v) => v.serialNumber?.toLowerCase()));
    const newVariantsToCreate = [];

    for (const source of sourceProducts) {
      // Transfer variants
      if (options?.transferVariants && source.variants && source.variants.length > 0) {
        const newVariants = source.variants.filter(
          (v) => !existingSNs.has(v.serialNumber?.toLowerCase())
        );
        for (const v of newVariants) {
          existingSNs.add(v.serialNumber?.toLowerCase());
          newVariantsToCreate.push({
            serialNumber: v.serialNumber,
            barcode: v.barcode || "",
            condition: v.condition || "neuf",
            sold: !!v.sold,
            soldInvoiceId: v.soldInvoiceId || undefined,
            soldInvoiceNumber: v.soldInvoiceNumber || "",
            price: v.price ?? undefined,
            supplierId: v.supplierId || undefined,
            attributes: v.attributes || {},
          });
          variantsTransferred++;
        }
      }

      // Add quantities
      if (options?.addQuantities && source.quantity > 0) {
        currentQuantity += source.quantity;
        quantityAdded += source.quantity;
      }

      // Fill empty fields from source
      if (!keepProduct.brand && source.brand) keepUpdate.brand = keepUpdate.brand || source.brand;
      if (!keepProduct.model && source.model) keepUpdate.model = keepUpdate.model || source.model;
      if (!keepProduct.description && source.description) keepUpdate.description = keepUpdate.description || source.description;
      if (!keepProduct.image && source.image) keepUpdate.image = keepUpdate.image || source.image;
      if (!keepProduct.sellingPrice && source.sellingPrice) keepUpdate.sellingPrice = keepUpdate.sellingPrice || source.sellingPrice;
      if (!keepProduct.purchasePrice && source.purchasePrice) keepUpdate.purchasePrice = keepUpdate.purchasePrice || source.purchasePrice;
      if (!keepProduct.costPrice && source.costPrice) keepUpdate.costPrice = keepUpdate.costPrice || source.costPrice;

      // Delete the source product (variants cascade)
      await prisma.product.delete({ where: { id: source.id } });

      logMovement({
        type: "product_merged",
        productId: keepProduct.id,
        productName: keepProduct.name,
        details: `Produit "${source.name}" fusionne dans "${keepProduct.name}"${variantsTransferred > 0 ? ` (${variantsTransferred} variantes transferees)` : ""}${quantityAdded > 0 ? ` (+${quantityAdded} unites)` : ""}`,
        userId: req.userId,
      }, req.tenantId);
    }

    keepUpdate.quantity = currentQuantity;
    if (newVariantsToCreate.length > 0) {
      keepUpdate.variants = { create: newVariantsToCreate };
    }

    const updated = await prisma.product.update({
      where: { id: keepId },
      data: keepUpdate,
      include: productIncludes,
    });

    res.json({
      product: addIdDeep(updated),
      variantsTransferred,
      quantityAdded,
      merged: sourceProducts.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur" });
  }
});

// DELETE /api/products/:id — delete
router.delete("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { variants: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { deleted: true, deletedAt: new Date() },
    });

    logMovement({
      type: "product_deleted",
      productId: product.id,
      productName: product.name,
      details: `Produit supprime (${product.variants.length} variante${product.variants.length !== 1 ? "s" : ""})`,
      userId: req.userId,
    }, req.tenantId);

    // Audit: product deleted
    logAudit({
      tenantId: req.tenantId,
      entity: "product",
      entityId: product.id,
      action: "delete",
      changes: { name: product.name },
      userId: req.userId,
      userName: req.user?.name || "",
    });

    res.json({ message: "Produit supprimé" });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /api/products/:id/history — audit trail for a product
router.get("/:id/history", async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!product) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: req.tenantId,
        entity: "product",
        entityId: req.params.id,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /api/products/:id/variants/:variantId/label — assigner/retirer une étiquette sur une variante
router.patch("/:id/variants/:variantId/label", async (req, res) => {
  try {
    const { labelId } = req.body; // null pour retirer l'étiquette
    // Vérifier que le produit appartient au tenant
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId, deleted: false },
    });
    if (!product) return res.status(404).json({ error: "Produit non trouvé" });

    // Vérifier que la variante appartient au produit
    const variant = await prisma.variant.findFirst({
      where: { id: req.params.variantId, productId: req.params.id },
    });
    if (!variant) return res.status(404).json({ error: "Variante non trouvée" });

    // Si labelId fourni, vérifier qu'il appartient au tenant
    if (labelId) {
      const label = await prisma.productLabel.findFirst({
        where: { id: labelId, tenantId: req.tenantId },
      });
      if (!label) return res.status(404).json({ error: "Étiquette non trouvée" });
    }

    const updated = await prisma.variant.update({
      where: { id: req.params.variantId },
      data: { labelId: labelId || null },
      include: { label: true },
    });
    res.json({ ...updated, _id: updated.id });
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
