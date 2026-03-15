import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { showAlert } from "../../utils/alert";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { useDraftSync } from "../../hooks/useDraftSync";
import DraftBanner from "../../components/DraftBanner";
import type { Product, Category, Supplier } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";
import { Plus, Trash2, ChevronDown, Tag, ScanLine } from "lucide-react-native";
import BarcodeScanner from "../../components/BarcodeScanner";

type RouteDef = RouteProp<AppStackParamList, "ProductForm">;
type Nav = NativeStackNavigationProp<AppStackParamList, "ProductForm">;

interface Attribute {
  name: string;
  type: "text" | "number" | "select";
  options: string[];
  required: boolean;
}

interface ProductLabel {
  id: string;
  name: string;
  color: string;
}

interface VariantEntry {
  _id?: string;
  serialNumber: string;
  barcode: string;
  condition: "Neuf" | "Venant" | "Occasion";
  price: string;
  sold: boolean;
  supplier?: string | null;
  labelId?: string;
  attributes: Record<string, string>;
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
  const [categories, setCategories] = useState<(Category & { hasVariants?: boolean; attributes?: Attribute[] })[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [labels, setLabels] = useState<ProductLabel[]>([]);
  const [productLabelIds, setProductLabelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);

  // Bulk import modal state
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkSerials, setBulkSerials] = useState("");
  const [bulkCondition, setBulkCondition] = useState<VariantEntry["condition"]>("Neuf");
  const [bulkPrice, setBulkPrice] = useState("");

  // Picker modals
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState<number | null>(null); // variant index

  // Quick-create inline forms
  const [newCatName, setNewCatName] = useState("");
  const [newCatHasVariants, setNewCatHasVariants] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const [showNewCatForm, setShowNewCatForm] = useState(false);

  const [newSupForm, setNewSupForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [creatingSup, setCreatingSup] = useState(false);
  const [showNewSupForm, setShowNewSupForm] = useState(false);

  // Scanner state: { index, field } — which variant field to fill
  const [scanTarget, setScanTarget] = useState<{ index: number; field: "serialNumber" | "barcode" } | null>(null);

  // Apply remote draft data to form
  const applyDraftData = useCallback((data: Record<string, unknown>) => {
    if (data.name != null) setName(String(data.name));
    if (data.brand != null) setBrand(String(data.brand));
    if (data.model != null) setModel(String(data.model));
    if (data.imageUrl != null) setImageUrl(String(data.imageUrl));
    else if (data.image != null) setImageUrl(String(data.image));
    if (data.purchasePrice != null) setPurchasePrice(String(data.purchasePrice));
    if (data.costPrice != null) setCostPrice(String(data.costPrice));
    if (data.sellingPrice != null) setSellingPrice(String(data.sellingPrice));
    if (data.quantity != null) setQuantity(String(data.quantity));
    if (data.description != null) setDescription(String(data.description));
    if (data.notes != null) setNotes(String(data.notes));
    if (data.categoryId != null) setCategoryId(String(data.categoryId));
    else if (data.category != null) setCategoryId(String(data.category));
    if (data.supplierId != null) setSupplierId(String(data.supplierId));
    else if (data.supplier != null) setSupplierId(String(data.supplier));
    const draftLabels = data.productLabelIds || data.labelIds;
    if (Array.isArray(draftLabels)) setProductLabelIds(draftLabels as string[]);
    if (Array.isArray(data.variants)) setVariants(data.variants as VariantEntry[]);
  }, []);

  // Draft sync with live auto-update
  const { otherDrafts, saveDraft, clearDraft, loadOtherDraft } = useDraftSync({
    type: "product",
    enabled: !editId,
    onRemoteUpdate: applyDraftData,
  });

  function resumeFromOtherDevice() {
    const draft = loadOtherDraft();
    if (!draft) return;
    applyDraftData(draft);
    showAlert("Reprise", "Brouillon repris depuis l'autre appareil");
  }

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === categoryId),
    [categories, categoryId]
  );
  const hasVariants = selectedCategory?.hasVariants || false;
  const categoryAttributes = selectedCategory?.attributes || [];

  useEffect(() => {
    apiFetch("/api/categories").then((r) => { console.log("[ProductForm] categories status:", r.status); return r.ok ? r.json() : []; }).then((data) => { console.log("[ProductForm] categories:", data?.length); setCategories(data); }).catch((e) => console.error("[ProductForm] categories error:", e));
    apiFetch("/api/suppliers").then((r) => (r.ok ? r.json() : [])).then((data) => { console.log("[ProductForm] suppliers:", data?.length); setSuppliers(data); }).catch(() => {});
    apiFetch("/api/product-labels").then((r) => (r.ok ? r.json() : [])).then(setLabels).catch(() => {});

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
            setPurchasePrice(String(p.purchasePrice || ""));
            setCostPrice(p.costPrice ? String(p.costPrice) : "");
            setSellingPrice(String(p.sellingPrice || ""));
            setQuantity(String(p.quantity));
            setDescription(p.description || "");
            setNotes(p.notes || "");
            if (p.category && typeof p.category === "object") setCategoryId(p.category._id);
            if (p.supplier && typeof p.supplier === "object") setSupplierId(p.supplier._id);
            if ((p as any).labels) {
              setProductLabelIds((p as any).labels.map((l: any) => l.label?.id || l.labelId).filter(Boolean));
            }
            if (p.variants && p.variants.length > 0) {
              setVariants(
                p.variants.map((v: any) => ({
                  _id: v._id,
                  serialNumber: v.serialNumber || "",
                  barcode: v.barcode || "",
                  condition: (v.condition as VariantEntry["condition"]) || "Neuf",
                  price: v.price != null ? String(v.price) : "",
                  sold: v.sold,
                  supplier: v.supplier?._id || v.supplierId || null,
                  labelId: v.labelId || "",
                  attributes: v.attributes || {},
                }))
              );
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [editId]);

  // Save draft when form data changes (only for new products)
  useEffect(() => {
    if (editId) return;
    saveDraft({
      name, brand, model, imageUrl, purchasePrice, costPrice,
      sellingPrice, quantity, description, notes, categoryId,
      supplierId, productLabelIds, variants,
    });
  }, [editId, saveDraft, name, brand, model, imageUrl, purchasePrice, costPrice, sellingPrice, quantity, description, notes, categoryId, supplierId, productLabelIds, variants]);

  // ── Quick-create category ──
  async function handleCreateCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCatName.trim(), hasVariants: newCatHasVariants, attributes: [] }),
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((prev) => [...prev, created]);
        handleCategoryChange(created._id || created.id);
        setNewCatName("");
        setNewCatHasVariants(false);
        setShowNewCatForm(false);
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de création");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setCreatingCat(false);
    }
  }

  // ── Quick-create supplier ──
  async function handleCreateSupplier() {
    if (!newSupForm.name.trim()) return;
    setCreatingSup(true);
    try {
      const res = await apiFetch("/api/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: newSupForm.name.trim(),
          phone: newSupForm.phone.trim() || undefined,
          email: newSupForm.email.trim() || undefined,
          address: newSupForm.address.trim() || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSuppliers((prev) => [...prev, created]);
        setSupplierId(created._id || created.id);
        setNewSupForm({ name: "", phone: "", email: "", address: "" });
        setShowNewSupForm(false);
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de création");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setCreatingSup(false);
    }
  }

  // When category changes, reset variants if switching from/to hasVariants
  function handleCategoryChange(id: string) {
    const newCat = categories.find((c) => c._id === id);
    const oldHasVariants = selectedCategory?.hasVariants || false;
    const newHasVariants = newCat?.hasVariants || false;

    setCategoryId(id);

    if (oldHasVariants && !newHasVariants) {
      setVariants([]);
    }
    if (!oldHasVariants && newHasVariants && variants.length === 0) {
      setVariants([{ serialNumber: "", barcode: "", condition: "Neuf", price: "", sold: false, attributes: {} }]);
    }
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { serialNumber: "", barcode: "", condition: "Neuf", price: "", sold: false, attributes: {} },
    ]);
  }

  function updateVariant(index: number, field: string, value: string) {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function updateVariantAttribute(index: number, attrName: string, value: string) {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], attributes: { ...updated[index].attributes, [attrName]: value } };
      return updated;
    });
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBulkImport() {
    const lines = bulkSerials.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showAlert("Erreur", "Veuillez entrer au moins un numero de serie.");
      return;
    }
    const newVariants: VariantEntry[] = lines.map((serial) => ({
      serialNumber: serial, barcode: "", condition: bulkCondition,
      price: bulkPrice, sold: false, attributes: {},
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
    if (!categoryId) {
      showAlert("Champ requis", "La catégorie est obligatoire.");
      return;
    }
    if (hasVariants) {
      for (let i = 0; i < variants.length; i++) {
        if (!variants[i].serialNumber.trim()) {
          showAlert("Champ requis", `Le N/S est obligatoire pour la variante ${i + 1}.`);
          return;
        }
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
        image: imageUrl.trim() || undefined,
        supplier: supplierId || undefined,
        notes: notes.trim() || undefined,
        labelIds: productLabelIds.length > 0 ? productLabelIds : undefined,
        variants: hasVariants
          ? variants.map((v) => ({
              _id: v._id,
              serialNumber: v.serialNumber,
              barcode: v.barcode,
              condition: v.condition.toLowerCase(),
              price: v.price ? Number(v.price) : null,
              supplierId: v.supplier || undefined,
              labelId: v.labelId || undefined,
              attributes: v.attributes || {},
            }))
          : [],
      };

      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PUT" : "POST";

      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        clearDraft();
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

  // ── Styles ──
  const s = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 100 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    section: { marginBottom: spacing.xl },
    sectionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", marginBottom: spacing.md },
    fieldGroup: { marginBottom: spacing.md },
    label: { color: colors.textDimmed, fontSize: fontSize.sm, fontWeight: "500", marginBottom: 4 },
    required: { color: colors.destructive },
    input: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      color: colors.text, fontSize: fontSize.md,
    },
    inputMultiline: { minHeight: 80, textAlignVertical: "top" },
    row: { flexDirection: "row", gap: spacing.md },
    // Picker button
    pickerBtn: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    pickerBtnText: { color: colors.text, fontSize: fontSize.md },
    pickerBtnPlaceholder: { color: colors.placeholder, fontSize: fontSize.md },
    // Chip
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md, paddingVertical: 6,
      borderRadius: borderRadius.full, borderWidth: 1,
    },
    chipText: { fontSize: fontSize.sm },
    // Labels
    labelChip: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full,
    },
    labelChipText: { color: "#fff", fontSize: fontSize.xs, fontWeight: "600" },
    labelChipX: { color: "#fff", fontSize: fontSize.xs, fontWeight: "700", marginLeft: 2 },
    // Variant card
    variantCard: {
      borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
      backgroundColor: colors.card, padding: spacing.md, marginBottom: spacing.md,
    },
    variantHeader: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm,
    },
    variantIndex: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
    soldBadge: { backgroundColor: colors.destructive, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
    soldBadgeText: { color: "#fff", fontSize: fontSize.xs, fontWeight: "600" },
    deleteBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
    deleteBtnText: { color: colors.destructive, fontSize: fontSize.sm, fontWeight: "500" },
    variantFieldLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "500", marginBottom: 2 },
    variantInputSmall: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8,
      color: colors.text, fontSize: fontSize.sm, flex: 1,
    },
    conditionRow: { flexDirection: "row", gap: spacing.sm },
    conditionChip: {
      paddingHorizontal: spacing.md, paddingVertical: 6,
      borderRadius: borderRadius.full, borderWidth: 1,
    },
    conditionChipText: { fontSize: fontSize.sm },
    variantActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
    variantActionBtn: {
      flex: 1, borderWidth: 1, borderRadius: borderRadius.sm,
      paddingVertical: spacing.md, alignItems: "center",
    },
    variantActionBtnText: { fontSize: fontSize.sm, fontWeight: "600" },
    // Label on variant
    variantLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
    variantLabelBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBackground,
    },
    variantLabelBtnText: { color: colors.textMuted, fontSize: fontSize.xs },
    // Save button
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: borderRadius.sm,
      paddingVertical: spacing.lg, alignItems: "center", marginTop: spacing.lg,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: colors.primaryForeground, fontSize: fontSize.lg, fontWeight: "600" },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: "80%", paddingBottom: 32,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border, alignSelf: "center", marginTop: 12, marginBottom: 8,
    },
    modalHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
    modalItem: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalItemText: { color: colors.text, fontSize: fontSize.md },
    modalItemActive: { backgroundColor: colors.primary + "15" },
    modalItemCheck: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
    // Attribute select options
    attrOptionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  });

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {!editId && <DraftBanner drafts={otherDrafts} onResume={resumeFromOtherDevice} />}

        {/* ── Informations générales ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations générales</Text>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Nom <Text style={s.required}>*</Text></Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Nom du produit" placeholderTextColor={colors.placeholder} />
          </View>

          <View style={s.row}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Marque</Text>
              <TextInput style={s.input} value={brand} onChangeText={setBrand} placeholder="Apple, Samsung..." placeholderTextColor={colors.placeholder} />
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Modèle</Text>
              <TextInput style={s.input} value={model} onChangeText={setModel} placeholder="Pro Max..." placeholderTextColor={colors.placeholder} />
            </View>
          </View>

          {/* Category picker */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Catégorie <Text style={s.required}>*</Text></Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowCategoryPicker(true)}>
              {categoryId && selectedCategory ? (
                <Text style={s.pickerBtnText}>
                  {selectedCategory.name}{selectedCategory.hasVariants ? " (variantes)" : ""}
                </Text>
              ) : (
                <Text style={s.pickerBtnPlaceholder}>Sélectionner une catégorie</Text>
              )}
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Supplier picker */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Fournisseur</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowSupplierPicker(true)}>
              {supplierId ? (
                <Text style={s.pickerBtnText}>{suppliers.find((x) => x._id === supplierId)?.name || "—"}</Text>
              ) : (
                <Text style={s.pickerBtnPlaceholder}>Aucun fournisseur</Text>
              )}
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>Image URL</Text>
            <TextInput style={s.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor={colors.placeholder} />
          </View>
        </View>

        {/* ── Prix ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Prix</Text>
          <View style={s.row}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Achat</Text>
              <TextInput style={s.input} value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.label}>Revient</Text>
              <TextInput style={s.input} value={costPrice} onChangeText={setCostPrice} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
            </View>
          </View>
          <View style={s.fieldGroup}>
            <Text style={s.label}>Vente</Text>
            <TextInput style={s.input} value={sellingPrice} onChangeText={setSellingPrice} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
          </View>
          {!hasVariants && (
            <View style={s.fieldGroup}>
              <Text style={s.label}>Quantité</Text>
              <TextInput style={s.input} value={quantity} onChangeText={setQuantity} placeholder="1" placeholderTextColor={colors.placeholder} keyboardType="numeric" />
            </View>
          )}
        </View>

        {/* ── Étiquettes produit ── */}
        {labels.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Étiquettes</Text>
            <View style={s.chipRow}>
              {labels.map((lbl) => {
                const isActive = productLabelIds.includes(lbl.id);
                return (
                  <TouchableOpacity
                    key={lbl.id}
                    style={[s.labelChip, { backgroundColor: isActive ? lbl.color : colors.inputBackground, borderWidth: 1, borderColor: isActive ? lbl.color : colors.border }]}
                    onPress={() => {
                      setProductLabelIds((prev) =>
                        isActive ? prev.filter((id) => id !== lbl.id) : [...prev, lbl.id]
                      );
                    }}
                  >
                    <Tag size={10} color={isActive ? "#fff" : colors.textMuted} />
                    <Text style={[s.labelChipText, { color: isActive ? "#fff" : colors.textMuted }]}>{lbl.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Variantes (si catégorie avec variantes) ── */}
        {hasVariants && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>
              Variantes {variants.length > 0 ? `(${variants.filter((v) => !v.sold).length}/${variants.length})` : ""}
            </Text>

            {variants.map((variant, index) => (
              <View key={index} style={s.variantCard}>
                <View style={s.variantHeader}>
                  <Text style={s.variantIndex}>#{index + 1}</Text>
                  {variant.sold ? (
                    <View style={s.soldBadge}><Text style={s.soldBadgeText}>Vendu</Text></View>
                  ) : (
                    <TouchableOpacity onPress={() => removeVariant(index)} style={s.deleteBtn}>
                      <Text style={s.deleteBtnText}>Supprimer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Serial Number + scan */}
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={s.variantFieldLabel}>N/S (IMEI) *</Text>
                  <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                    <TextInput
                      style={[s.input, { flex: 1 }]} value={variant.serialNumber}
                      onChangeText={(t) => updateVariant(index, "serialNumber", t)}
                      placeholder="Numéro de série" placeholderTextColor={colors.placeholder}
                      editable={!variant.sold}
                    />
                    {!variant.sold && (
                      <TouchableOpacity
                        style={{ backgroundColor: colors.primary, borderRadius: borderRadius.sm, padding: 10 }}
                        onPress={() => setScanTarget({ index, field: "serialNumber" })}
                      >
                        <ScanLine size={20} color={colors.primaryForeground} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Condition */}
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={s.variantFieldLabel}>État</Text>
                  <View style={s.conditionRow}>
                    {CONDITION_OPTIONS.map((cond) => (
                      <TouchableOpacity
                        key={cond}
                        style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                          variant.condition === cond && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => !variant.sold && updateVariant(index, "condition", cond)}
                        disabled={variant.sold}
                      >
                        <Text style={[s.conditionChipText, { color: colors.textMuted },
                          variant.condition === cond && { color: colors.primaryForeground, fontWeight: "600" }]}>
                          {cond}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Price + Barcode */}
                <View style={[s.row, { marginBottom: spacing.sm }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.variantFieldLabel}>Prix</Text>
                    <TextInput
                      style={s.input} value={variant.price}
                      onChangeText={(t) => updateVariant(index, "price", t)}
                      placeholder={sellingPrice || "0"} placeholderTextColor={colors.placeholder}
                      keyboardType="numeric" editable={!variant.sold}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.variantFieldLabel}>Code-barres</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <TextInput
                        style={[s.input, { flex: 1 }]} value={variant.barcode}
                        onChangeText={(t) => updateVariant(index, "barcode", t)}
                        placeholder="Optionnel" placeholderTextColor={colors.placeholder}
                        editable={!variant.sold}
                      />
                      {!variant.sold && (
                        <TouchableOpacity
                          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, padding: 10 }}
                          onPress={() => setScanTarget({ index, field: "barcode" })}
                        >
                          <ScanLine size={18} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {/* Supplier per variant */}
                <View style={{ marginBottom: spacing.sm }}>
                  <Text style={s.variantFieldLabel}>Fournisseur</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={s.conditionRow}>
                      <TouchableOpacity
                        style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                          !variant.supplier && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => !variant.sold && updateVariant(index, "supplier", "")}
                        disabled={variant.sold}
                      >
                        <Text style={[s.conditionChipText, { color: colors.textMuted },
                          !variant.supplier && { color: colors.primaryForeground, fontWeight: "600" }]}>Global</Text>
                      </TouchableOpacity>
                      {suppliers.map((sup) => (
                        <TouchableOpacity
                          key={sup._id}
                          style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                            variant.supplier === sup._id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                          onPress={() => !variant.sold && updateVariant(index, "supplier", sup._id)}
                          disabled={variant.sold}
                        >
                          <Text style={[s.conditionChipText, { color: colors.textMuted },
                            variant.supplier === sup._id && { color: colors.primaryForeground, fontWeight: "600" }]}>{sup.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Label per variant */}
                {labels.length > 0 && (
                  <View style={{ marginBottom: spacing.sm }}>
                    <Text style={s.variantFieldLabel}>Étiquette</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={s.conditionRow}>
                        <TouchableOpacity
                          style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                            !variant.labelId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                          onPress={() => !variant.sold && updateVariant(index, "labelId", "")}
                          disabled={variant.sold}
                        >
                          <Text style={[s.conditionChipText, { color: colors.textMuted },
                            !variant.labelId && { color: colors.primaryForeground, fontWeight: "600" }]}>Aucune</Text>
                        </TouchableOpacity>
                        {labels.map((lbl) => (
                          <TouchableOpacity
                            key={lbl.id}
                            style={[s.conditionChip, { borderColor: lbl.color, borderWidth: 1 },
                              variant.labelId === lbl.id && { backgroundColor: lbl.color }]}
                            onPress={() => !variant.sold && updateVariant(index, "labelId", lbl.id)}
                            disabled={variant.sold}
                          >
                            <Text style={[s.conditionChipText, { color: variant.labelId === lbl.id ? "#fff" : lbl.color, fontWeight: "600" }]}>
                              {lbl.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Category custom attributes */}
                {categoryAttributes.length > 0 && (
                  <View>
                    {categoryAttributes.map((attr) => (
                      <View key={attr.name} style={{ marginBottom: spacing.sm }}>
                        <Text style={s.variantFieldLabel}>
                          {attr.name}{attr.required ? " *" : ""}
                        </Text>
                        {attr.type === "select" ? (
                          <View style={s.attrOptionRow}>
                            {attr.options.map((opt) => (
                              <TouchableOpacity
                                key={opt}
                                style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                                  variant.attributes[attr.name] === opt && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                onPress={() => !variant.sold && updateVariantAttribute(index, attr.name, opt)}
                                disabled={variant.sold}
                              >
                                <Text style={[s.conditionChipText, { color: colors.textMuted },
                                  variant.attributes[attr.name] === opt && { color: colors.primaryForeground, fontWeight: "600" }]}>
                                  {opt}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <TextInput
                            style={s.input}
                            value={variant.attributes[attr.name] || ""}
                            onChangeText={(t) => updateVariantAttribute(index, attr.name, t)}
                            placeholder={attr.name}
                            placeholderTextColor={colors.placeholder}
                            keyboardType={attr.type === "number" ? "numeric" : "default"}
                            editable={!variant.sold}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={s.variantActions}>
              <TouchableOpacity
                style={[s.variantActionBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={addVariant}
              >
                <Text style={[s.variantActionBtnText, { color: colors.primary }]}>+ Variante</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.variantActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setBulkModalVisible(true)}
              >
                <Text style={[s.variantActionBtnText, { color: colors.textMuted }]}>Import en masse</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Description & Notes ── */}
        <View style={s.section}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, s.inputMultiline]} value={description} onChangeText={setDescription}
              placeholder="Description optionnelle..." placeholderTextColor={colors.placeholder} multiline numberOfLines={3} />
          </View>
          <View style={s.fieldGroup}>
            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, s.inputMultiline]} value={notes} onChangeText={setNotes}
              placeholder="Notes internes..." placeholderTextColor={colors.placeholder} multiline numberOfLines={3} />
          </View>
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnDisabled]}
          onPress={handleSave} disabled={saving} activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.saveBtnText}>{editId ? "Enregistrer" : "Créer le produit"}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* ── Category Picker Modal ── */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => { setShowCategoryPicker(false); setShowNewCatForm(false); }}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Catégorie</Text>
              <TouchableOpacity onPress={() => { setShowCategoryPicker(false); setShowNewCatForm(false); }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: "600" }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Quick-create form */}
              {showNewCatForm ? (
                <View style={{ padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>Nouvelle catégorie</Text>
                  <TextInput
                    style={s.input} value={newCatName} onChangeText={setNewCatName}
                    placeholder="Nom de la catégorie" placeholderTextColor={colors.placeholder} autoFocus
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: fontSize.sm }}>Avec variantes (N/S, IMEI)</Text>
                    </View>
                    <Switch
                      value={newCatHasVariants} onValueChange={setNewCatHasVariants}
                      trackColor={{ false: colors.border, true: colors.primary + "80" }}
                      thumbColor={newCatHasVariants ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingVertical: spacing.md, alignItems: "center" }}
                      onPress={() => { setShowNewCatForm(false); setNewCatName(""); }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.sm, paddingVertical: spacing.md, alignItems: "center", opacity: creatingCat || !newCatName.trim() ? 0.5 : 1 }}
                      onPress={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}
                    >
                      {creatingCat ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text style={{ color: colors.primaryForeground, fontSize: fontSize.sm, fontWeight: "600" }}>Créer</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => setShowNewCatForm(true)}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: "600" }}>Créer une catégorie</Text>
                </TouchableOpacity>
              )}

              {categories.length === 0 && !showNewCatForm && (
                <View style={{ padding: spacing.xl, alignItems: "center" }}>
                  <Text style={{ color: colors.textDimmed, fontSize: fontSize.sm }}>Aucune catégorie — créez-en une ci-dessus</Text>
                </View>
              )}
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[s.modalItem, categoryId === cat._id && s.modalItemActive]}
                  onPress={() => { handleCategoryChange(cat._id); setShowCategoryPicker(false); setShowNewCatForm(false); }}
                >
                  <View>
                    <Text style={s.modalItemText}>{cat.name}</Text>
                    {cat.hasVariants && <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs }}>Avec variantes (N/S, IMEI)</Text>}
                  </View>
                  {categoryId === cat._id && <Text style={s.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Supplier Picker Modal ── */}
      <Modal visible={showSupplierPicker} transparent animationType="slide" onRequestClose={() => { setShowSupplierPicker(false); setShowNewSupForm(false); }}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Fournisseur</Text>
              <TouchableOpacity onPress={() => { setShowSupplierPicker(false); setShowNewSupForm(false); }}>
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: "600" }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Quick-create form */}
              {showNewSupForm ? (
                <View style={{ padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>Nouveau fournisseur</Text>
                  <View>
                    <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginBottom: 4 }}>Nom *</Text>
                    <TextInput
                      style={s.input} value={newSupForm.name}
                      onChangeText={(t) => setNewSupForm((f) => ({ ...f, name: t }))}
                      placeholder="Nom du fournisseur" placeholderTextColor={colors.placeholder} autoFocus
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginBottom: 4 }}>Téléphone</Text>
                      <TextInput
                        style={s.input} value={newSupForm.phone}
                        onChangeText={(t) => setNewSupForm((f) => ({ ...f, phone: t }))}
                        placeholder="77 123 45 67" placeholderTextColor={colors.placeholder}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginBottom: 4 }}>Email</Text>
                      <TextInput
                        style={s.input} value={newSupForm.email}
                        onChangeText={(t) => setNewSupForm((f) => ({ ...f, email: t }))}
                        placeholder="contact@fournisseur.com" placeholderTextColor={colors.placeholder}
                        keyboardType="email-address" autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginBottom: 4 }}>Adresse</Text>
                    <TextInput
                      style={s.input} value={newSupForm.address}
                      onChangeText={(t) => setNewSupForm((f) => ({ ...f, address: t }))}
                      placeholder="Adresse du fournisseur" placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingVertical: spacing.md, alignItems: "center" }}
                      onPress={() => { setShowNewSupForm(false); setNewSupForm({ name: "", phone: "", email: "", address: "" }); }}
                    >
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.sm, paddingVertical: spacing.md, alignItems: "center", opacity: creatingSup || !newSupForm.name.trim() ? 0.5 : 1 }}
                      onPress={handleCreateSupplier} disabled={creatingSup || !newSupForm.name.trim()}
                    >
                      {creatingSup ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text style={{ color: colors.primaryForeground, fontSize: fontSize.sm, fontWeight: "600" }}>Créer</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => setShowNewSupForm(true)}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: "600" }}>Créer un fournisseur</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.modalItem, !supplierId && s.modalItemActive]}
                onPress={() => { setSupplierId(""); setShowSupplierPicker(false); setShowNewSupForm(false); }}
              >
                <Text style={s.modalItemText}>Aucun fournisseur</Text>
                {!supplierId && <Text style={s.modalItemCheck}>✓</Text>}
              </TouchableOpacity>
              {suppliers.map((sup) => (
                <TouchableOpacity
                  key={sup._id}
                  style={[s.modalItem, supplierId === sup._id && s.modalItemActive]}
                  onPress={() => { setSupplierId(sup._id); setShowSupplierPicker(false); setShowNewSupForm(false); }}
                >
                  <Text style={s.modalItemText}>{sup.name}</Text>
                  {supplierId === sup._id && <Text style={s.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Bulk Import Modal ── */}
      <Modal visible={bulkModalVisible} animationType="slide" transparent onRequestClose={() => setBulkModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Import en masse</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Text style={{ color: colors.primary, fontSize: fontSize.md, fontWeight: "600" }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
              <View>
                <Text style={s.label}>Numéros de série (un par ligne)</Text>
                <TextInput
                  style={[s.input, s.inputMultiline, { minHeight: 120 }]}
                  value={bulkSerials} onChangeText={setBulkSerials}
                  placeholder={"IMEI1\nIMEI2\nIMEI3"} placeholderTextColor={colors.placeholder}
                  multiline numberOfLines={6}
                />
              </View>
              <View>
                <Text style={s.label}>État</Text>
                <View style={s.conditionRow}>
                  {CONDITION_OPTIONS.map((cond) => (
                    <TouchableOpacity
                      key={cond}
                      style={[s.conditionChip, { backgroundColor: colors.card, borderColor: colors.border },
                        bulkCondition === cond && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setBulkCondition(cond)}
                    >
                      <Text style={[s.conditionChipText, { color: colors.textMuted },
                        bulkCondition === cond && { color: colors.primaryForeground, fontWeight: "600" }]}>{cond}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={s.label}>Prix (optionnel)</Text>
                <TextInput style={s.input} value={bulkPrice} onChangeText={setBulkPrice}
                  placeholder={sellingPrice || "0"} placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
              <View style={s.row}>
                <TouchableOpacity
                  style={[s.variantActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setBulkModalVisible(false)}
                >
                  <Text style={[s.variantActionBtnText, { color: colors.textMuted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.variantActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleBulkImport}
                >
                  <Text style={[s.variantActionBtnText, { color: colors.primaryForeground }]}>Importer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Barcode Scanner ── */}
      <BarcodeScanner
        visible={scanTarget !== null}
        title={scanTarget?.field === "serialNumber" ? "Scanner N/S / IMEI" : "Scanner code-barres"}
        onClose={() => setScanTarget(null)}
        onScanned={(data) => {
          if (scanTarget) {
            updateVariant(scanTarget.index, scanTarget.field, data);
            setScanTarget(null);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}
