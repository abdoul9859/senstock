import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { ShoppingCart, DollarSign, Package, TrendingUp } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../config/theme";

export default function BoutiqueDashboard() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/boutique/stats");
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
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<ShoppingCart size={18} color={colors.primary} />}
          label="Commandes"
          value={stats?.totalOrders ?? 0}
        />
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="CA en ligne"
          value={`${((stats?.totalRevenue ?? 0) / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Package size={18} color={colors.info} />}
          label="Produits publies"
          value={stats?.publishedProducts ?? 0}
        />
        <KpiCard
          icon={<TrendingUp size={18} color={colors.warning} />}
          label="En attente"
          value={stats?.pendingOrders ?? 0}
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
  kpiGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
