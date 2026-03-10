import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Package, Boxes, AlertTriangle, ArrowRightLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Product } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function EntrepotDashboard() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs - same logic as web dashboard
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => {
    if (p.variants && p.variants.length > 0) {
      return sum + p.variants.filter((v) => !v.sold).reduce((s, v) => s + ((v as any).price || v.sellingPrice || p.sellingPrice || 0), 0);
    }
    return sum + (p.sellingPrice || 0) * (p.quantity || 0);
  }, 0);
  const outOfStock = products.filter((p) => {
    const qty = p.variants && p.variants.length > 0
      ? p.variants.filter((v) => !v.sold).length
      : (p.quantity || 0);
    return qty === 0;
  }).length;
  const availableVariants = products.reduce((sum, p) => {
    if (p.variants && p.variants.length > 0) return sum + p.variants.filter(v => !v.sold).length;
    return sum;
  }, 0);

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }}
          tintColor={colors.primary} />
      }
    >
      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.kpiIconRow}>
            <Package size={18} color={colors.primary} />
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Produits</Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>{totalProducts}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.kpiIconRow}>
            <Boxes size={18} color={colors.info} />
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Valeur stock</Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>
            {totalValue >= 1_000_000
              ? `${(totalValue / 1_000_000).toFixed(1)}M`
              : totalValue >= 1_000
              ? `${(totalValue / 1_000).toFixed(0)}k`
              : String(totalValue)}
          </Text>
          <Text style={[styles.kpiSub, { color: colors.textDimmed }]}>FCFA</Text>
        </View>
      </View>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.kpiIconRow}>
            <AlertTriangle size={18} color={colors.destructive} />
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Ruptures</Text>
          </View>
          <Text style={[styles.kpiValue, { color: outOfStock > 0 ? colors.destructive : colors.text }]}>{outOfStock}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.kpiIconRow}>
            <ArrowRightLeft size={18} color={colors.warning} />
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Variants dispo.</Text>
          </View>
          <Text style={[styles.kpiValue, { color: colors.text }]}>{availableVariants}</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => nav.navigate("ProductList")} activeOpacity={0.7}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Produits</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => nav.navigate("Categories")} activeOpacity={0.7}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Categories</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => nav.navigate("Mouvements")} activeOpacity={0.7}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>Mouvements</Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Recent products */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Produits recents</Text>
      {recentProducts.map((p) => {
        const qty = p.variants && p.variants.length > 0
          ? p.variants.filter(v => !v.sold).length
          : (p.quantity || 0);
        return (
          <TouchableOpacity
            key={p._id}
            style={[styles.recentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate("ProductDetail", { productId: p._id })}
            activeOpacity={0.7}
          >
            <View style={styles.recentInfo}>
              <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.recentSub, { color: colors.textMuted }]}>
                {(p.sellingPrice || 0).toLocaleString("fr-FR")} FCFA • Qte: {qty}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textDimmed} />
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  content: { padding: spacing.lg },
  kpiGrid: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  kpiCard: {
    flex: 1, borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, minWidth: 140,
  },
  kpiIconRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  kpiLabel: { fontSize: fontSize.sm, flex: 1 },
  kpiValue: { fontSize: fontSize.xxl, fontWeight: "700" },
  kpiSub: { fontSize: fontSize.xs, marginTop: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: borderRadius.md, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  actionLabel: { fontSize: fontSize.md, fontWeight: "500" },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "600", marginBottom: spacing.md },
  recentRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: borderRadius.sm, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.sm,
  },
  recentInfo: { flex: 1 },
  recentName: { fontSize: fontSize.md, fontWeight: "500" },
  recentSub: { fontSize: fontSize.sm, marginTop: 2 },
});
