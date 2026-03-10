import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Package, Truck, CheckCircle, Trash2, User } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Arrivage } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "ArrivageDetail">;
type Nav = NativeStackNavigationProp<AppStackParamList, "ArrivageDetail">;

export default function ArrivageDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const { arrivageId } = route.params;
  const [arrivage, setArrivage] = useState<Arrivage | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_COLORS: Record<string, string> = {
    en_cours: "#f59e0b",
    recu: colors.success,
    annule: colors.destructive,
  };

  const STATUS_LABELS: Record<string, string> = {
    en_cours: "En cours",
    recu: "Recu",
    annule: "Annule",
  };

  async function fetchArrivage() {
    try {
      const res = await apiFetch(`/api/arrivages/${arrivageId}`);
      if (res.ok) setArrivage(await res.json());
      else showAlert("Erreur", "Arrivage introuvable");
    } catch {
      showAlert("Erreur", "Impossible de charger l'arrivage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArrivage();
  }, [arrivageId]);

  async function handleReceive() {
    showConfirm(
      "Confirmer la reception",
      "Cela va mettre a jour le stock de tous les produits de cet arrivage. Continuer ?",
      async () => {
        try {
          const res = await apiFetch(`/api/arrivages/${arrivageId}/receive`, { method: "POST" });
          if (res.ok) {
            showAlert("Succes", "Arrivage recu et stock mis a jour");
            fetchArrivage();
          } else {
            const data = await res.json();
            showAlert("Erreur", data.error || "Impossible de recevoir l'arrivage");
          }
        } catch {
          showAlert("Erreur", "Impossible de contacter le serveur");
        }
      }
    );
  }

  async function handleDelete() {
    showConfirm(
      "Supprimer l'arrivage",
      "Etes-vous sur de vouloir supprimer cet arrivage ?",
      async () => {
        try {
          const res = await apiFetch(`/api/arrivages/${arrivageId}`, { method: "DELETE" });
          if (res.ok) {
            showAlert("Succes", "Arrivage supprime", () => nav.goBack());
          } else {
            const data = await res.json();
            showAlert("Erreur", data.error || "Impossible de supprimer l'arrivage");
          }
        } catch {
          showAlert("Erreur", "Impossible de contacter le serveur");
        }
      }
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!arrivage) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Arrivage introuvable</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[arrivage.status] || colors.textDimmed;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Package size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reference, { color: colors.text }]}>{arrivage.reference}</Text>
            <Text style={[styles.dateText, { color: colors.textDimmed }]}>
              {new Date(arrivage.date || arrivage.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[arrivage.status] || arrivage.status}
            </Text>
          </View>
        </View>

        {arrivage.supplier && (
          <View style={[styles.supplierRow, { borderTopColor: colors.border }]}>
            <User size={14} color={colors.textDimmed} />
            <Text style={[styles.supplierText, { color: colors.textSecondary }]}>
              {arrivage.supplier.name}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{arrivage.totalItems}</Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Articles</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {(arrivage.totalCost || 0).toLocaleString("fr-FR")}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>FCFA total</Text>
        </View>
      </View>

      {/* Actions */}
      {arrivage.status === "en_cours" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={handleReceive}
            activeOpacity={0.7}
          >
            <CheckCircle size={16} color="#fff" />
            <Text style={styles.actionText}>Confirmer reception</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive || "#dc2626" }]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#fff" />
            <Text style={styles.actionText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Items */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles</Text>
      {arrivage.items.map((item, idx) => (
        <View
          key={item._id || idx}
          style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { color: colors.text }]}>
              {item.product?.name || item.productName || "Article"}
            </Text>
            {item.product?.brand && (
              <Text style={[styles.itemMeta, { color: colors.textDimmed }]}>
                {item.product.brand} {item.product.model || ""}
              </Text>
            )}
            <Text style={[styles.itemDetail, { color: colors.textDimmed }]}>
              {item.quantity} x {(item.unitCost || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          <Text style={[styles.itemTotal, { color: colors.primary }]}>
            {(item.total || 0).toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      ))}

      {/* Notes */}
      {arrivage.notes ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[{ color: colors.text, fontSize: fontSize.sm }]}>{arrivage.notes}</Text>
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: fontSize.md },
  headerCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  reference: { fontSize: fontSize.xl, fontWeight: "700" },
  dateText: { fontSize: fontSize.sm, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: fontSize.sm, fontWeight: "600" },
  supplierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  supplierText: { fontSize: fontSize.sm },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: { fontSize: fontSize.xl, fontWeight: "700" },
  statLabel: { fontSize: fontSize.sm, marginTop: 4 },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  actionText: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemName: { fontSize: fontSize.md, fontWeight: "500" },
  itemMeta: { fontSize: fontSize.xs, marginTop: 2 },
  itemDetail: { fontSize: fontSize.sm, marginTop: 2 },
  itemTotal: { fontSize: fontSize.md, fontWeight: "600" },
  notesCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
