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
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  PieChart,
  Target,
  Percent,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "AnalytiqueDashboard">;

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  screen: keyof AppStackParamList;
  color: string;
}

export default function AnalytiqueDashboardScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const QUICK_ACTIONS: QuickAction[] = [
    {
      label: "Tendances",
      icon: <TrendingUp size={22} color={colors.info} />,
      screen: "Tendances",
      color: colors.info,
    },
    {
      label: "Repartition",
      icon: <PieChart size={22} color={colors.success} />,
      screen: "Repartition",
      color: colors.success,
    },
    {
      label: "Rentabilite",
      icon: <Percent size={22} color={colors.warning} />,
      screen: "Rentabilite",
      color: colors.warning,
    },
    {
      label: "Objectifs",
      icon: <Target size={22} color={colors.primary} />,
      screen: "Objectifs",
      color: colors.primary,
    },
  ];

  const fetchData = useCallback(async () => {
    try {
      const [invRes, prodRes] = await Promise.all([
        apiFetch("/api/invoices"),
        apiFetch("/api/products"),
      ]);
      const invoices = invRes.ok ? await invRes.json() : [];
      const products = prodRes.ok ? await prodRes.json() : [];

      const paidInvoices = invoices.filter(
        (i: any) => i.status === "payee" || i.status === "partielle"
      );
      const totalRevenue = paidInvoices.reduce(
        (s: number, i: any) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0),
        0
      );
      const totalProfit = paidInvoices.reduce((s: number, i: any) => {
        const paid = i.payment?.enabled ? (i.payment.amount || 0) : 0;
        const cost = (i.items || []).reduce(
          (c: number, it: any) => c + (it.purchasePrice || 0) * (it.quantity || 0),
          0
        );
        return s + (paid - cost);
      }, 0);

      setData({
        totalRevenue,
        totalProfit,
        totalInvoices: invoices.length,
        totalProducts: products.length,
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

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Apercu analytique base sur vos donnees actuelles.
      </Text>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="Chiffre d'affaires"
          value={`${((data?.totalRevenue ?? 0) / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<TrendingUp size={18} color={colors.primary} />}
          label="Benefice"
          value={`${((data?.totalProfit ?? 0) / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<BarChart3 size={18} color={colors.info} />}
          label="Factures"
          value={data?.totalInvoices ?? 0}
        />
        <KpiCard
          icon={<Package size={18} color={colors.warning} />}
          label="Produits"
          value={data?.totalProducts ?? 0}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  note: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
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
});
