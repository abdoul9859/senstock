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
  Building2,
  DollarSign,
  ArrowUpDown,
  ArrowLeftRight,
  Calculator,
  CreditCard,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { BankAccount } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "BanqueDashboard">;

export default function BanqueDashboardScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const QUICK_ACTIONS = [
    {
      label: "Comptes",
      icon: <Building2 size={22} color={colors.info} />,
      screen: "Comptes" as keyof AppStackParamList,
      color: colors.info,
    },
    {
      label: "Transactions",
      icon: <CreditCard size={22} color={colors.success} />,
      screen: "Transactions" as keyof AppStackParamList,
      color: colors.success,
    },
    {
      label: "Virements",
      icon: <ArrowLeftRight size={22} color={colors.warning} />,
      screen: "Virements" as keyof AppStackParamList,
      color: colors.warning,
    },
    {
      label: "Conversion",
      icon: <Calculator size={22} color={colors.primary} />,
      screen: "Conversion" as keyof AppStackParamList,
      color: colors.primary,
    },
  ];

  const fetchData = useCallback(async () => {
    try {
      const [accRes, statsRes] = await Promise.all([
        apiFetch("/api/bank-accounts"),
        apiFetch("/api/bank-transactions/stats"),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setTransactionCount(stats.recentCount ?? stats.totalCount ?? 0);
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

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

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
          icon={<DollarSign size={18} color={colors.success} />}
          label="Solde total"
          value={totalBalance.toLocaleString("fr-FR")}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<Building2 size={18} color={colors.info} />}
          label="Comptes"
          value={accounts.length}
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<ArrowUpDown size={18} color={colors.warning} />}
          label="Transactions"
          value={transactionCount}
          subtitle="recentes"
        />
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Acces rapide</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.screen}
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate(action.screen as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { borderColor: action.color, backgroundColor: colors.cardAlt }]}>
              {action.icon}
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Accounts */}
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: "47%",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
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
