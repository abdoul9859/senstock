import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { InvoiceItem } from "../../types";
import { spacing, fontSize } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  item: InvoiceItem;
  currency: string;
}

export default function InvoiceItemRow({ item, currency }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.description || item.productId?.name || "Article"}
        </Text>
        <Text style={[styles.detail, { color: colors.textDimmed }]}>
          {item.quantity} x {(item.unitPrice || 0).toLocaleString("fr-FR")} {currency}
        </Text>
        {((item as any).discountAmount || 0) > 0 && (
          <Text style={{ fontSize: fontSize.xs, color: "#f59e0b", marginTop: 1 }}>
            Reduction: -{((item as any).discountAmount || 0).toLocaleString("fr-FR")} {currency}
            {(item as any).discountReason ? ` (${(item as any).discountReason})` : ""}
          </Text>
        )}
      </View>
      <Text style={[styles.total, { color: colors.text }]}>
        {(item.total || 0).toLocaleString("fr-FR")} {currency}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  detail: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  total: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
});
