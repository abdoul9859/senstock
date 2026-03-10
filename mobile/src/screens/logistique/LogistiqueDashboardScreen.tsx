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
  Truck,
  Package,
  Clock,
  CheckCircle,
  Users,
  ClipboardList,
  Star,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Supplier, PurchaseOrder } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "LogistiqueDashboard">;

export default function LogistiqueDashboardScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, oRes] = await Promise.all([
        apiFetch("/api/suppliers"),
        apiFetch("/api/purchase-orders"),
      ]);
      if (sRes.ok) setSuppliers(await sRes.json());
      if (oRes.ok) setOrders(await oRes.json());
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

  const pending = orders.filter((o) =>
    ["brouillon", "envoyee"].includes(o.status)
  ).length;
  const inTransit = orders.filter((o) =>
    ["confirmee"].includes(o.status)
  ).length;
  const delivered = orders.filter((o) => o.status === "livree").length;

  const actions = [
    {
      label: "Fournisseurs",
      icon: <Users size={22} color={colors.primary} />,
      onPress: () => nav.navigate("FournisseurList"),
    },
    {
      label: "Commandes",
      icon: <ClipboardList size={22} color={colors.info} />,
      onPress: () => nav.navigate("CommandesLog"),
    },
    {
      label: "Livraisons",
      icon: <Truck size={22} color={colors.warning} />,
      onPress: () => nav.navigate("Livraisons"),
    },
    {
      label: "Arrivages",
      icon: <Package size={22} color="#10b981" />,
      onPress: () => nav.navigate("ArrivageList"),
    },
    {
      label: "Notations",
      icon: <Star size={22} color="#f59e0b" />,
      onPress: () => nav.navigate("Notations"),
    },
  ];

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
          icon={<Users size={18} color={colors.primary} />}
          label="Fournisseurs"
          value={suppliers.length}
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

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions rapides</Text>
      <View style={styles.actionsGrid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={a.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.cardAlt }]}>{a.icon}</View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent orders */}
      {orders.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Commandes recentes</Text>
          {orders.slice(0, 10).map((po) => (
            <TouchableOpacity
              key={po._id}
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nav.navigate("CommandeLogDetail", { orderId: po._id })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.poNumber, { color: colors.text }]}>{po.number}</Text>
                <Text style={[styles.poSupplier, { color: colors.textDimmed }]}>
                  {po.supplier?.name || "Fournisseur"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.poTotal, { color: colors.primary }]}>
                  {po.total.toLocaleString("fr-FR")} FCFA
                </Text>
                <Text style={[styles.poStatus, { color: colors.textDimmed }]}>{po.status}</Text>
              </View>
            </TouchableOpacity>
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
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
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
