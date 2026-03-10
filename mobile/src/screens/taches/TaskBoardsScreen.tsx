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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Trash2, Columns } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "TaskBoards">;

interface Board {
  _id: string;
  name: string;
  description?: string;
  columns?: any[];
  columnCount?: number;
  cardCount?: number;
}

export default function TaskBoardsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const fetchBoards = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tasks/boards");
      if (res.ok) setBoards(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchBoards();
    });
    return unsubscribe;
  }, [nav, fetchBoards]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBoards();
  }, [fetchBoards]);

  const handleCreate = async () => {
    if (!formName.trim()) {
      showAlert("Erreur", "Le nom est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/tasks/boards", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setBoards((prev) => [created, ...prev]);
        setModalVisible(false);
        setFormName("");
        setFormDesc("");
      } else {
        showAlert("Erreur", "Impossible de creer le tableau");
      }
    } catch {
      showAlert("Erreur", "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (board: Board) => {
    showConfirm("Supprimer", `Supprimer "${board.name}" ?`, async () => {
          try {
            const res = await apiFetch(`/api/tasks/boards/${board._id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setBoards((prev) => prev.filter((b) => b._id !== board._id));
            } else {
              showAlert("Erreur", "Impossible de supprimer");
            }
          } catch {
            showAlert("Erreur", "Erreur de connexion");
          }
        });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderBoard = ({ item }: { item: Board }) => {
    const colCount =
      item.columnCount ?? (item.columns ? item.columns.length : 0);
    const crdCount =
      item.cardCount ??
      (item.columns
        ? item.columns.reduce(
            (sum: number, col: any) =>
              sum + (col.cards ? col.cards.length : 0),
            0
          )
        : 0);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("TaskBoardDetail", { boardId: item._id })}
        activeOpacity={0.7}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.cardAlt }]}>
          <Columns size={20} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.boardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={[styles.boardDesc, { color: colors.textMuted }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text style={[styles.boardMeta, { color: colors.textDimmed }]}>
            {colCount} colonne{colCount !== 1 ? "s" : ""} ·{" "}
            {crdCount} carte{crdCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={colors.destructive} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with add */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          {boards.length} tableau{boards.length !== 1 ? "x" : ""}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={boards}
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
        renderItem={renderBoard}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun tableau</Text>
          </View>
        }
      />

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau tableau</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={formName}
              onChangeText={setFormName}
              placeholder="Ex: Sprint 1"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={formDesc}
              onChangeText={setFormDesc}
              placeholder="Description du tableau..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setModalVisible(false);
                  setFormName("");
                  setFormDesc("");
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                activeOpacity={0.7}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Text style={[styles.modalSubmitText, { color: colors.primaryForeground }]}>Creer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  boardName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  boardDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  boardMeta: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  modalSubmitText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
