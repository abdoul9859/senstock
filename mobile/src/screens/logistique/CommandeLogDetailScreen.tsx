import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { PurchaseOrder } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type RouteDef = RouteProp<ModulesStackParamList, "CommandeLogDetail">;

const STATUS_FLOW: Record<string, string[]> = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["confirmee", "annulee"],
  confirmee: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

const STATUS_LABELS: Record<string, string> = {
  envoyee: "Marquer envoyee",
  confirmee: "Marquer confirmee",
  livree: "Marquer livree",
  annulee: "Annuler",
};

export default function CommandeLogDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const navigation = useNavigation();
  const { orderId } = route.params;
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const STATUS_COLORS: Record<string, string> = {
    brouillon: colors.info,
    envoyee: "#f59e0b",
    confirmee: "#a855f7",
    livree: colors.success,
    annulee: colors.destructive,
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/purchase-orders/${orderId}`);
      if (res.ok) setOrder(await res.json());
    } catch {
      showAlert("Erreur", "Impossible de charger la commande");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/purchase-orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrder(await res.json());
      } else {
        showAlert("Erreur", "Impossible de mettre a jour le statut");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Commande introuvable</Text>
      </View>
    );
  }

  const nextStatuses = STATUS_FLOW[order.status] || [];

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchOrder();
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.orderNumber, { color: colors.text }]}>{order.number}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                (STATUS_COLORS[order.status] || colors.textDimmed) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: STATUS_COLORS[order.status] || colors.textDimmed },
            ]}
          >
            {order.status}
          </Text>
        </View>
      </View>

      {/* Supplier */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.textDimmed }]}>Fournisseur</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>
          {order.supplier?.name || "Non defini"}
        </Text>
        <Text style={[styles.infoLabel, { color: colors.textDimmed }]}>Date</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>
          {new Date(order.createdAt).toLocaleDateString("fr-FR")}
        </Text>
      </View>

      {/* Items */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles</Text>
      {order.items.map((item, idx) => (
        <View key={idx} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
            <Text style={[styles.itemDetail, { color: colors.textDimmed }]}>
              {item.quantity} x {item.unitPrice.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          <Text style={[styles.itemTotal, { color: colors.primary }]}>
            {item.total.toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      ))}

      {/* Total */}
      <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {order.total.toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      </View>

      {/* Notes */}
      {(order as any).notes && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{(order as any).notes}</Text>
          </View>
        </>
      )}

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions</Text>
          <View style={styles.actionsRow}>
            {nextStatuses.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.card, borderColor: colors.primary },
                  s === "annulee" && { borderColor: colors.destructive },
                ]}
                onPress={() => handleStatusUpdate(s)}
                disabled={updating}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      s === "annulee"
                        ? colors.destructive
                        : colors.primary
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: colors.primary },
                      s === "annulee" && { color: colors.destructive },
                    ]}
                  >
                    {STATUS_LABELS[s] || s}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
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
  errorText: {
    fontSize: fontSize.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  orderNumber: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  infoValue: {
    fontSize: fontSize.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemDesc: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemDetail: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  totalCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  notesCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  notesText: {
    fontSize: fontSize.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
