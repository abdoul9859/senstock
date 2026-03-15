import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { Plus, Folder, X, Pencil, Trash2, ChevronDown } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Category } from "../../types";

interface Attribute {
  name: string;
  type: "text" | "number" | "select";
  options: string[];
  required: boolean;
}

interface CategoryForm {
  name: string;
  description: string;
  hasVariants: boolean;
  attributes: Attribute[];
}

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  hasVariants: false,
  attributes: [],
};

const ATTR_TYPES = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "select", label: "Liste de sélection" },
] as const;

export default function CategoriesScreen() {
  const { colors } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Action modal (long press)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Type picker for attributes
  const [typePickerIndex, setTypePickerIndex] = useState<number | null>(null);

  // ── Fetch ──

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiFetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, [fetchCategories]);

  // ── Open create / edit ──

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowFormModal(true);
  }

  function openEdit(cat: any) {
    setEditingId(cat._id);
    setForm({
      name: cat.name || "",
      description: cat.description || "",
      hasVariants: cat.hasVariants || false,
      attributes: (cat.attributes || []).map((a: Attribute) => ({
        ...a,
        options: [...(a.options || [])],
      })),
    });
    setError("");
    setShowActionModal(false);
    setShowFormModal(true);
  }

  // ── Save ──

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom est requis");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la sauvegarde");
        return;
      }
      setShowFormModal(false);
      fetchCategories();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──

  function confirmDelete() {
    if (!selectedCategory) return;
    setShowActionModal(false);
    showConfirm(
      "Supprimer la catégorie",
      `Voulez-vous vraiment supprimer « ${selectedCategory.name} » ?`,
      handleDelete
    );
  }

  async function handleDelete() {
    const id = editingId || selectedCategory?._id;
    if (!id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShowFormModal(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de suppression");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ── Attribute helpers ──

  function addAttribute() {
    setForm((f) => ({
      ...f,
      attributes: [...f.attributes, { name: "", type: "text", options: [], required: false }],
    }));
  }

  function updateAttribute(index: number, updates: Partial<Attribute>) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) => (i === index ? { ...a, ...updates } : a)),
    }));
  }

  function removeAttribute(index: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== index),
    }));
  }

  function addOption(attrIndex: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex ? { ...a, options: [...a.options, ""] } : a
      ),
    }));
  }

  function updateOption(attrIndex: number, optIndex: number, value: string) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex
          ? { ...a, options: a.options.map((o, j) => (j === optIndex ? value : o)) }
          : a
      ),
    }));
  }

  function removeOption(attrIndex: number, optIndex: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex ? { ...a, options: a.options.filter((_, j) => j !== optIndex) } : a
      ),
    }));
  }

  // ── Long press handler ──

  function handleLongPress(category: Category) {
    setSelectedCategory(category);
    setShowActionModal(true);
  }

  // ── Styles ──

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
    addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg },
    addText: { color: colors.primary, fontSize: fontSize.md, fontWeight: "500" },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
    card: {
      flexDirection: "row", alignItems: "center", gap: spacing.md,
      backgroundColor: colors.card, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    cardContent: { flex: 1 },
    cardName: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    cardSub: { color: colors.textDimmed, fontSize: fontSize.xs, marginTop: 2 },
    empty: { alignItems: "center", paddingVertical: spacing.xxxl },
    emptyText: { color: colors.textDimmed, fontSize: fontSize.md },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: "90%", paddingBottom: 32,
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
    scrollContent: { padding: spacing.lg, gap: spacing.lg },
    label: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", marginBottom: 4 },
    input: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
      color: colors.text, fontSize: fontSize.md,
    },
    inputSmall: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8,
      color: colors.text, fontSize: fontSize.sm, flex: 1,
    },
    switchRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, padding: spacing.md,
    },
    switchLabel: { flex: 1, marginRight: spacing.md },
    switchTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: "500" },
    switchDesc: { color: colors.textDimmed, fontSize: fontSize.xs, marginTop: 2 },
    sectionHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    sectionTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
    attrCard: {
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm, padding: spacing.md, gap: spacing.sm,
    },
    attrRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    typeBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8,
      minWidth: 100,
    },
    typeBtnText: { color: colors.text, fontSize: fontSize.sm },
    requiredRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    requiredText: { color: colors.textDimmed, fontSize: fontSize.xs },
    optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginLeft: spacing.sm },
    addOptionBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: spacing.sm, paddingVertical: 4 },
    addOptionText: { color: colors.primary, fontSize: fontSize.xs },
    hintText: { color: colors.textDimmed, fontSize: fontSize.xs },
    error: { color: colors.destructive, fontSize: fontSize.sm, textAlign: "center" },
    footer: {
      flexDirection: "row", gap: spacing.sm,
      paddingHorizontal: spacing.lg, paddingTop: spacing.md,
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    btnPrimary: {
      flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.sm,
      paddingVertical: spacing.md, alignItems: "center", minHeight: 44,
    },
    btnPrimaryText: { color: colors.primaryForeground, fontSize: fontSize.md, fontWeight: "600" },
    btnCancel: {
      flex: 1, backgroundColor: colors.cardAlt, borderRadius: borderRadius.sm,
      borderWidth: 1, borderColor: colors.border,
      paddingVertical: spacing.md, alignItems: "center", minHeight: 44,
    },
    btnCancelText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "500" },
    btnDestructive: {
      backgroundColor: colors.destructive, borderRadius: borderRadius.sm,
      paddingVertical: 8, paddingHorizontal: spacing.md, alignItems: "center",
    },
    btnDestructiveText: { color: "#fff", fontSize: fontSize.sm, fontWeight: "600" },
    btnSmall: {
      backgroundColor: colors.primary, borderRadius: borderRadius.sm,
      paddingVertical: 6, paddingHorizontal: spacing.md,
    },
    btnSmallText: { color: colors.primaryForeground, fontSize: fontSize.xs, fontWeight: "600" },
    btnGhostIcon: { padding: 4 },
    // Action modal
    actionModalContent: {
      width: "85%", backgroundColor: colors.card, borderRadius: borderRadius.lg,
      padding: spacing.xxl, gap: spacing.lg, alignSelf: "center",
    },
    actionOverlay: {
      flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center",
    },
    actionItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
    actionText: { color: colors.text, fontSize: fontSize.md, fontWeight: "500" },
    actionTextDestructive: { color: colors.destructive, fontSize: fontSize.md, fontWeight: "500" },
    separator: { height: 1, backgroundColor: colors.border },
    // Type picker modal
    typePickerOverlay: {
      flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center",
    },
    typePickerContent: {
      width: "70%", backgroundColor: colors.card, borderRadius: borderRadius.lg,
      padding: spacing.lg, gap: spacing.sm,
    },
    typePickerItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.sm },
    typePickerItemActive: { backgroundColor: colors.primary + "20" },
    typePickerText: { color: colors.text, fontSize: fontSize.md },
    typePickerTextActive: { color: colors.primary, fontWeight: "600" },
  });

  // ── Loading ──

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Add button */}
      <TouchableOpacity style={s.addRow} onPress={openCreate}>
        <Plus size={18} color={colors.primary} />
        <Text style={s.addText}>Ajouter une catégorie</Text>
      </TouchableOpacity>

      {/* Category list */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => openEdit(item)}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <Folder size={18} color={colors.primary} />
            <View style={s.cardContent}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardSub}>
                {(item as any).attributes?.length || 0} attribut{((item as any).attributes?.length || 0) !== 1 ? "s" : ""}
                {(item as any).hasVariants ? " · Variantes" : ""}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucune catégorie</Text>
          </View>
        }
      />

      {/* ── Form Modal (Create / Edit) ── */}
      <Modal
        visible={showFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <View style={s.modalHandle} />
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}
                </Text>
                <TouchableOpacity onPress={() => setShowFormModal(false)}>
                  <X size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {error ? <Text style={s.error}>{error}</Text> : null}

                {/* Name */}
                <View>
                  <Text style={s.label}>Nom</Text>
                  <TextInput
                    style={s.input}
                    value={form.name}
                    onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                    placeholder="Ex: Smartphone"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text style={s.label}>Description</Text>
                  <TextInput
                    style={s.input}
                    value={form.description}
                    onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                    placeholder="Description optionnelle"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>

                {/* hasVariants */}
                <View style={s.switchRow}>
                  <View style={s.switchLabel}>
                    <Text style={s.switchTitle}>Produits avec variantes</Text>
                    <Text style={s.switchDesc}>Activer pour les produits avec N/S ou IMEI</Text>
                  </View>
                  <Switch
                    value={form.hasVariants}
                    onValueChange={(v) => setForm((f) => ({ ...f, hasVariants: v }))}
                    trackColor={{ false: colors.border, true: colors.primary + "80" }}
                    thumbColor={form.hasVariants ? colors.primary : colors.textMuted}
                  />
                </View>

                {/* Attributes */}
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Attributs personnalisés</Text>
                  <TouchableOpacity style={s.btnSmall} onPress={addAttribute}>
                    <Text style={s.btnSmallText}>+ Ajouter</Text>
                  </TouchableOpacity>
                </View>

                {form.attributes.length === 0 && (
                  <Text style={s.hintText}>
                    Aucun attribut. Ajoutez des attributs comme Stockage, RAM, Couleur...
                  </Text>
                )}

                {form.attributes.map((attr, ai) => (
                  <View key={ai} style={s.attrCard}>
                    {/* Attribute name + type + remove */}
                    <View style={s.attrRow}>
                      <TextInput
                        style={s.inputSmall}
                        value={attr.name}
                        onChangeText={(t) => updateAttribute(ai, { name: t })}
                        placeholder="Ex: Stockage"
                        placeholderTextColor={colors.placeholder}
                      />
                      <TouchableOpacity style={s.typeBtn} onPress={() => setTypePickerIndex(ai)}>
                        <Text style={s.typeBtnText}>
                          {ATTR_TYPES.find((t) => t.value === attr.type)?.label || "Texte"}
                        </Text>
                        <ChevronDown size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnGhostIcon} onPress={() => removeAttribute(ai)}>
                        <Trash2 size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>

                    {/* Required switch */}
                    <View style={s.requiredRow}>
                      <Switch
                        value={attr.required}
                        onValueChange={(v) => updateAttribute(ai, { required: v })}
                        trackColor={{ false: colors.border, true: colors.primary + "80" }}
                        thumbColor={attr.required ? colors.primary : colors.textMuted}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <Text style={s.requiredText}>Obligatoire</Text>
                    </View>

                    {/* Options for select type */}
                    {attr.type === "select" && (
                      <View style={{ gap: spacing.sm }}>
                        <Text style={[s.label, { marginBottom: 0 }]}>Options</Text>
                        {attr.options.map((opt, oi) => (
                          <View key={oi} style={s.optionRow}>
                            <TextInput
                              style={s.inputSmall}
                              value={opt}
                              onChangeText={(t) => updateOption(ai, oi, t)}
                              placeholder={`Option ${oi + 1}`}
                              placeholderTextColor={colors.placeholder}
                            />
                            <TouchableOpacity style={s.btnGhostIcon} onPress={() => removeOption(ai, oi)}>
                              <Trash2 size={14} color={colors.destructive} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <TouchableOpacity style={s.addOptionBtn} onPress={() => addOption(ai)}>
                          <Plus size={12} color={colors.primary} />
                          <Text style={s.addOptionText}>Ajouter une option</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                {/* Delete button (edit mode) */}
                {editingId && (
                  <TouchableOpacity style={s.btnDestructive} onPress={() => {
                    showConfirm("Supprimer", `Supprimer « ${form.name} » ?`, handleDelete);
                  }}>
                    <Text style={s.btnDestructiveText}>Supprimer la catégorie</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={s.footer}>
                <TouchableOpacity style={s.btnCancel} onPress={() => setShowFormModal(false)}>
                  <Text style={s.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPrimary, (saving || !form.name.trim()) && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={saving || !form.name.trim()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={s.btnPrimaryText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Action Modal (long press) ── */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowActionModal(false); setSelectedCategory(null); }}
      >
        <TouchableOpacity style={s.actionOverlay} activeOpacity={1} onPress={() => { setShowActionModal(false); setSelectedCategory(null); }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.actionModalContent}>
              <Text style={s.modalTitle}>{selectedCategory?.name}</Text>

              <TouchableOpacity style={s.actionItem} onPress={() => selectedCategory && openEdit(selectedCategory)}>
                <Pencil size={18} color={colors.primary} />
                <Text style={s.actionText}>Modifier</Text>
              </TouchableOpacity>

              <View style={s.separator} />

              <TouchableOpacity style={s.actionItem} onPress={confirmDelete}>
                <Trash2 size={18} color={colors.destructive} />
                <Text style={s.actionTextDestructive}>Supprimer</Text>
              </TouchableOpacity>

              <View style={s.separator} />

              <TouchableOpacity style={s.btnCancel} onPress={() => { setShowActionModal(false); setSelectedCategory(null); }}>
                <Text style={s.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Type Picker Modal ── */}
      <Modal
        visible={typePickerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerIndex(null)}
      >
        <TouchableOpacity style={s.typePickerOverlay} activeOpacity={1} onPress={() => setTypePickerIndex(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={s.typePickerContent}>
              <Text style={[s.modalTitle, { fontSize: fontSize.md }]}>Type d'attribut</Text>
              {ATTR_TYPES.map((t) => {
                const isActive = typePickerIndex !== null && form.attributes[typePickerIndex]?.type === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.typePickerItem, isActive && s.typePickerItemActive]}
                    onPress={() => {
                      if (typePickerIndex !== null) {
                        updateAttribute(typePickerIndex, {
                          type: t.value as Attribute["type"],
                          options: t.value === "select" ? form.attributes[typePickerIndex].options : [],
                        });
                      }
                      setTypePickerIndex(null);
                    }}
                  >
                    <Text style={[s.typePickerText, isActive && s.typePickerTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
