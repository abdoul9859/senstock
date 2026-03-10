import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Plus, Calendar, User, MoreVertical } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type RouteDef = RouteProp<ModulesStackParamList, "TaskBoardDetail">;

interface Card {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: { name?: string } | string;
  dueDate?: string;
  columnId?: string;
}

interface Column {
  _id: string;
  title: string;
  cards: Card[];
}

interface Board {
  _id: string;
  name: string;
  description?: string;
  columns: Column[];
}

const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

export default function TaskBoardDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const { boardId } = route.params;
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const PRIORITY_COLORS: Record<string, string> = {
    haute: colors.destructive,
    moyenne: colors.warning,
    basse: colors.info,
  };

  // Add card modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addColumnId, setAddColumnId] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDesc, setCardDesc] = useState("");
  const [cardPriority, setCardPriority] = useState<string>("moyenne");
  const [cardDueDate, setCardDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Move card
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveCard, setMoveCard] = useState<Card | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/tasks/boards/${boardId}`);
      if (res.ok) {
        setBoard(await res.json());
      }
    } catch {
      showAlert("Erreur", "Impossible de charger le tableau");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleAddCard = async () => {
    if (!cardTitle.trim()) {
      showAlert("Erreur", "Le titre est requis");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/tasks/cards", {
        method: "POST",
        body: JSON.stringify({
          columnId: addColumnId,
          title: cardTitle.trim(),
          description: cardDesc.trim() || undefined,
          priority: cardPriority,
          dueDate: cardDueDate.trim() || undefined,
        }),
      });
      if (res.ok) {
        setAddModalVisible(false);
        setCardTitle("");
        setCardDesc("");
        setCardPriority("moyenne");
        setCardDueDate("");
        fetchBoard();
      } else {
        showAlert("Erreur", "Impossible de creer la carte");
      }
    } catch {
      showAlert("Erreur", "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveCard = async (targetColumnId: string) => {
    if (!moveCard) return;
    try {
      const res = await apiFetch("/api/tasks/cards/move", {
        method: "POST",
        body: JSON.stringify({
          cardId: moveCard._id,
          targetColumnId,
          position: 0,
        }),
      });
      if (res.ok) {
        setMoveModalVisible(false);
        setMoveCard(null);
        fetchBoard();
      } else {
        showAlert("Erreur", "Impossible de deplacer la carte");
      }
    } catch {
      showAlert("Erreur", "Erreur de connexion");
    }
  };

  const openMoveMenu = (card: Card) => {
    setMoveCard(card);
    setMoveModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!board) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Tableau introuvable</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchBoard();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {board.columns.map((column) => (
          <View key={column._id} style={[styles.column, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Column header */}
            <View style={styles.columnHeader}>
              <Text style={[styles.columnTitle, { color: colors.text }]} numberOfLines={1}>
                {column.title}
              </Text>
              <View style={[styles.columnBadge, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.columnBadgeText, { color: colors.textDimmed }]}>
                  {column.cards.length}
                </Text>
              </View>
            </View>

            {/* Cards */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.cardsScroll}
            >
              {column.cards.map((card) => {
                const priorityColor =
                  PRIORITY_COLORS[card.priority || ""] || colors.textDimmed;
                const priorityLabel =
                  PRIORITY_LABELS[card.priority || ""] || card.priority;
                const assigneeName =
                  typeof card.assignee === "object" && card.assignee
                    ? card.assignee.name
                    : typeof card.assignee === "string"
                    ? card.assignee
                    : null;

                return (
                  <TouchableOpacity
                    key={card._id}
                    style={[styles.taskCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onLongPress={() => openMoveMenu(card)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.taskCardHeader}>
                      <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
                        {card.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => openMoveMenu(card)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MoreVertical
                          size={16}
                          color={colors.textDimmed}
                        />
                      </TouchableOpacity>
                    </View>
                    {card.priority && (
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${priorityColor}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: priorityColor },
                          ]}
                        >
                          {priorityLabel}
                        </Text>
                      </View>
                    )}
                    <View style={styles.taskCardFooter}>
                      {assigneeName && (
                        <View style={styles.taskMeta}>
                          <User size={12} color={colors.textDimmed} />
                          <Text style={[styles.taskMetaText, { color: colors.textDimmed }]} numberOfLines={1}>
                            {assigneeName}
                          </Text>
                        </View>
                      )}
                      {card.dueDate && (
                        <View style={styles.taskMeta}>
                          <Calendar size={12} color={colors.textDimmed} />
                          <Text style={[styles.taskMetaText, { color: colors.textDimmed }]}>
                            {new Date(card.dueDate).toLocaleDateString(
                              "fr-FR",
                              { day: "numeric", month: "short" }
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Add card button */}
            <TouchableOpacity
              style={[styles.addCardBtn, { borderColor: colors.border }]}
              onPress={() => {
                setAddColumnId(column._id);
                setAddModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.textDimmed} />
              <Text style={[styles.addCardText, { color: colors.textDimmed }]}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Add card modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle carte</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Titre</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={cardTitle}
                onChangeText={setCardTitle}
                placeholder="Titre de la tache"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={cardDesc}
                onChangeText={setCardDesc}
                placeholder="Description..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Priorite</Text>
              <View style={styles.priorityRow}>
                {(["basse", "moyenne", "haute"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      cardPriority === p && {
                        backgroundColor: `${PRIORITY_COLORS[p]}20`,
                        borderColor: PRIORITY_COLORS[p],
                      },
                    ]}
                    onPress={() => setCardPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityBtnText,
                        { color: colors.textMuted },
                        cardPriority === p && {
                          color: PRIORITY_COLORS[p],
                        },
                      ]}
                    >
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Date limite (AAAA-MM-JJ, optionnel)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={cardDueDate}
                onChangeText={setCardDueDate}
                placeholder="Ex: 2026-03-15"
                placeholderTextColor={colors.placeholder}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    setAddModalVisible(false);
                    setCardTitle("");
                    setCardDesc("");
                    setCardPriority("moyenne");
                    setCardDueDate("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddCard}
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Move card modal */}
      <Modal
        visible={moveModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setMoveModalVisible(false);
          setMoveCard(null);
        }}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => {
            setMoveModalVisible(false);
            setMoveCard(null);
          }}
        >
          <View style={[styles.moveModalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Deplacer vers
            </Text>
            {board.columns.map((col) => (
              <TouchableOpacity
                key={col._id}
                style={[styles.moveOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleMoveCard(col._id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.moveOptionText, { color: colors.text }]}>{col.title}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.moveCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                setMoveModalVisible(false);
                setMoveCard(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const COLUMN_WIDTH = 280;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: fontSize.md,
  },
  boardScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  column: {
    width: COLUMN_WIDTH,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.md,
    padding: spacing.md,
    maxHeight: "100%",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  columnTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    flex: 1,
  },
  columnBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  columnBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardsScroll: {
    flex: 1,
  },
  taskCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  taskCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    flex: 1,
  },
  priorityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  taskCardFooter: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskMetaText: {
    fontSize: fontSize.xs,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addCardText: {
    fontSize: fontSize.sm,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: "85%",
  },
  moveModalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.lg,
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
  priorityRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityBtnText: {
    fontSize: fontSize.sm,
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
  moveOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  moveOptionText: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  moveCancelBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
