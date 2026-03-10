import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { showAlert } from "../../utils/alert";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Product, Category, Supplier } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "ProductForm">;
type Nav = NativeStackNavigationProp<AppStackParamList, "ProductForm">;

interface VariantEntry {
  _id?: string;
  serialNumber: string;
  barcode: string;
  condition: "Neuf" | "Venant" | "Occasion";
  price: string;
  sold: boolean;
  supplier?: string | null;
}

const CONDITION_OPTIONS: VariantEntry["condition"][] = ["Neuf", "Venant", "Occasion"];

export default function ProductFormScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const editId = route.params?.productId;

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);

  // Bulk import modal state
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkSerials, setBulkSerials] = useState("");
  const [bulkCondition, setBulkCondition] = useState<VariantEntry["condition"]>("Neuf");
  const [bulkPrice, setBulkPrice] = useState("");

  const hasVariants = variants.length > 0;

  useEffect(() => {
    // Fetch categories
    apiFetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});

    // Fetch suppliers
    apiFetch("/api/suppliers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSuppliers)
      .catch(() => {});

    // Fetch existing product if editing
    if (editId) {
      apiFetch("/api/products")
        .then((r) => (r.ok ? r.json() : []))
        .then((all: Product[]) => {
          const p = all.find((x) => x._id === editId);
          if (p) {
            setName(p.name);
            setBrand(p.brand || "");
            setModel(p.model || "");
            setImageUrl(p.image || "");
            setPurchasePrice(String(p.purchasePrice));
            setCostPrice(p.costPrice ? String(p.costPrice) : "");
            setSellingPrice(String(p.sellingPrice));
            setQuantity(String(p.quantity));
            setDescription(p.description || "");
            setNotes(p.notes || "");
            if (p.category && typeof p.category === "object") setCategoryId(p.category._id);
            if (p.supplier && typeof p.supplier === "object") setSupplierId(p.supplier._id);
            if (p.variants && p.variants.length > 0) {
              setVariants(
                p.variants.map((v) => ({
                  _id: v._id,
                  serialNumber: v.serialNumber || "",
                  barcode: v.barcode || "",
                  condition: (v.condition as VariantEntry["condition"]) || "Neuf",
                  price: v.price != null ? String(v.price) : "",
                  sold: v.sold,
                  supplier: v.supplier || null,
                }))
              );
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [editId]);

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        serialNumber: "",
        barcode: "",
        condition: "Neuf",
        price: "",
        sold: false,
      },
    ]);
  }

  function updateVariant(index: number, field: keyof VariantEntry, value: string) {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBulkImport() {
    const lines = bulkSerials
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      showAlert("Erreur", "Veuillez entrer au moins un numero de serie.");
      return;
    }
    const newVariants: VariantEntry[] = lines.map((serial) => ({
      serialNumber: serial,
      barcode: "",
      condition: bulkCondition,
      price: bulkPrice,
      sold: false,
    }));
    setVariants((prev) => [...prev, ...newVariants]);
    setBulkSerials("");
    setBulkPrice("");
    setBulkCondition("Neuf");
    setBulkModalVisible(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      showAlert("Champ requis", "Le nom du produit est obligatoire.");
      return;
    }
    // Validate variants - serial numbers required
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].serialNumber.trim()) {
        showAlert("Champ requis", `Le numero de serie est obligatoire pour la variante ${i + 1}.`);
        return;
      }
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        quantity: hasVariants ? variants.filter((v) => !v.sold).length : Number(quantity) || 0,
        description: description.trim() || undefined,
        category: categoryId || undefined,
        imageUrl: imageUrl.trim() || undefined,
        supplier: supplierId || undefined,
        notes: notes.trim() || undefined,
        variants: variants.map((v) => ({
          _id: v._id,
          serialNumber: v.serialNumber,
          barcode: v.barcode,
          condition: v.condition,
          price: v.price ? Number(v.price) : null,
          supplier: v.supplier || undefined,
        })),
      };

      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PUT" : "POST";

      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        nav.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de sauvegarder");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Field label="Nom *" value={name} onChangeText={setName} placeholder="Nom du produit" colors={colors} />
      <Field label="Marque" value={brand} onChangeText={setBrand} placeholder="Apple, Samsung..." colors={colors} />
      <Field label="Modele" value={model} onChangeText={setModel} placeholder="256GB, Pro Max..." colors={colors} />

      {/* Image URL */}
      <Field label="Image URL" value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." colors={colors} />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Prix achat" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0" keyboard="numeric" colors={colors} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Prix revient" value={costPrice} onChangeText={setCostPrice} placeholder="0" keyboard="numeric" colors={colors} />
        </View>
      </View>

      <Field label="Prix vente" value={sellingPrice} onChangeText={setSellingPrice} placeholder="0" keyboard="numeric" colors={colors} />

      {/* Hide quantity when variants exist */}
      {!hasVariants && (
        <Field label="Quantite" value={quantity} onChangeText={setQuantity} placeholder="1" keyboard="numeric" colors={colors} />
      )}

      {/* Category picker */}
      {categories.length > 0 && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, !categoryId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCategoryId("")}
            >
              <Text style={[styles.chipText, { color: colors.textMuted }, !categoryId && { color: colors.primaryForeground, fontWeight: "600" }]}>Aucune</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, categoryId === c._id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setCategoryId(c._id)}
              >
                <Text style={[styles.chipText, { color: colors.textMuted }, categoryId === c._id && { color: colors.primaryForeground, fontWeight: "600" }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Supplier picker */}
      {suppliers.length > 0 && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Fournisseur</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, !supplierId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setSupplierId("")}
            >
              <Text style={[styles.chipText, { color: colors.textMuted }, !supplierId && { color: colors.primaryForeground, fontWeight: "600" }]}>Aucun</Text>
            </TouchableOpacity>
            {suppliers.map((s) => (
              <TouchableOpacity
                key={s._id}
                style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, supplierId === s._id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setSupplierId(s._id)}
              >
                <Text style={[styles.chipText, { color: colors.textMuted }, supplierId === s._id && { color: colors.primaryForeground, fontWeight: "600" }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Description optionnelle..."
        multiline
        colors={colors}
      />

      {/* ── Variants Section ── */}
      <View style={styles.fieldGroup}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Variants{hasVariants ? ` (${variants.filter((v) => !v.sold).length}/${variants.length})` : ""}
          </Text>
        </View>

        {variants.map((variant, index) => (
          <View key={index} style={[styles.variantCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header row with index and status */}
            <View style={styles.variantHeader}>
              <Text style={[styles.variantIndex, { color: colors.textMuted }]}>#{index + 1}</Text>
              {variant.sold && (
                <View style={[styles.soldBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.soldBadgeText, { color: colors.destructiveForeground }]}>Vendu</Text>
                </View>
              )}
              {!variant.sold && (
                <TouchableOpacity onPress={() => removeVariant(index)} style={styles.deleteBtn}>
                  <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Serial Number */}
            <View style={styles.variantField}>
              <Text style={[styles.variantFieldLabel, { color: colors.textMuted }]}>N/S (IMEI) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={variant.serialNumber}
                onChangeText={(t) => updateVariant(index, "serialNumber", t)}
                placeholder="Numero de serie"
                placeholderTextColor={colors.placeholder}
                editable={!variant.sold}
              />
            </View>

            {/* Condition chips */}
            <View style={styles.variantField}>
              <Text style={[styles.variantFieldLabel, { color: colors.textMuted }]}>Etat</Text>
              <View style={styles.conditionRow}>
                {CONDITION_OPTIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.conditionChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      variant.condition === cond && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => !variant.sold && updateVariant(index, "condition", cond)}
                    disabled={variant.sold}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        { color: colors.textMuted },
                        variant.condition === cond && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price and Barcode row */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.variantFieldLabel, { color: colors.textMuted }]}>Prix</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={variant.price}
                  onChangeText={(t) => updateVariant(index, "price", t)}
                  placeholder={sellingPrice || "Prix vente"}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  editable={!variant.sold}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.variantFieldLabel, { color: colors.textMuted }]}>Code-barres</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={variant.barcode}
                  onChangeText={(t) => updateVariant(index, "barcode", t)}
                  placeholder="Optionnel"
                  placeholderTextColor={colors.placeholder}
                  editable={!variant.sold}
                />
              </View>
            </View>
          </View>
        ))}

        {/* Add variant / Bulk import buttons */}
        <View style={styles.variantActions}>
          <TouchableOpacity
            style={[styles.variantActionBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={addVariant}
          >
            <Text style={[styles.variantActionBtnText, { color: colors.primary }]}>+ Ajouter une variante</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.variantActionBtn, { backgroundColor: colors.card, borderColor: colors.info }]}
            onPress={() => setBulkModalVisible(true)}
          >
            <Text style={[styles.variantActionBtnText, { color: colors.info }]}>Import en masse</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes */}
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes internes..."
        multiline
        colors={colors}
      />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{editId ? "Enregistrer" : "Creer le produit"}</Text>
        )}
      </TouchableOpacity>

      {/* ── Bulk Import Modal ── */}
      <Modal visible={bulkModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Import en masse</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Numeros de serie (un par ligne)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text, minHeight: 120 }]}
                value={bulkSerials}
                onChangeText={setBulkSerials}
                placeholder={"IMEI1\nIMEI2\nIMEI3"}
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={6}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Etat</Text>
              <View style={styles.conditionRow}>
                {CONDITION_OPTIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.conditionChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      bulkCondition === cond && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setBulkCondition(cond)}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        { color: colors.textMuted },
                        bulkCondition === cond && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                    >
                      {cond}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Field label="Prix (optionnel)" value={bulkPrice} onChangeText={setBulkPrice} placeholder={sellingPrice || "Prix vente"} keyboard="numeric" colors={colors} />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setBulkModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleBulkImport}
              >
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Importer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  multiline,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboard?: "numeric" | "default";
  multiline?: boolean;
  colors: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboard || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: fontSize.sm,
  },
  saveBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  // ── Variants ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  variantCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  variantIndex: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  soldBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  soldBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  deleteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  variantField: {
    marginBottom: spacing.sm,
  },
  variantFieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  conditionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  conditionChipText: {
    fontSize: fontSize.sm,
  },
  variantActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  variantActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  variantActionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
