import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import {
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Order } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type RouteDef = RouteProp<ModulesStackParamList, "CommandeBoutiqueDetail">;

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmee",
  expediee: "Expediee",
  livree: "Livree",
  annulee: "Annulee",
};

const STATUS_FLOW: string[] = [
  "en_attente",
  "confirmee",
  "expediee",
  "livree",
];

export default function CommandeBoutiqueDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const STATUS_COLORS: Record<string, string> = {
    en_attente: colors.warning,
    confirmee: colors.info,
    expediee: colors.primary,
    livree: colors.success,
    annulee: colors.destructive,
  };

  const fetchOrder = async () => {
    try {
      const res = await apiFetch(`/api/boutique/orders/${orderId}`);
      if (res.ok) {
        setOrder(await res.json());
      }
    } catch {
      showAlert("Erreur", "Impossible de charger la commande");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/boutique/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      } else {
        showAlert("Erreur", "Impossible de mettre a jour le statut");
      }
    } catch {
      showAlert("Erreur", "Erreur de connexion");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = () => {
    showConfirm("Annuler la commande", "Etes-vous sur ?", () => updateStatus("annulee"));
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

  const statusColor = STATUS_COLORS[order.status] || colors.textDimmed;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIdx + 1]
    : null;

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
        <FileText size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.number, { color: colors.text }]}>{order.number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.total, { color: colors.primary }]}>
          {order.total.toLocaleString("fr-FR")} FCFA
        </Text>
      </View>

      {/* Customer info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {order.customer?.name || "Inconnu"}
          </Text>
          {order.customer?.phone && (
            <View style={styles.infoRow}>
              <Phone size={14} color={colors.textDimmed} />
              <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{order.customer.phone}</Text>
            </View>
          )}
          {order.customer?.email && (
            <View style={styles.infoRow}>
              <Mail size={14} color={colors.textDimmed} />
              <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{order.customer.email}</Text>
            </View>
          )}
          {(order as any).customer?.address && (
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.textDimmed} />
              <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
                {(order as any).customer.address}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Articles ({order.items.length})
        </Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {order.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemRow,
                index > 0 && [styles.itemRowBorder, { borderTopColor: colors.border }],
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemQty, { color: colors.textDimmed }]}>
                  {item.quantity} x {item.price.toLocaleString("fr-FR")} FCFA
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>
                {(item.quantity * item.price).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
              {order.total.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      </View>

      {/* Payment status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CreditCard size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Paiement</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
            Statut : {order.paymentStatus || "Non renseigne"}
          </Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Date</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
            {new Date(order.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      {/* Status actions */}
      {order.status !== "annulee" && order.status !== "livree" && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions</Text>
          <View style={styles.actionsRow}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => updateStatus(nextStatus)}
                activeOpacity={0.7}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                    {STATUS_LABELS[nextStatus] || nextStatus}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelOrder}
              activeOpacity={0.7}
              disabled={updating}
            >
              <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  number: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  total: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  infoCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  clientDetail: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  itemRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemQty: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  grandTotal: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  grandTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
