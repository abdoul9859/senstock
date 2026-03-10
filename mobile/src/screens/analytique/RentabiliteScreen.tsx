import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { DollarSign, TrendingUp, Percent, ShoppingBag } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";

interface CategoryProfit {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface ProductProfit {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface ProfitabilityData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  byCategory: CategoryProfit[];
  topProducts: ProductProfit[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

export default function RentabiliteScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function getMarginColor(margin: number): string {
    if (margin >= 30) return colors.success;
    if (margin >= 15) return colors.warning;
    return colors.destructive;
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/analytics/profitability");
      if (res.ok) {
        setData(await res.json());
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

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalCost = data?.totalCost ?? 0;
  const totalProfit = data?.totalProfit ?? 0;
  const overallMargin = data?.overallMargin ?? 0;
  const byCategory = data?.byCategory ?? [];
  const topProducts = data?.topProducts ?? [];

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
          label="Revenus"
          value={`${(totalRevenue / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<ShoppingBag size={18} color={colors.destructive} />}
          label="Couts"
          value={`${(totalCost / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<TrendingUp size={18} color={colors.primary} />}
          label="Benefice"
          value={`${(totalProfit / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<Percent size={18} color={colors.info} />}
          label="Marge globale"
          value={`${overallMargin.toFixed(1)}%`}
        />
      </View>

      {/* By Category */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Par categorie</Text>
      {byCategory.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {byCategory.map((cat) => (
        <View key={cat.category} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: colors.text }]}>{cat.category}</Text>
            <View
              style={[
                styles.marginBadge,
                { backgroundColor: getMarginColor(cat.margin) },
              ]}
            >
              <Text style={styles.marginBadgeText}>
                {cat.margin.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.itemDetails}>
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              Revenus: {formatCurrency(cat.revenue)} FCFA
            </Text>
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              Couts: {formatCurrency(cat.cost)} FCFA
            </Text>
            <Text style={[styles.detailText, { color: colors.primary }]}>
              Benefice: {formatCurrency(cat.profit)} FCFA
            </Text>
          </View>
        </View>
      ))}

      {/* Top Products */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Top produits</Text>
      {topProducts.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {topProducts.map((prod, idx) => (
        <View key={idx} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {prod.name}
            </Text>
            <View
              style={[
                styles.marginBadge,
                { backgroundColor: getMarginColor(prod.margin) },
              ]}
            >
              <Text style={styles.marginBadgeText}>
                {prod.margin.toFixed(1)}%
              </Text>
            </View>
          </View>
          <View style={styles.itemDetails}>
            <Text style={[styles.detailText, { color: colors.textMuted }]}>
              Revenus: {formatCurrency(prod.revenue)} FCFA
            </Text>
            <Text style={[styles.detailText, { color: colors.primary }]}>
              Benefice: {formatCurrency(prod.profit)} FCFA
            </Text>
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
  itemRow: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing.sm,
  },
  marginBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  marginBadgeText: {
    color: "#ffffff",
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  itemDetails: {
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
  },
});
