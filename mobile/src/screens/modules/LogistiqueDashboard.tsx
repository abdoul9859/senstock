import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Truck, Package, Clock, CheckCircle } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { PurchaseOrder } from "../../types";

export default function LogistiqueDashboard() {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/purchase-orders");
      if (res.ok) setOrders(await res.json());
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

  const pending = orders.filter((o) => ["brouillon", "envoyee", "confirmee"].includes(o.status)).length;
  const inTransit = orders.filter((o) => o.status === "en_transit").length;
  const delivered = orders.filter((o) => o.status === "livree").length;

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); fetchData(); }}
    >
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Truck size={18} color={colors.primary} />}
          label="Total commandes"
          value={orders.length}
        />
        <KpiCard
          icon={<Clock size={18} color={colors.warning} />}
          label="En attente"
          value={pending}
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Package size={18} color={colors.info} />}
          label="En transit"
          value={inTransit}
        />
        <KpiCard
          icon={<CheckCircle size={18} color={colors.success} />}
          label="Livrees"
          value={delivered}
        />
      </View>

      {orders.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Commandes recentes</Text>
          {orders.slice(0, 10).map((po) => (
            <View key={po._id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.poNumber, { color: colors.text }]}>{po.number}</Text>
                <Text style={[styles.poSupplier, { color: colors.textDimmed }]}>{po.supplier?.name || "Fournisseur"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.poTotal, { color: colors.primary }]}>{po.total.toLocaleString("fr-FR")} FCFA</Text>
                <Text style={[styles.poStatus, { color: colors.textDimmed }]}>{po.status}</Text>
              </View>
            </View>
          ))}
        </>
      )}
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
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  poNumber: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  poSupplier: {
    fontSize: fontSize.sm,
  },
  poTotal: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  poStatus: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
