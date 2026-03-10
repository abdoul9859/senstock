import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";

interface StatusBreakdown {
  status: string;
  count: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
}

interface BreakdownData {
  invoicesByStatus: StatusBreakdown[];
  productsByCategory: CategoryBreakdown[];
}

const STATUS_LABELS: Record<string, string> = {
  payee: "Payee",
  partielle: "Partielle",
  impayee: "Impayee",
  annulee: "Annulee",
};

export default function RepartitionScreen() {
  const { colors } = useTheme();
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_COLORS: Record<string, string> = {
    payee: colors.success,
    partielle: colors.warning,
    impayee: colors.destructive,
    annulee: "#71717a",
  };

  const CATEGORY_COLORS = [
    colors.primary,
    colors.info,
    colors.warning,
    colors.success,
    colors.destructive,
    "#8b5cf6",
    "#ec4899",
    "#f97316",
  ];

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/analytics/breakdown");
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

  const invoices = data?.invoicesByStatus ?? [];
  const categories = data?.productsByCategory ?? [];
  const totalInvoices = invoices.reduce((s, i) => s + i.count, 0) || 1;
  const totalProducts = categories.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      {/* Invoice breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Factures par statut</Text>
      {invoices.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {invoices.map((item) => {
        const pct = (item.count / totalInvoices) * 100;
        const barColor = STATUS_COLORS[item.status] ?? colors.textDimmed;
        return (
          <View key={item.status} style={[styles.breakdownRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.breakdownHeader}>
              <View style={styles.statusLabelRow}>
                <View
                  style={[styles.statusDot, { backgroundColor: barColor }]}
                />
                <Text style={[styles.breakdownLabel, { color: colors.text }]}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
              <Text style={[styles.breakdownCount, { color: colors.textMuted }]}>
                {item.count} ({pct.toFixed(0)}%)
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.cardAlt }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: barColor,
                    width: `${Math.max(pct, 2)}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}

      {/* Product breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Produits par categorie</Text>
      {categories.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune donnee disponible.</Text>
      )}
      {categories.map((item, idx) => {
        const pct = (item.count / totalProducts) * 100;
        const barColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
        return (
          <View key={item.category} style={[styles.breakdownRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.breakdownHeader}>
              <View style={styles.statusLabelRow}>
                <View
                  style={[styles.statusDot, { backgroundColor: barColor }]}
                />
                <Text style={[styles.breakdownLabel, { color: colors.text }]}>{item.category}</Text>
              </View>
              <Text style={[styles.breakdownCount, { color: colors.textMuted }]}>
                {item.count} ({pct.toFixed(0)}%)
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.cardAlt }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: barColor,
                    width: `${Math.max(pct, 2)}%`,
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
  emptyText: {
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  breakdownRow: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  breakdownCount: {
    fontSize: fontSize.sm,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: 12,
    borderRadius: 6,
  },
});
