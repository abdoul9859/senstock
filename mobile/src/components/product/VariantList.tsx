import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Circle, CircleCheck } from "lucide-react-native";
import type { ProductVariant } from "../../types";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  variants: ProductVariant[];
  currency: string;
}

export default function VariantList({ variants, currency }: Props) {
  const { colors } = useTheme();

  if (variants.length === 0) return null;

  const available = variants.filter((v) => !v.sold).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          Variants ({available}/{variants.length} disponibles)
        </Text>
      </View>
      {variants.map((v) => (
        <View key={v._id} style={[styles.row, { borderBottomColor: colors.border }, v.sold && styles.rowSold]}>
          {v.sold ? (
            <CircleCheck size={16} color={colors.textDimmed} />
          ) : (
            <Circle size={16} color={colors.success} />
          )}
          <Text style={[styles.name, { color: colors.text }, v.sold && styles.nameSold]} numberOfLines={1}>
            {v.name}
          </Text>
          <Text style={[styles.price, { color: colors.primary }, v.sold && { color: colors.textDimmed }]}>
            {v.sellingPrice.toLocaleString("fr-FR")} {currency}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowSold: {
    opacity: 0.5,
  },
  name: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  nameSold: {
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
