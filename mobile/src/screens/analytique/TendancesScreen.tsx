import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { TrendingUp, DollarSign, Briefcase } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";

interface MonthData {
  month: string;
  revenue: number;
  expenses: number;
  salary: number;
}

export default function TendancesScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/analytics/trends");
      if (res.ok) {
        const json = await res.json();
        setData(json.months ?? json ?? []);
      }
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

  const totalRevenue = data.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = data.reduce((s, m) => s + m.expenses, 0);
  const totalSalary = data.reduce((s, m) => s + m.salary, 0);
  const maxValue = Math.max(
    ...data.map((m) => Math.max(m.revenue, m.expenses, m.salary)),
    1
  );

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      {/* Summary KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="Revenus total"
          value={`${(totalRevenue / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<TrendingUp size={18} color={colors.destructive} />}
          label="Depenses total"
          value={`${(totalExpenses / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Briefcase size={18} color={colors.info} />}
          label="Salaires total"
          value={`${(totalSalary / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Revenus</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Depenses</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Salaires</Text>
        </View>
      </View>

      {/* Monthly bars */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Par mois</Text>
      {data.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {data.map((m, idx) => (
        <View key={idx} style={[styles.monthRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{m.month}</Text>
          <View style={styles.barsContainer}>
            {/* Revenue bar */}
            <View style={styles.barRow}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: colors.success,
                    width: `${Math.max((m.revenue / maxValue) * 100, 2)}%`,
                  },
                ]}
              />
              <Text style={[styles.barValue, { color: colors.textMuted }]}>
                {(m.revenue / 1000).toFixed(0)}k
              </Text>
            </View>
            {/* Expenses bar */}
            <View style={styles.barRow}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: colors.destructive,
                    width: `${Math.max((m.expenses / maxValue) * 100, 2)}%`,
                  },
                ]}
              />
              <Text style={[styles.barValue, { color: colors.textMuted }]}>
                {(m.expenses / 1000).toFixed(0)}k
              </Text>
            </View>
            {/* Salary bar */}
            <View style={styles.barRow}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: colors.info,
                    width: `${Math.max((m.salary / maxValue) * 100, 2)}%`,
                  },
                ]}
              />
              <Text style={[styles.barValue, { color: colors.textMuted }]}>
                {(m.salary / 1000).toFixed(0)}k
              </Text>
            </View>
          </View>
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
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: fontSize.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  monthRow: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  barsContainer: {
    gap: spacing.xs,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bar: {
    height: 14,
    borderRadius: 4,
    minWidth: 4,
  },
  barValue: {
    fontSize: fontSize.xs,
  },
});
