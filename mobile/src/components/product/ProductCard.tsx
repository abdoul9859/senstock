import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Package, Tag } from "lucide-react-native";
import type { Product } from "../../types";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  product: Product;
  currency: string;
  onPress: () => void;
}

export default function ProductCard({ product, currency, onPress }: Props) {
  const { colors } = useTheme();

  const stockCount =
    product.variants.length > 0
      ? product.variants.filter((v) => !v.sold).length
      : product.quantity;

  const isLowStock = stockCount <= 3 && stockCount > 0;
  const isOutOfStock = stockCount === 0;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      {product.image ? (
        <Image source={{ uri: product.image }} style={[styles.image, { backgroundColor: colors.cardAlt }]} />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.cardAlt }]}>
          <Package size={24} color={colors.textDimmed} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        {product.brand || product.model ? (
          <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
            {[product.brand, product.model].filter(Boolean).join(" - ")}
          </Text>
        ) : null}

        <View style={styles.row}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {product.sellingPrice.toLocaleString("fr-FR")} {currency}
          </Text>
          <View
            style={[
              styles.badge,
              isOutOfStock && styles.badgeRed,
              isLowStock && styles.badgeOrange,
              !isOutOfStock && !isLowStock && styles.badgeGreen,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isOutOfStock && { color: colors.destructive },
                isLowStock && { color: colors.warning },
                !isOutOfStock && !isLowStock && { color: colors.success },
              ]}
            >
              {stockCount} en stock
            </Text>
          </View>
        </View>

        {product.category ? (
          <View style={styles.categoryRow}>
            <Tag size={12} color={colors.textDimmed} />
            <Text style={[styles.categoryText, { color: colors.textDimmed }]}>{typeof product.category === "object" ? product.category.name : product.category}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
  },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  sub: {
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeGreen: { backgroundColor: "rgba(34,197,94,0.15)" },
  badgeOrange: { backgroundColor: "rgba(245,158,11,0.15)" },
  badgeRed: { backgroundColor: "rgba(239,68,68,0.15)" },
  badgeText: { fontSize: fontSize.xs, fontWeight: "500" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  categoryText: {
    fontSize: fontSize.xs,
  },
});
