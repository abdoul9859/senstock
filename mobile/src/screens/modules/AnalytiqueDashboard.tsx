import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { BarChart3, TrendingUp, DollarSign, Package } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize } from "../../config/theme";

export default function AnalytiqueDashboard() {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch invoices + products to compute basic analytics
      const [invRes, prodRes] = await Promise.all([
        apiFetch("/api/invoices"),
        apiFetch("/api/products"),
      ]);
      const invoices = invRes.ok ? await invRes.json() : [];
      const products = prodRes.ok ? await prodRes.json() : [];

      const paidInvoices = invoices.filter((i: any) => i.status === "payee" || i.status === "partielle");
      const totalRevenue = paidInvoices.reduce((s: number, i: any) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0), 0);
      const totalProfit = paidInvoices.reduce((s: number, i: any) => {
        const revenue = i.payment?.enabled ? (i.payment.amount || 0) : 0;
        const cost = (i.items || []).reduce((c: number, it: any) => c + (it.purchasePrice || 0) * it.quantity, 0);
        return s + (revenue - cost);
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
      onRefresh={() => { setRefreshing(true); fetchData(); }}
    >
      <Text style={[styles.note, { color: colors.textMuted }]}>
        Apercu analytique base sur vos donnees actuelles.
      </Text>

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
});
