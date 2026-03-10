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
import { showAlert } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Truck, Package, CheckCircle } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { PurchaseOrder } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "Livraisons">;

const DELIVERY_STATUSES = ["envoyee", "confirmee", "livree"];

const NEXT_STATUS: Record<string, string> = {
  envoyee: "confirmee",
  confirmee: "livree",
};

const NEXT_LABEL: Record<string, string> = {
  envoyee: "Confirmer",
  confirmee: "Marquer livree",
};

export default function LivraisonsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const STATUS_COLORS: Record<string, string> = {
    envoyee: "#f59e0b",
    confirmee: "#a855f7",
    livree: colors.success,
  };

  const STATUS_ICONS: Record<string, React.ReactNode> = {
    envoyee: <Truck size={18} color="#f59e0b" />,
    confirmee: <Package size={18} color="#a855f7" />,
    livree: <CheckCircle size={18} color={colors.success} />,
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch("/api/purchase-orders");
      if (res.ok) {
        const all: PurchaseOrder[] = await res.json();
        setOrders(all.filter((o) => DELIVERY_STATUSES.includes(o.status)));
      }
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

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await apiFetch(`/api/purchase-orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        showAlert("Erreur", "Impossible de mettre a jour le statut");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders}
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
        renderItem={({ item }) => {
          const nextStatus = NEXT_STATUS[item.status];
          const nextLabel = NEXT_LABEL[item.status];
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  {STATUS_ICONS[item.status]}
                  <Text style={[styles.orderNumber, { color: colors.text }]}>{item.number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        (STATUS_COLORS[item.status] || colors.textDimmed) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          STATUS_COLORS[item.status] || colors.textDimmed,
                      },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.supplierName, { color: colors.textDimmed }]}>
                {item.supplier?.name || "Fournisseur"}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.total, { color: colors.primary }]}>
                  {item.total.toLocaleString("fr-FR")} FCFA
                </Text>
                <Text style={[styles.date, { color: colors.textDimmed }]}>
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              {nextStatus && (
                <TouchableOpacity
                  style={[styles.updateBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
                  onPress={() => handleStatusUpdate(item._id, nextStatus)}
                  disabled={updatingId === item._id}
                  activeOpacity={0.7}
                >
                  {updatingId === item._id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.updateBtnText, { color: colors.primary }]}>{nextLabel}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune livraison en cours</Text>
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
  list: {
    padding: spacing.lg,
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
    marginBottom: spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: "600",
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
  supplierName: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  date: {
    fontSize: fontSize.xs,
  },
  updateBtn: {
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  updateBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
