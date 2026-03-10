import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Building2, DollarSign, ArrowUpDown } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { BankAccount } from "../../types";

export default function BanqueDashboard() {
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/bank-accounts");
      if (res.ok) setAccounts(await res.json());
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

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); fetchData(); }}
    >
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="Solde total"
          value={`${(totalBalance / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<Building2 size={18} color={colors.info} />}
          label="Comptes"
          value={accounts.length}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Comptes bancaires</Text>
      {accounts.map((acc) => (
        <View key={acc._id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Building2 size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.accName, { color: colors.text }]}>{acc.name}</Text>
            <Text style={[styles.accType, { color: colors.textDimmed }]}>{acc.type}</Text>
          </View>
          <Text style={[styles.accBalance, { color: colors.primary }]}>
            {acc.balance.toLocaleString("fr-FR")} {acc.currency}
          </Text>
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
  accName: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  accType: {
    fontSize: fontSize.sm,
  },
  accBalance: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
