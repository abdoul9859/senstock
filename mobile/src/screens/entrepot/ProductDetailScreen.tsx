import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, RefreshControl } from "react-native";
import { showAlert } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Package, Pencil, Tag, DollarSign, Circle, CircleCheck } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Product } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "ProductDetail">;

export default function ProductDetailScreen() {
  const route = useRoute<RouteDef>();
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProduct = React.useCallback(async () => {
    try {
      // Try single-product endpoint first, fallback to list
      let res = await apiFetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        // Fallback: fetch all and find
        res = await apiFetch("/api/products");
        if (res.ok) {
          const all: Product[] = await res.json();
          const found = all.find((p) => p._id === productId || (p as any).id === productId);
          setProduct(found || null);
        }
      }
    } catch {
      showAlert("Erreur", "Impossible de charger le produit");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Refresh on screen focus
  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchProduct();
    });
    return unsubscribe;
  }, [nav, fetchProduct]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Produit introuvable</Text>
      </View>
    );
  }

  const stockCount =
    product.variants && product.variants.length > 0
      ? product.variants.filter((v) => !v.sold).length
      : product.quantity;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchProduct().finally(() => setRefreshing(false)); }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Image */}
      {product.image ? (
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.card }]}>
          <Package size={48} color={colors.textDimmed} />
        </View>
      )}

      {/* Title + edit */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
          {product.brand || product.model ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {[product.brand, product.model].filter(Boolean).join(" - ")}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => nav.navigate("ProductForm", { productId: product._id })}
        >
          <Pencil size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info cards */}
      <View style={styles.infoGrid}>
        <View style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DollarSign size={16} color={colors.primary} />
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Prix vente</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{(product.sellingPrice || 0).toLocaleString("fr-FR")} FCFA</Text>
        </View>
        <View style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DollarSign size={16} color={colors.textMuted} />
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Prix achat</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{(product.purchasePrice || 0).toLocaleString("fr-FR")} FCFA</Text>
        </View>
        <View style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Package size={16} color={stockCount === 0 ? colors.destructive : colors.success} />
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Stock</Text>
          <Text style={[styles.infoValue, { color: stockCount === 0 ? colors.destructive : colors.text }]}>{stockCount}</Text>
        </View>
        {product.category && typeof product.category === "object" ? (
          <View style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Tag size={16} color={colors.info} />
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Categorie</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{product.category.name}</Text>
          </View>
        ) : null}
        {(product as any).supplier && typeof (product as any).supplier === "object" ? (
          <View style={[styles.infoItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Tag size={16} color={colors.warning} />
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Fournisseur</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{(product as any).supplier.name}</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {product.description ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{product.description}</Text>
        </View>
      ) : null}

      {/* Notes */}
      {product.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{product.notes}</Text>
        </View>
      ) : null}

      {/* Variants */}
      {product.variants && product.variants.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Variantes ({product.variants.filter(v => !v.sold).length}/{product.variants.length} disponibles)
          </Text>
          <View style={[styles.variantContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {product.variants.map((v: any) => (
              <View key={v._id || v.id} style={[styles.variantRow, { borderBottomColor: colors.border }, v.sold && { opacity: 0.5 }]}>
                {v.sold ? <CircleCheck size={16} color={colors.textDimmed} /> : <Circle size={16} color={colors.success} />}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.variantName, { color: colors.text }, v.sold && { textDecorationLine: "line-through" }]} numberOfLines={1}>
                    {v.serialNumber || v.name || "—"}
                  </Text>
                  {v.condition ? (
                    <Text style={[{ fontSize: 11, color: colors.textMuted }]}>
                      {v.condition}{v.barcode ? ` · ${v.barcode}` : ""}
                    </Text>
                  ) : v.barcode ? (
                    <Text style={[{ fontSize: 11, color: colors.textMuted }]}>{v.barcode}</Text>
                  ) : null}
                </View>
                <Text style={[styles.variantPrice, { color: v.sold ? colors.textDimmed : colors.primary }]}>
                  {((v.price ?? v.sellingPrice ?? product.sellingPrice) || 0).toLocaleString("fr-FR")} FCFA
                </Text>
                {v.sold && (
                  <Text style={{ fontSize: 10, color: colors.destructive, fontWeight: "600" }}>VENDU</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: fontSize.md },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  image: { width: "100%", height: 200, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  imagePlaceholder: {
    width: "100%", height: 160, borderRadius: borderRadius.md,
    justifyContent: "center", alignItems: "center", marginBottom: spacing.lg,
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.lg },
  name: { fontSize: fontSize.xxl, fontWeight: "700" },
  subtitle: { fontSize: fontSize.md, marginTop: 2 },
  editBtn: {
    width: 40, height: 40, borderRadius: borderRadius.sm,
    borderWidth: 1, justifyContent: "center", alignItems: "center",
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  infoItem: {
    borderRadius: borderRadius.sm, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  infoLabel: { fontSize: fontSize.sm },
  infoValue: { fontSize: fontSize.sm, fontWeight: "600" },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "600", marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, lineHeight: 22 },
  variantContainer: { borderRadius: borderRadius.md, borderWidth: 1, overflow: "hidden" },
  variantHeader: { padding: spacing.md, borderBottomWidth: 1 },
  variantHeaderText: { fontSize: fontSize.sm, fontWeight: "600" },
  variantRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  variantName: { flex: 1, fontSize: fontSize.sm },
  variantPrice: { fontSize: fontSize.sm, fontWeight: "600" },
});
