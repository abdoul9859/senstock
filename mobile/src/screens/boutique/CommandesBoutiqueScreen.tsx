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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Order } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "CommandesBoutique">;

type OrderStatus = "all" | "en_attente" | "confirmee" | "expediee" | "livree" | "annulee";

const FILTERS: { label: string; value: OrderStatus }[] = [
  { label: "Toutes", value: "all" },
  { label: "En attente", value: "en_attente" },
  { label: "Confirmee", value: "confirmee" },
  { label: "Expediee", value: "expediee" },
  { label: "Livree", value: "livree" },
  { label: "Annulee", value: "annulee" },
];

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmee",
  expediee: "Expediee",
  livree: "Livree",
  annulee: "Annulee",
};

export default function CommandesBoutiqueScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus>("all");

  const STATUS_COLORS: Record<string, string> = {
    en_attente: colors.warning,
    confirmee: colors.info,
    expediee: colors.primary,
    livree: colors.success,
    annulee: colors.destructive,
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/boutique/orders");
      if (res.ok) setOrders(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [nav, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.textDimmed;
    const statusLabel = STATUS_LABELS[item.status] || item.status;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("CommandeBoutiqueDetail", { orderId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.orderNumber, { color: colors.text }]}>{item.number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.customerName, { color: colors.textMuted }]}>
          {item.customer?.name || "Client inconnu"}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.total, { color: colors.primary }]}>
            {item.total.toLocaleString("fr-FR")} FCFA
          </Text>
          <Text style={[styles.date, { color: colors.textDimmed }]}>
            {new Date(item.createdAt).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textMuted },
                filter === f.value && { color: colors.primaryForeground, fontWeight: "600" },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
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
        renderItem={renderOrder}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune commande</Text>
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: fontSize.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  customerName: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  date: {
    fontSize: fontSize.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
