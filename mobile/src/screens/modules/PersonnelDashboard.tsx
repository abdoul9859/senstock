import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Users, DollarSign, UserCheck } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Employee } from "../../types";

export default function PersonnelDashboard() {
  const { colors } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
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

  const totalSalary = employees.reduce((s, e) => s + (e.salary || 0), 0);

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); fetchData(); }}
    >
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Users size={18} color={colors.primary} />}
          label="Employes"
          value={employees.length}
        />
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="Masse salariale"
          value={`${(totalSalary / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Employes</Text>
      {employees.map((emp) => (
        <View key={emp._id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <UserCheck size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.empName, { color: colors.text }]}>{emp.firstName} {emp.lastName}</Text>
            {emp.role && <Text style={[styles.empRole, { color: colors.textDimmed }]}>{emp.role}</Text>}
          </View>
          {emp.salary ? (
            <Text style={[styles.empSalary, { color: colors.primary }]}>{emp.salary.toLocaleString("fr-FR")} FCFA</Text>
          ) : null}
        </View>
      ))}
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
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  empName: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  empRole: {
    fontSize: fontSize.sm,
  },
  empSalary: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
