import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FileText } from "lucide-react-native";
import type { Invoice } from "../../types";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  invoice: Invoice;
  currency: string;
  onPress: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  payee: "Payee",
  partielle: "Partielle",
  impayee: "Impayee",
  annulee: "Annulee",
};

const TYPE_LABELS: Record<string, string> = {
  facture: "Facture",
  proforma: "Proforma",
  avoir: "Avoir",
  echange: "Echange",
  vente_flash: "Vente flash",
};

export default function InvoiceCard({ invoice, currency, onPress }: Props) {
  const { colors } = useTheme();

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    payee: { bg: "rgba(34,197,94,0.15)", text: colors.success },
    partielle: { bg: "rgba(245,158,11,0.15)", text: colors.warning },
    impayee: { bg: "rgba(239,68,68,0.15)", text: colors.destructive },
    annulee: { bg: "rgba(113,113,122,0.15)", text: colors.textDimmed },
  };

  const statusStyle = STATUS_COLORS[invoice.status] || STATUS_COLORS.impayee;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          <FileText size={18} color={colors.primary} />
          <View>
            <Text style={[styles.number, { color: colors.text }]}>{invoice.number}</Text>
            <Text style={[styles.type, { color: colors.textDimmed }]}>{TYPE_LABELS[invoice.type] || invoice.type}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {STATUS_LABELS[invoice.status] || invoice.status}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.client, { color: colors.textSecondary }]} numberOfLines={1}>
          {invoice.client?.name || "Client inconnu"}
        </Text>
        <Text style={[styles.total, { color: colors.primary }]}>
          {invoice.total.toLocaleString("fr-FR")} {currency}
        </Text>
      </View>

      <Text style={[styles.date, { color: colors.textDimmed }]}>
        {new Date(invoice.date).toLocaleDateString("fr-FR")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  number: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  type: {
    fontSize: fontSize.xs,
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
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  client: {
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  total: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  date: {
    fontSize: fontSize.xs,
  },
});
