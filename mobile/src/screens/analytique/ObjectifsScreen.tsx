import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Target, TrendingUp } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";

interface MonthData {
  month: string;
  revenue: number;
}

const MONTH_NAMES = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

function getCurrentMonthLabel(): string {
  const now = new Date();
  return MONTH_NAMES[now.getMonth()];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

export default function ObjectifsScreen() {
  const { colors } = useTheme();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState("500000");

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/analytics/trends");
      if (res.ok) {
        const json = await res.json();
        setMonths(json.months ?? json ?? []);
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

  const targetNum = parseInt(target, 10) || 0;
  const currentMonth = getCurrentMonthLabel();

  // Find current month revenue
  const currentMonthData = months.find((m) =>
    m.month.toLowerCase().includes(currentMonth.toLowerCase())
  );
  const currentRevenue = currentMonthData?.revenue ?? 0;
  const progressPct = targetNum > 0 ? Math.min((currentRevenue / targetNum) * 100, 100) : 0;

  // Last 6 months
  const last6 = months.slice(-6);

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      {/* Target input */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Objectif mensuel</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          placeholder="Objectif en FCFA"
          placeholderTextColor={colors.placeholder}
        />
        <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>FCFA</Text>
      </View>

      {/* Current month progress */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{currentMonth} - Progression</Text>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Target size={18} color={colors.primary} />}
          label="Objectif"
          value={formatCurrency(targetNum)}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<TrendingUp size={18} color={colors.success} />}
          label="Realise"
          value={formatCurrency(currentRevenue)}
          subtitle="FCFA"
        />
      </View>

      {/* Progress bar */}
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>Progression</Text>
          <Text
            style={[
              styles.progressPct,
              { color: progressPct >= 100 ? colors.success : colors.warning },
            ]}
          >
            {progressPct.toFixed(0)}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.cardAlt }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(progressPct, 2)}%`,
                backgroundColor:
                  progressPct >= 100 ? colors.success : progressPct >= 50 ? colors.warning : colors.destructive,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressSubtext, { color: colors.textMuted }]}>
          {progressPct >= 100
            ? "Objectif atteint !"
            : `Encore ${formatCurrency(Math.max(targetNum - currentRevenue, 0))} FCFA a realiser`}
        </Text>
      </View>

      {/* History */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Historique (6 derniers mois)</Text>
      {last6.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {last6.map((m, idx) => {
        const achieved = targetNum > 0 ? (m.revenue / targetNum) * 100 : 0;
        return (
          <View key={idx} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyMonth, { color: colors.text }]}>{m.month}</Text>
              <Text
                style={[
                  styles.historyPct,
                  {
                    color:
                      achieved >= 100
                        ? colors.success
                        : achieved >= 50
                        ? colors.warning
                        : colors.destructive,
                  },
                ]}
              >
                {achieved.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.historyDetails}>
              <Text style={[styles.historyDetailText, { color: colors.textMuted }]}>
                Objectif: {formatCurrency(targetNum)} FCFA
              </Text>
              <Text style={[styles.historyDetailText, { color: colors.textMuted }]}>
                Realise: {formatCurrency(m.revenue)} FCFA
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.cardAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(Math.max(achieved, 2), 100)}%`,
                    backgroundColor:
                      achieved >= 100
                        ? colors.success
                        : achieved >= 50
                        ? colors.warning
                        : colors.destructive,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  inputSuffix: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressCard: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  progressPct: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
  },
  progressFill: {
    height: 14,
    borderRadius: 7,
  },
  progressSubtext: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  historyRow: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  historyMonth: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  historyPct: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  historyDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  historyDetailText: {
    fontSize: fontSize.sm,
  },
});
