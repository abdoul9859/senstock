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
import { showAlert, showConfirm } from "../../utils/alert";
import { DollarSign, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface SalaryRecord {
  _id: string;
  employee?: { _id: string; firstName: string; lastName: string };
  employeeId?: string;
  amount: number;
  month: number;
  year: number;
  status: string;
  paidAt?: string;
}

const MONTH_NAMES = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

export default function SalairesScreen() {
  const { colors } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchSalaries = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/salaries?month=${month}&year=${year}`);
      if (res.ok) setSalaries(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => {
    setLoading(true);
    fetchSalaries();
  }, [fetchSalaries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSalaries();
  }, [fetchSalaries]);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  async function handleGenerate() {
    showConfirm(
      "Generer la paie",
      `Generer les salaires pour ${MONTH_NAMES[month - 1]} ${year} ?`, async () => {
            setGenerating(true);
            try {
              const res = await apiFetch("/api/salaries/generate", {
                method: "POST",
                body: JSON.stringify({ month, year }),
              });
              if (res.ok) {
                fetchSalaries();
              } else {
                const err = await res.json().catch(() => null);
                showAlert("Erreur", err?.error || "Impossible de generer la paie");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            } finally {
              setGenerating(false);
            }
          });
  }

  async function handleMarkPaid(salaryId: string) {
    try {
      const res = await apiFetch(`/api/salaries/${salaryId}/pay`, {
        method: "PUT",
      });
      if (res.ok) {
        fetchSalaries();
      } else {
        showAlert("Erreur", "Impossible de marquer comme paye");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "paye":
        return { bg: colors.success + "20", color: colors.success, label: "Paye" };
      case "en_attente":
        return { bg: colors.warning + "20", color: colors.warning, label: "En attente" };
      default:
        return { bg: colors.textDimmed + "20", color: colors.textDimmed, label: status };
    }
  }

  const totalAmount = salaries.reduce((s, r) => s + r.amount, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7}>
          <ChevronRight size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total du mois</Text>
        <Text style={[styles.summaryValue, { color: colors.primary }]}>
          {totalAmount.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textDimmed }]}>{salaries.length} fiches de paie</Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, { backgroundColor: colors.primary }, generating && styles.btnDisabled]}
        onPress={handleGenerate}
        disabled={generating}
        activeOpacity={0.7}
      >
        {generating ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.generateBtnText, { color: colors.primaryForeground }]}>Generer la paie du mois</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={salaries}
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
        renderItem={({ item }) => {
          const statusInfo = getStatusStyle(item.status);
          const empName = item.employee
            ? `${item.employee.firstName} ${item.employee.lastName}`
            : "Employe";
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardLeft, { backgroundColor: colors.cardAlt }]}>
                <DollarSign size={18} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{empName}</Text>
                <Text style={[styles.cardAmount, { color: colors.textSecondary }]}>
                  {item.amount.toLocaleString("fr-FR")} FCFA
                </Text>
                <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
              {item.status === "en_attente" && (
                <TouchableOpacity
                  onPress={() => handleMarkPaid(item._id)}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={24} color={colors.success} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun salaire pour ce mois</Text>
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
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  summaryCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  summaryCount: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  generateBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardLeft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  cardAmount: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
