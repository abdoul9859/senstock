import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Plus, Pencil, Trash2, Tag } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface ProductLabel {
  id: string;
  name: string;
  description: string;
  color: string;
  _count?: { products: number };
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

export default function LabelsScreen() {
  const { colors } = useTheme();
  const [labels, setLabels] = useState<ProductLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductLabel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  const fetchLabels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/product-labels");
      if (res.ok) setLabels(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", color: "#6366f1" });
    setModalOpen(true);
  }

  function openEdit(label: ProductLabel) {
    setEditing(label);
    setForm({ name: label.name, description: label.description, color: label.color });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert("Erreur", "Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/product-labels/${editing.id}` : "/api/product-labels";
      const method = editing ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        fetchLabels();
      } else {
        const err = await res.json();
        Alert.alert("Erreur", err.error || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(label: ProductLabel) {
    Alert.alert(
      "Supprimer l'étiquette",
      `Supprimer "${label.name}" ? Elle sera retirée de tous les produits.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const res = await apiFetch(`/api/product-labels/${label.id}`, { method: "DELETE" });
            if (res.ok) setLabels((prev) => prev.filter((l) => l.id !== label.id));
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        onPress={openCreate}
        activeOpacity={0.8}
      >
        <Plus size={18} color={colors.primaryForeground} />
        <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
          Nouvelle étiquette
        </Text>
      </TouchableOpacity>

      {labels.length === 0 ? (
        <View style={styles.center}>
          <Tag size={40} color={colors.textDimmed} />
          <Text style={[styles.emptyText, { color: colors.textDimmed }]}>
            Aucune étiquette créée
          </Text>
        </View>
      ) : (
        <FlatList
          data={labels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={[styles.labelName, { color: colors.text }]}>{item.name}</Text>
                  <View style={[styles.badge, { backgroundColor: item.color }]}>
                    <Text style={styles.badgeText}>
                      {item._count?.products ?? 0} produit{(item._count?.products ?? 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                {!!item.description && (
                  <Text style={[styles.desc, { color: colors.textDimmed }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                  <Pencil size={16} color={colors.textDimmed} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editing ? "Modifier l'étiquette" : "Nouvelle étiquette"}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textDimmed }]}>Nom *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Ex: Reconditionné, Premium..."
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.fieldLabel, { color: colors.textDimmed }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Description optionnelle"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.fieldLabel, { color: colors.textDimmed }]}>Couleur</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm((f) => ({ ...f, color: c }))}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    form.color === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </ScrollView>

            <View style={[styles.preview, { backgroundColor: form.color + "22" }]}>
              <View style={[styles.dot, { backgroundColor: form.color }]} />
              <Text style={{ color: form.color, fontSize: fontSize.sm, fontWeight: "600" }}>
                {form.name || "Aperçu"}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={{ color: colors.textDimmed }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
                  {saving ? "..." : editing ? "Modifier" : "Créer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  emptyText: { fontSize: fontSize.base },
  list: { padding: spacing.lg },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
  },
  addBtnText: { fontSize: fontSize.sm, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  labelName: { fontSize: fontSize.sm, fontWeight: "600" },
  badge: { borderRadius: 99, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  desc: { fontSize: fontSize.xs, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.xs },
  iconBtn: { padding: spacing.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "700", marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  colorRow: { marginVertical: spacing.sm },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.sm,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
    transform: [{ scale: 1.15 }],
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
});
