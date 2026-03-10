import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  LayoutGrid,
  CheckCircle,
  Clock,
  AlertTriangle,
  Columns,
  List,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "TachesDashboard">;

export default function TachesDashboardScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tasks/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchStats();
      }}
    >
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<LayoutGrid size={18} color={colors.primary} />}
          label="Tableaux"
          value={stats?.totalBoards ?? 0}
        />
        <KpiCard
          icon={<Clock size={18} color={colors.info} />}
          label="Taches"
          value={stats?.totalTasks ?? 0}
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<CheckCircle size={18} color={colors.success} />}
          label="Terminees"
          value={stats?.completedTasks ?? 0}
        />
        <KpiCard
          icon={<AlertTriangle size={18} color={colors.destructive} />}
          label="En retard"
          value={stats?.overdueTasks ?? 0}
        />
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Acces rapide</Text>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("TaskBoards")}
        activeOpacity={0.7}
      >
        <Columns size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Tableaux</Text>
          <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Voir et gerer les tableaux Kanban</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("TaskList")}
        activeOpacity={0.7}
      >
        <List size={20} color={colors.info} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Liste</Text>
          <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Toutes les taches en liste</Text>
        </View>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  actionDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
