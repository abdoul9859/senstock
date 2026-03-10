import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  FileText,
  User,
  Calendar,
  CreditCard,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react-native";
import { Printer } from "lucide-react-native";
import InvoiceItemRow from "../../components/invoice/InvoiceItemRow";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Invoice } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "InvoiceDetail">;
type NavProp = NativeStackNavigationProp<AppStackParamList>;

const STATUS_LABELS: Record<string, string> = {
  payee: "Payee",
  partielle: "Partielle",
  impayee: "Impayee",
  annulee: "Annulee",
};

const PAYMENT_METHODS = [
  { value: "especes", label: "Especes" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "carte", label: "Carte" },
  { value: "virement", label: "Virement" },
] as const;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InvoiceDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const navigation = useNavigation<NavProp>();
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        setInvoice(await res.json());
      }
    } catch {
      showAlert("Erreur", "Impossible de charger la facture");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ── Actions ──

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      showAlert("Erreur", "Veuillez saisir un montant valide");
      return;
    }
    const alreadyPaid = invoice?.payment?.enabled ? (invoice.payment.amount || 0) : 0;
    const remaining = Math.max(0, (invoice?.total || 0) - alreadyPaid);
    if (amount > remaining) {
      showAlert("Erreur", `Le montant ne peut pas depasser le reste a payer (${remaining.toLocaleString("fr-FR")} FCFA)`);
      return;
    }
    setSubmittingPayment(true);
    try {
      const alreadyPaidTotal = invoice?.payment?.enabled ? (invoice.payment.amount || 0) : 0;
      const newTotal = alreadyPaidTotal + amount;
      const res = await apiFetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({
          payment: {
            enabled: true,
            amount: newTotal,
            method: paymentMethod,
            date: paymentDate,
          },
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        setPaymentModalVisible(false);
        setPaymentAmount("");
        setPaymentMethod("especes");
        setPaymentDate(todayISO());
        showAlert("Succes", "Paiement enregistre");
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.message || "Impossible d'enregistrer le paiement");
      }
    } catch {
      showAlert("Erreur", "Impossible d'enregistrer le paiement");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleMarkAsPaid = () => {
    showConfirm("Confirmer", "Marquer cette facture comme payee ?", async () => {
          try {
            const res = await apiFetch(`/api/invoices/${invoiceId}`, {
              method: "PUT",
              body: JSON.stringify({ status: "payee" }),
            });
            if (res.ok) {
              const updated = await res.json();
              setInvoice(updated);
              showAlert("Succes", "Facture marquee comme payee");
            } else {
              showAlert("Erreur", "Impossible de mettre a jour le statut");
            }
          } catch {
            showAlert("Erreur", "Impossible de mettre a jour le statut");
          }
        });
  };

  const handleCancel = () => {
    showConfirm("Confirmer", "Annuler cette facture ?", async () => {
          try {
            const res = await apiFetch(`/api/invoices/${invoiceId}`, {
              method: "PUT",
              body: JSON.stringify({ status: "annulee" }),
            });
            if (res.ok) {
              const updated = await res.json();
              setInvoice(updated);
              showAlert("Succes", "Facture annulee");
            } else {
              showAlert("Erreur", "Impossible d'annuler la facture");
            }
          } catch {
            showAlert("Erreur", "Impossible d'annuler la facture");
          }
        });
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    // Open window immediately in user gesture context to avoid popup blocker
    const w = window.open("", "_blank");
    if (!w) {
      showAlert("Erreur", "Le navigateur a bloque l'ouverture. Autorisez les popups.");
      return;
    }
    w.document.write("<html><body style='margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><p>Chargement du PDF...</p></body></html>");
    apiFetch(`/api/invoices/${invoiceId}/pdf`)
      .then(async (res) => {
        if (!res.ok) {
          w.document.body.innerHTML = "<p style='color:red'>Erreur lors de la generation du PDF</p>";
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        w.location.href = url;
      })
      .catch(() => {
        w.document.body.innerHTML = "<p style='color:red'>Erreur de connexion</p>";
      });
  };

  const handleEdit = () => {
    navigation.navigate("CreateInvoice" as any, { invoiceId });
  };

  const handleDelete = () => {
    showConfirm(
      "Supprimer",
      "Etes-vous sur de vouloir supprimer cette facture ? Cette action est irreversible.", async () => {
            try {
              const res = await apiFetch(`/api/invoices/${invoiceId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                showAlert("Succes", "Facture supprimee");
                navigation.goBack();
              } else {
                showAlert("Erreur", "Impossible de supprimer la facture");
              }
            } catch {
              showAlert("Erreur", "Impossible de supprimer la facture");
            }
          });
  };

  // ── Render ──

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: fontSize.md }}>
          Facture introuvable
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          marginBottom: spacing.xl,
        }}
      >
        <FileText size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.xl,
              fontWeight: "700",
            }}
          >
            {invoice.number}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            {STATUS_LABELS[invoice.status] || invoice.status}
          </Text>
        </View>
        <Text
          style={{
            color: colors.primary,
            fontSize: fontSize.xl,
            fontWeight: "700",
          }}
        >
          {(invoice.total || 0).toLocaleString("fr-FR")} FCFA
        </Text>
      </View>

      {/* Client info */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <User size={16} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            Client
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              fontWeight: "600",
            }}
          >
            {invoice.client?.name || "Inconnu"}
          </Text>
          {invoice.client?.phone && (
            <Text
              style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
            >
              {invoice.client.phone}
            </Text>
          )}
          {invoice.client?.email && (
            <Text
              style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
            >
              {invoice.client.email}
            </Text>
          )}
        </View>
      </View>

      {/* Date */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <Calendar size={16} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            Dates
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          <Text
            style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
          >
            Date : {new Date(invoice.date).toLocaleDateString("fr-FR")}
          </Text>
          {invoice.dueDate && (
            <Text
              style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
            >
              Echeance : {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
            </Text>
          )}
        </View>
      </View>

      {/* Items */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.md,
            fontWeight: "600",
            marginBottom: spacing.sm,
          }}
        >
          Articles ({invoice.items.length})
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          {invoice.items.map((item) => (
            <InvoiceItemRow key={item._id} item={item} currency="FCFA" />
          ))}
          {/* Totals */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              marginTop: spacing.sm,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Sous-total
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.sm,
                fontWeight: "500",
              }}
            >
              {(invoice.subtotal || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {/* Item-level discounts */}
          {invoice.items?.some((i: any) => i.discountAmount > 0) && (
            <View style={{ paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: spacing.sm }}>
              {invoice.items.filter((i: any) => i.discountAmount > 0).map((i: any) => (
                <View key={i._id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                  <Text style={{ color: colors.warning, fontSize: fontSize.xs }}>
                    Reduction: {i.description}{i.discountReason ? ` (${i.discountReason})` : ""}
                  </Text>
                  <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: "500" }}>
                    -{(i.discountAmount || 0).toLocaleString("fr-FR")} FCFA
                  </Text>
                </View>
              ))}
            </View>
          )}
          {/* Invoice-level discount */}
          {(invoice.discountAmount || 0) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: spacing.sm }}>
              <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>
                Reduction facture{invoice.discountReason ? ` (${invoice.discountReason})` : ""}
              </Text>
              <Text style={{ color: colors.warning, fontSize: fontSize.sm, fontWeight: "500" }}>
                -{(invoice.discountAmount || 0).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          )}
          {invoice.showTax && invoice.taxAmount ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: spacing.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                marginTop: spacing.sm,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                TVA ({invoice.taxRate}%)
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.sm,
                  fontWeight: "500",
                }}
              >
                {(invoice.taxAmount || 0).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              marginTop: spacing.sm,
              paddingTop: spacing.md,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.lg,
                fontWeight: "700",
              }}
            >
              Total
            </Text>
            <Text
              style={{
                color: colors.primary,
                fontSize: fontSize.lg,
                fontWeight: "700",
              }}
            >
              {(invoice.total || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      </View>

      {/* Exchange items */}
      {invoice.type === "echange" && invoice.exchangeItems && invoice.exchangeItems.length > 0 && (
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            Produits echanges ({invoice.exchangeItems.length})
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.warning,
              padding: spacing.lg,
            }}
          >
            {invoice.exchangeItems.map((item, idx) => (
              <View
                key={item._id || idx}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: spacing.sm,
                  ...(idx < invoice.exchangeItems!.length - 1
                    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                    : {}),
                }}
              >
                <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "500", flex: 1 }}>
                  {item.description}
                </Text>
                <Text style={{ color: colors.warning, fontSize: fontSize.sm, fontWeight: "600", marginLeft: spacing.md }}>
                  {(item.unitPrice || 0).toLocaleString("fr-FR")} FCFA
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Payment info */}
      <View style={{ marginBottom: spacing.xl }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <CreditCard size={16} color={colors.textMuted} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
            }}
          >
            Paiement
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
          }}
        >
          {/* Total */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Total facture</Text>
            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "600" }}>
              {(invoice.total || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {/* Already paid */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Montant paye</Text>
            <Text style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: "600" }}>
              {(invoice.payment?.enabled ? invoice.payment.amount : 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {/* Remaining */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700" }}>Reste a payer</Text>
            <Text style={{ color: (invoice.total - (invoice.payment?.enabled ? invoice.payment.amount : 0)) > 0 ? colors.warning : colors.success, fontSize: fontSize.md, fontWeight: "700" }}>
              {Math.max(0, invoice.total - (invoice.payment?.enabled ? invoice.payment.amount : 0)).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {/* Method */}
          {invoice.payment?.method && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm }}>
              Methode : {invoice.payment.method.replace("_", " ")}
            </Text>
          )}
          {/* Date */}
          {invoice.payment?.date && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}>
              Date : {new Date(invoice.payment.date).toLocaleDateString("fr-FR")}
            </Text>
          )}
        </View>
      </View>

      {/* Notes */}
      {invoice.notes ? (
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            Notes
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
            }}
          >
            <Text
              style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
            >
              {invoice.notes}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Warranty */}
      {invoice.warranty?.enabled && (
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.md,
              fontWeight: "600",
              marginBottom: spacing.sm,
            }}
          >
            Garantie
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
            }}
          >
            <Text
              style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 }}
            >
              Duree : {invoice.warranty.duration || "Non specifiee"}
            </Text>
            {invoice.warranty.description && (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSize.sm,
                  marginTop: 4,
                }}
              >
                {invoice.warranty.description}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ── Action Buttons ── */}
      <View style={{ marginBottom: spacing.xl }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.md,
            fontWeight: "600",
            marginBottom: spacing.sm,
          }}
        >
          Actions
        </Text>

        {/* Print / PDF */}
        <TouchableOpacity
          onPress={handlePrint}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Printer size={18} color={colors.primaryForeground} />
          <Text
            style={{
              color: colors.primaryForeground,
              fontSize: fontSize.md,
              fontWeight: "600",
              flex: 1,
            }}
          >
            Imprimer / Telecharger PDF
          </Text>
        </TouchableOpacity>

        {/* Record payment */}
        {invoice.status !== "payee" && invoice.status !== "annulee" && (
          <TouchableOpacity
            onPress={() => setPaymentModalVisible(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              padding: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <CreditCard size={18} color={colors.primaryForeground} />
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: fontSize.md,
                fontWeight: "600",
                flex: 1,
              }}
            >
              Enregistrer un paiement
            </Text>
          </TouchableOpacity>
        )}

        {/* Mark as paid */}
        {invoice.status !== "payee" && invoice.status !== "annulee" && (
          <TouchableOpacity
            onPress={handleMarkAsPaid}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.success,
              padding: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text
              style={{
                color: colors.success,
                fontSize: fontSize.md,
                fontWeight: "600",
                flex: 1,
              }}
            >
              Marquer comme payee
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancel invoice */}
        {invoice.status !== "annulee" && (
          <TouchableOpacity
            onPress={handleCancel}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              backgroundColor: colors.card,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.warning,
              padding: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            <XCircle size={18} color={colors.warning} />
            <Text
              style={{
                color: colors.warning,
                fontSize: fontSize.md,
                fontWeight: "600",
                flex: 1,
              }}
            >
              Annuler la facture
            </Text>
          </TouchableOpacity>
        )}

        {/* Edit */}
        <TouchableOpacity
          onPress={handleEdit}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Edit3 size={18} color={colors.info} />
          <Text
            style={{
              color: colors.info,
              fontSize: fontSize.md,
              fontWeight: "600",
              flex: 1,
            }}
          >
            Modifier la facture
          </Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: colors.card,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.destructive,
            padding: spacing.lg,
            marginBottom: spacing.sm,
          }}
        >
          <Trash2 size={18} color={colors.destructive} />
          <Text
            style={{
              color: colors.destructive,
              fontSize: fontSize.md,
              fontWeight: "600",
              flex: 1,
            }}
          >
            Supprimer la facture
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Payment Modal ── */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              padding: spacing.xl,
              paddingBottom: spacing.xxxl,
            }}
          >
            {/* Modal header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.xl,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.xl,
                  fontWeight: "700",
                }}
              >
                Enregistrer un paiement
              </Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Payment info summary */}
            {(() => {
              const alreadyPaid = invoice?.payment?.enabled ? (invoice.payment.amount || 0) : 0;
              const total = invoice?.total || 0;
              const remaining = Math.max(0, total - alreadyPaid);
              return (
                <View
                  style={{
                    backgroundColor: colors.cardAlt,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                    gap: spacing.xs,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Total facture</Text>
                    <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "600" }}>
                      {total.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Deja paye</Text>
                    <Text style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: "600" }}>
                      {alreadyPaid.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.xs }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700" }}>Reste a payer</Text>
                    <Text style={{ color: remaining > 0 ? colors.warning : colors.success, fontSize: fontSize.md, fontWeight: "700" }}>
                      {remaining.toLocaleString("fr-FR")} FCFA
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Amount */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                marginBottom: spacing.xs,
              }}
            >
              Montant (FCFA)
            </Text>
            <TextInput
              value={paymentAmount}
              onChangeText={(text) => {
                const remaining = Math.max(0, (invoice?.total || 0) - (invoice?.payment?.enabled ? (invoice.payment.amount || 0) : 0));
                const num = parseFloat(text);
                if (text === "" || isNaN(num)) {
                  setPaymentAmount(text);
                } else if (num > remaining) {
                  setPaymentAmount(String(remaining));
                } else {
                  setPaymentAmount(text);
                }
              }}
              keyboardType="numeric"
              placeholder={`Max: ${Math.max(0, (invoice?.total || 0) - (invoice?.payment?.enabled ? (invoice.payment.amount || 0) : 0)).toLocaleString("fr-FR")}`}
              placeholderTextColor={colors.placeholder}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                color: colors.text,
                fontSize: fontSize.md,
                marginBottom: spacing.lg,
              }}
            />

            {/* Payment method */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                marginBottom: spacing.xs,
              }}
            >
              Methode de paiement
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              {PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setPaymentMethod(m.value)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.sm,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.card,
                    }}
                  >
                    <Text
                      style={{
                        color: selected
                          ? colors.primaryForeground
                          : colors.textSecondary,
                        fontSize: fontSize.sm,
                        fontWeight: selected ? "600" : "400",
                      }}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: "600",
                marginBottom: spacing.xs,
              }}
            >
              Date
            </Text>
            <TextInput
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.placeholder}
              style={{
                backgroundColor: colors.inputBackground,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                color: colors.text,
                fontSize: fontSize.md,
                marginBottom: spacing.xl,
              }}
            />

            {/* Submit */}
            <TouchableOpacity
              onPress={handleRecordPayment}
              disabled={submittingPayment}
              style={{
                backgroundColor: submittingPayment
                  ? colors.primaryDark
                  : colors.primary,
                borderRadius: borderRadius.md,
                padding: spacing.lg,
                alignItems: "center",
                marginBottom: spacing.sm,
              }}
            >
              {submittingPayment ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    color: colors.primaryForeground,
                    fontSize: fontSize.md,
                    fontWeight: "700",
                  }}
                >
                  Valider le paiement
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => setPaymentModalVisible(false)}
              style={{
                backgroundColor: colors.card,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.lg,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.md,
                  fontWeight: "600",
                }}
              >
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
