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
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { Plus, Folder, X, Pencil, Trash2 } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Category } from "../../types";

export default function CategoriesScreen() {
  const { colors } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Action modal (long press)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

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

  // ── Create ──

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreateModal(false);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de création");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit ──

  function openEditModal() {
    if (!selectedCategory) return;
    setEditName(selectedCategory.name);
    setShowActionModal(false);
    setShowEditModal(true);
  }

  async function handleEdit() {
    if (!selectedCategory || !editName.trim()) return;
    setEditing(true);
    try {
      const res = await apiFetch(`/api/categories/${selectedCategory._id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de modification");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setEditing(false);
    }
  }

  // ── Delete ──

  function confirmDelete() {
    if (!selectedCategory) return;
    setShowActionModal(false);
    showConfirm(
      "Supprimer la catégorie",
      `Voulez-vous vraiment supprimer « ${selectedCategory.name} » ?`, handleDelete);
  }

  async function handleDelete() {
    if (!selectedCategory) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/categories/${selectedCategory._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedCategory(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Erreur de suppression");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setDeleting(false);
    }
  }

  // ── Long press handler ──

  function handleLongPress(category: Category) {
    setSelectedCategory(category);
    setShowActionModal(true);
  }

  // ── Styles (dynamic, using theme colors) ──

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    addText: {
      color: colors.primary,
      fontSize: fontSize.md,
      fontWeight: "500",
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    cardName: {
      flex: 1,
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "500",
    },
    empty: {
      alignItems: "center",
      paddingVertical: spacing.xxxl,
    },
    emptyText: {
      color: colors.textDimmed,
      fontSize: fontSize.md,
    },
    // Modal shared
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "85%",
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xxl,
      gap: spacing.lg,
    },
    modalTitle: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
      textAlign: "center",
    },
    modalInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      color: colors.text,
      fontSize: fontSize.md,
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
    },
    btnPrimaryText: {
      color: colors.primaryForeground,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    btnCancel: {
      flex: 1,
      backgroundColor: colors.cardAlt,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
    },
    btnCancelText: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      fontWeight: "500",
    },
    // Action modal
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    actionText: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "500",
    },
    actionTextDestructive: {
      color: colors.destructive,
      fontSize: fontSize.md,
      fontWeight: "500",
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    btnDestructive: {
      flex: 1,
      backgroundColor: colors.destructive,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
    },
    btnDestructiveText: {
      color: colors.destructiveForeground,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
  });

  // ── Loading ──

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add button */}
      <TouchableOpacity style={styles.addRow} onPress={() => setShowCreateModal(true)}>
        <Plus size={18} color={colors.primary} />
        <Text style={styles.addText}>Ajouter une catégorie</Text>
      </TouchableOpacity>

      {/* Category list */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <Folder size={18} color={colors.primary} />
            <Text style={styles.cardName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune catégorie</Text>
          </View>
        }
      />

      {/* ── Create Modal ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nouvelle catégorie</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Nom de la catégorie"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => {
                    setNewName("");
                    setShowCreateModal(false);
                  }}
                >
                  <Text style={styles.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={handleCreate}
                  disabled={saving || !newName.trim()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Créer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Action Modal (long press) ── */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowActionModal(false);
          setSelectedCategory(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowActionModal(false);
            setSelectedCategory(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>

              <TouchableOpacity style={styles.actionItem} onPress={openEditModal}>
                <Pencil size={18} color={colors.primary} />
                <Text style={styles.actionText}>Modifier</Text>
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity style={styles.actionItem} onPress={confirmDelete}>
                <Trash2 size={18} color={colors.destructive} />
                <Text style={styles.actionTextDestructive}>Supprimer</Text>
              </TouchableOpacity>

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => {
                  setShowActionModal(false);
                  setSelectedCategory(null);
                }}
              >
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedCategory(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Modifier la catégorie</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nom de la catégorie"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => {
                    setShowEditModal(false);
                    setSelectedCategory(null);
                  }}
                >
                  <Text style={styles.btnCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={handleEdit}
                  disabled={editing || !editName.trim()}
                >
                  {editing ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
