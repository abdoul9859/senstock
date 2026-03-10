import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Users, DollarSign, CalendarOff, UserCheck } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "PersonnelDashboard">;

interface Stats {
  employeeCount: number;
  totalSalaryMass: number;
  pendingLeaves: number;
  todayPresent: number;
}

export default function PersonnelDashboardScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats>({
    employeeCount: 0,
    totalSalaryMass: 0,
    pendingLeaves: 0,
    todayPresent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [empRes, salRes, leaveRes, attRes] = await Promise.all([
        apiFetch("/api/employees"),
        apiFetch("/api/salaries/stats"),
        apiFetch("/api/leaves/stats"),
        apiFetch(`/api/attendance/stats?date=${today}`),
      ]);

      const employees = empRes.ok ? await empRes.json() : [];
      const salStats = salRes.ok ? await salRes.json() : {};
      const leaveStats = leaveRes.ok ? await leaveRes.json() : {};
      const attStats = attRes.ok ? await attRes.json() : {};

      const totalSalary = Array.isArray(employees)
        ? employees.reduce((s: number, e: any) => s + (e.salary || 0), 0)
        : 0;

      setStats({
        employeeCount: Array.isArray(employees) ? employees.length : 0,
        totalSalaryMass: salStats.totalMass || totalSalary,
        pendingLeaves: leaveStats.pending || 0,
        todayPresent: attStats.present || 0,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const quickActions = [
    { label: "Employes", icon: Users, screen: "EmployeList" as const },
    { label: "Salaires", icon: DollarSign, screen: "Salaires" as const },
    { label: "Conges", icon: CalendarOff, screen: "Conges" as const },
    { label: "Presences", icon: UserCheck, screen: "Presences" as const },
  ];

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Users size={18} color={colors.primary} />}
          label="Employes"
          value={stats.employeeCount}
        />
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="Masse salariale"
          value={`${(stats.totalSalaryMass / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<CalendarOff size={18} color={colors.warning} />}
          label="Conges en attente"
          value={stats.pendingLeaves}
        />
        <KpiCard
          icon={<UserCheck size={18} color={colors.info} />}
          label="Presents aujourd'hui"
          value={stats.todayPresent}
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate(action.screen)}
            activeOpacity={0.7}
          >
            <action.icon size={24} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionCard: {
    width: "47%",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
});
