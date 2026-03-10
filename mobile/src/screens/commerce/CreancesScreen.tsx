import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RefreshCw, ExternalLink } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "Creances">;

type CreanceStatus = "en_cours" | "en_retard";

interface Creance {
  _id: string;
  client?: { _id: string; name: string };
  invoice?: { _id: string; number: string };
  amount: number;
  amountPaid: number;
  dueDate?: string;
  status: string;
  description?: string;
  payments?: { _id: string; amount: number; method: string; date: string }[];
  createdAt: string;
}

const PAYMENT_METHODS = ["Especes", "Carte", "Virement", "Mobile Money", "Cheque"];

export default function CreancesScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [creances, setCreances] = useState<Creance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCreance, setSelectedCreance] = useState<Creance | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Especes");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCreances = useCallback(async (doSync = false) => {
    try {
      if (doSync) {
        await apiFetch("/api/creances/sync-invoices", { method: "POST" }).catch(() => {});
      }
      const res = await apiFetch("/api/creances");
      if (res.ok) setCreances(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Sync once on first load
    fetchCreances(true);
  }, [fetchCreances]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      // Just fetch on focus, no re-sync
      fetchCreances(false);
    });
    return unsubscribe;
  }, [nav, fetchCreances]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCreances(true);
  }, [fetchCreances]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/creances/sync-invoices", { method: "POST" });
      if (res.ok) {
        fetchCreances();
      } else {
        showAlert("Erreur", "Impossible de synchroniser les creances");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSyncing(false);
    }
  }

  function openPaymentModal(creance: Creance) {
    setSelectedCreance(creance);
    setPaymentAmount("");
    setPaymentMethod("Especes");
    setPaymentModalVisible(true);
  }

  async function handlePayment() {
    if (!selectedCreance) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showAlert("Montant invalide", "Veuillez saisir un montant valide.");
      return;
    }
    const remaining = Math.max(0, (selectedCreance.amount || 0) - (selectedCreance.amountPaid || 0));
    if (amount > remaining) {
      showAlert("Montant trop eleve", `Le montant ne peut pas depasser ${remaining.toLocaleString("fr-FR")} FCFA.`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await apiFetch(`/api/creances/${selectedCreance._id}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount, method: paymentMethod }),
      });
      if (res.ok) {
        setPaymentModalVisible(false);
        fetchCreances();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible d'enregistrer le paiement");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSubmittingPayment(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sync button */}
      <View style={styles.topBar}>
        <Text style={[styles.topTitle, { color: colors.text }]}>Creances ({creances.length})</Text>
        <TouchableOpacity
          style={[styles.syncBtn, { backgroundColor: colors.primary }]}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <RefreshCw size={16} color={colors.primaryForeground} />
              <Text style={[styles.syncBtnText, { color: colors.primaryForeground }]}>Sync</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={creances}
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
          const remaining = Math.max(0, (item.amount || 0) - (item.amountPaid || 0));
          const isSoldee = item.status === "soldee" || remaining <= 0;
          const isOverdue = item.dueDate ? new Date(item.dueDate) < new Date() && !isSoldee : false;
          const dueDate = item.dueDate ? new Date(item.dueDate) : null;
          const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 999;
          const isDueSoon = !isOverdue && !isSoldee && daysUntilDue <= 7 && daysUntilDue >= 0;
          const statusColor = isSoldee ? colors.success : isOverdue ? colors.destructive : isDueSoon ? colors.warning : colors.info;
          const statusLabel = isSoldee ? "Soldee" : isOverdue ? "En retard" : item.status === "partielle" ? "Partielle" : "En cours";

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => !isSoldee && openPaymentModal(item)}
              activeOpacity={isSoldee ? 1 : 0.7}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardClient, { color: colors.text }]}>{item.client?.name || "Inconnu"}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              {item.invoice?.number && (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  onPress={() => nav.navigate("InvoiceDetail" as any, { invoiceId: item.invoice!._id })}
                >
                  <Text style={[styles.cardInvoice, { color: colors.primary, textDecorationLine: "underline" }]}>
                    Facture : {item.invoice.number}
                  </Text>
                  <ExternalLink size={12} color={colors.primary} />
                </TouchableOpacity>
              )}
              <View style={styles.cardBottom}>
                <View>
                  <Text style={[styles.cardAmountLabel, { color: colors.textDimmed }]}>Restant</Text>
                  <Text style={[styles.cardAmount, { color: statusColor }]}>
                    {remaining.toLocaleString("fr-FR")} FCFA
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {dueDate && (
                    <>
                      <Text style={[styles.cardDateLabel, { color: colors.textDimmed }]}>Echeance</Text>
                      <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                        {dueDate.toLocaleDateString("fr-FR")}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              {/* Progress bar */}
              <View style={{ marginTop: spacing.sm, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: statusColor, width: `${Math.min(100, ((item.amountPaid || 0) / (item.amount || 1)) * 100)}%` }} />
              </View>
              <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginTop: 4 }}>
                {(item.amountPaid || 0).toLocaleString("fr-FR")} / {(item.amount || 0).toLocaleString("fr-FR")} FCFA
              </Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune creance</Text>
          </View>
        }
      />

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Enregistrer un paiement</Text>

            {/* Payment status summary */}
            {selectedCreance && (() => {
              const total = selectedCreance.amount || 0;
              const paid = selectedCreance.amountPaid || 0;
              const remaining = Math.max(0, total - paid);
              const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
              return (
                <View style={{ backgroundColor: colors.cardAlt, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.xs }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600", marginBottom: spacing.xs }}>
                    {selectedCreance.client?.name || "Inconnu"}
                  </Text>
                  {selectedCreance.invoice?.number && (
                    <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs, marginBottom: spacing.sm }}>
                      Facture : {selectedCreance.invoice.number}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Montant total</Text>
                    <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "600" }}>
                      {total.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Deja paye</Text>
                    <Text style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: "600" }}>
                      {paid.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginVertical: spacing.xs }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.success, width: `${pct}%` }} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.xs }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700" }}>Reste a payer</Text>
                    <Text style={{ color: remaining > 0 ? colors.warning : colors.success, fontSize: fontSize.md, fontWeight: "700" }}>
                      {remaining.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                  {/* Payment history */}
                  {selectedCreance.payments && selectedCreance.payments.length > 0 && (
                    <View style={{ marginTop: spacing.sm }}>
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "600", marginBottom: 4 }}>
                        Historique ({selectedCreance.payments.length})
                      </Text>
                      {selectedCreance.payments.map((p) => (
                        <View key={p._id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                          <Text style={{ color: colors.textDimmed, fontSize: fontSize.xs }}>
                            {new Date(p.date).toLocaleDateString("fr-FR")} - {p.method}
                          </Text>
                          <Text style={{ color: colors.success, fontSize: fontSize.xs, fontWeight: "500" }}>
                            +{p.amount.toLocaleString("fr-FR")} FCFA
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Montant</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={paymentAmount}
              onChangeText={(text) => {
                const remaining = Math.max(0, (selectedCreance?.amount || 0) - (selectedCreance?.amountPaid || 0));
                const num = parseFloat(text);
                if (text === "" || isNaN(num)) {
                  setPaymentAmount(text);
                } else if (num > remaining) {
                  setPaymentAmount(String(remaining));
                } else {
                  setPaymentAmount(text);
                }
              }}
              placeholder={`Max: ${Math.max(0, (selectedCreance?.amount || 0) - (selectedCreance?.amountPaid || 0)).toLocaleString("fr-FR")} FCFA`}
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Methode de paiement</Text>
            <View style={styles.methodsRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }, paymentMethod === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.methodText, { color: colors.textMuted }, paymentMethod === m && { color: colors.primaryForeground, fontWeight: "600" }]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setPaymentModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }, submittingPayment && styles.submitDisabled]}
                onPress={handlePayment}
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  topTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
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
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardClient: {
    fontSize: fontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardInvoice: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardAmountLabel: {
    fontSize: fontSize.xs,
  },
  cardAmount: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  cardDateLabel: {
    fontSize: fontSize.xs,
  },
  cardDate: {
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  methodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  methodText: {
    fontSize: fontSize.sm,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  confirmBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  submitDisabled: {
    opacity: 0.6,
  },
});
