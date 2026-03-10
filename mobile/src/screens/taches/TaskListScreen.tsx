import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  } from "react-native";
import { showConfirm } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Calendar } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "TaskList">;

type TaskFilter = "all" | "a_faire" | "en_cours" | "termine";

interface FlatTask {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  boardId: string;
  boardName: string;
  columnId: string;
  columnName: string;
}

const FILTERS: { label: string; value: TaskFilter }[] = [
  { label: "Toutes", value: "all" },
  { label: "A faire", value: "a_faire" },
  { label: "En cours", value: "en_cours" },
  { label: "Termine", value: "termine" },
];

const PRIORITY_LABELS: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

// Map column names to filter values
function columnToFilter(columnName: string): TaskFilter {
  const lower = columnName.toLowerCase().trim();
  if (
    lower.includes("fait") ||
    lower.includes("done") ||
    lower.includes("termin") ||
    lower.includes("complete")
  ) {
    return "termine";
  }
  if (
    lower.includes("cours") ||
    lower.includes("progress") ||
    lower.includes("doing")
  ) {
    return "en_cours";
  }
  return "a_faire";
}

export default function TaskListScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [tasks, setTasks] = useState<FlatTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("all");

  const PRIORITY_COLORS: Record<string, string> = {
    haute: colors.destructive,
    moyenne: colors.warning,
    basse: colors.info,
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tasks/boards");
      if (res.ok) {
        const boards: any[] = await res.json();
        const flat: FlatTask[] = [];
        for (const board of boards) {
          const cols = board.columns || [];
          for (const col of cols) {
            const cards = col.cards || [];
            for (const card of cards) {
              flat.push({
                _id: card._id,
                title: card.title,
                description: card.description,
                priority: card.priority,
                dueDate: card.dueDate,
                boardId: board._id,
                boardName: board.name,
                columnId: col._id,
                columnName: col.title,
              });
            }
          }
        }
        setTasks(flat);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchTasks();
    });
    return unsubscribe;
  }, [nav, fetchTasks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    return columnToFilter(t.columnName) === filter;
  });

  const handleTaskPress = (task: FlatTask) => {
    const body = [
        task.description || "",
        `Tableau : ${task.boardName}`,
        `Colonne : ${task.columnName}`,
        task.priority
          ? `Priorite : ${PRIORITY_LABELS[task.priority] || task.priority}`
          : "",
        task.dueDate
          ? `Echeance : ${new Date(task.dueDate).toLocaleDateString("fr-FR")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    showConfirm(
      task.title, body, () =>
            nav.navigate("TaskBoardDetail", { boardId: task.boardId }));
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderTask = ({ item }: { item: FlatTask }) => {
    const priorityColor =
      PRIORITY_COLORS[item.priority || ""] || colors.textDimmed;
    const priorityLabel =
      PRIORITY_LABELS[item.priority || ""] || item.priority;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleTaskPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.priority && (
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: `${priorityColor}20` },
              ]}
            >
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {priorityLabel}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.metaText, { color: colors.textDimmed }]} numberOfLines={1}>
            {item.boardName} · {item.columnName}
          </Text>
          {item.dueDate && (
            <View style={styles.dueDateRow}>
              <Calendar size={12} color={colors.textDimmed} />
              <Text style={[styles.dueDateText, { color: colors.textDimmed }]}>
                {new Date(item.dueDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textMuted },
                filter === f.value && { color: colors.primaryForeground, fontWeight: "600" },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
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
        renderItem={renderTask}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune tache</Text>
          </View>
        }
      />
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: fontSize.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  taskTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDateText: {
    fontSize: fontSize.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
