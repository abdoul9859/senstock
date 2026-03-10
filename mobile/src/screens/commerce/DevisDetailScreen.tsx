import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FileText, User, Calendar, Trash2, ArrowRightCircle, Printer } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "DevisDetail">;
type Nav = NativeStackNavigationProp<AppStackParamList, "DevisDetail">;

type QuoteStatus = "en_attente" | "accepte" | "refuse" | "expire";

interface QuoteItem {
  _id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Quote {
  _id: string;
  number: string;
  client?: { _id: string; name: string; phone?: string; email?: string };
  date: string;
  validityDate?: string;
  items: QuoteItem[];
  subtotal: number;
  showTax?: boolean;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  accepte: "Accepte",
  refuse: "Refuse",
  expire: "Expire",
};

export default function DevisDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const { quoteId } = route.params;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_COLORS: Record<string, string> = {
    en_attente: colors.info,
    accepte: colors.success,
    refuse: colors.destructive,
    expire: colors.textDimmed,
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/quotes/${quoteId}`);
        if (res.ok) {
          setQuote(await res.json());
        }
      } catch {
        showAlert("Erreur", "Impossible de charger le devis");
      } finally {
        setLoading(false);
      }
    })();
  }, [quoteId]);

  async function handleConvert() {
    showConfirm(
      "Convertir en facture",
      "Voulez-vous convertir ce devis en facture ?", async () => {
            try {
              const res = await apiFetch(`/api/quotes/${quoteId}/convert`, {
                method: "POST",
              });
              if (res.ok) {
                showAlert("Succes", "Devis converti en facture");
                nav.goBack();
              } else {
                const err = await res.json().catch(() => null);
                showAlert("Erreur", err?.error || "Impossible de convertir le devis");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            }
          });
  }

  async function handleDelete() {
    showConfirm(
      "Supprimer le devis",
      "Etes-vous sur de vouloir supprimer ce devis ?", async () => {
            try {
              const res = await apiFetch(`/api/quotes/${quoteId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                nav.goBack();
              } else {
                showAlert("Erreur", "Impossible de supprimer le devis");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            }
          });
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Devis introuvable</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[quote.status] || colors.textDimmed;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <FileText size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.number, { color: colors.text }]}>{quote.number}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATUS_LABELS[quote.status] || quote.status}
          </Text>
        </View>
        <Text style={[styles.total, { color: colors.primary }]}>
          {quote.total.toLocaleString("fr-FR")} FCFA
        </Text>
      </View>

      {/* Client info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientName, { color: colors.text }]}>{quote.client?.name || "Inconnu"}</Text>
          {quote.client?.phone && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{quote.client.phone}</Text>
          )}
          {quote.client?.email && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{quote.client.email}</Text>
          )}
        </View>
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Dates</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
            Date : {new Date(quote.date).toLocaleDateString("fr-FR")}
          </Text>
          {quote.validityDate && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
              Validite : {new Date(quote.validityDate).toLocaleDateString("fr-FR")}
            </Text>
          )}
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles ({quote.items.length})</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {quote.items.map((item) => (
            <View key={item._id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.itemSub, { color: colors.textDimmed }]}>
                  {item.quantity} x {item.unitPrice.toLocaleString("fr-FR")} FCFA
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.text }]}>
                {(item.quantity * item.unitPrice).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          ))}
          {/* Totals */}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Sous-total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {quote.subtotal.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {quote.showTax && quote.taxAmount ? (
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>TVA ({quote.taxRate}%)</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {quote.taxAmount.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
              {quote.total.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      {quote.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{quote.notes}</Text>
          </View>
        </View>
      ) : null}

      {/* Actions */}
      <TouchableOpacity
        style={[styles.printBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (typeof window !== "undefined") window.print();
        }}
        activeOpacity={0.8}
      >
        <Printer size={18} color={colors.primaryForeground} />
        <Text style={[styles.convertBtnText, { color: colors.primaryForeground }]}>Imprimer / Telecharger PDF</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.convertBtn, { backgroundColor: colors.primary }]}
          onPress={handleConvert}
          activeOpacity={0.8}
        >
          <ArrowRightCircle size={18} color={colors.primaryForeground} />
          <Text style={[styles.convertBtnText, { color: colors.primaryForeground }]}>Convertir en facture</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.destructive }]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={18} color={colors.destructiveForeground} />
        </TouchableOpacity>
      </View>
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
  status: {
    fontSize: fontSize.sm,
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemDesc: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemSub: {
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
  totalLabel: {
    fontSize: fontSize.sm,
  },
  totalValue: {
    fontSize: fontSize.sm,
    fontWeight: "500",
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
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  convertBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
  },
  convertBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
  },
});
