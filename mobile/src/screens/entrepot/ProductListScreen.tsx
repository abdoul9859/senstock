import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Tag } from "lucide-react-native";
import ProductCard from "../../components/product/ProductCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Product } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

interface ProductLabel {
  id: string;
  name: string;
  color: string;
}

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ProductListScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [availableLabels, setAvailableLabels] = useState<ProductLabel[]>([]);
  const [filterLabelIds, setFilterLabelIds] = useState<string[]>([]);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/product-labels");
      if (res.ok) setAvailableLabels(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchLabels();
  }, [fetchProducts, fetchLabels]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchProducts();
    });
    return unsubscribe;
  }, [nav, fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterLabelIds.length > 0) {
      const pLabelIds = ((p as any).labels || []).map((l: any) => l.label?.id);
      if (!filterLabelIds.some((id) => pLabelIds.includes(id))) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("ProductForm")}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {availableLabels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.labelChips}
        >
          {availableLabels.map((lbl) => {
            const active = filterLabelIds.includes(lbl.id);
            return (
              <TouchableOpacity
                key={lbl.id}
                onPress={() =>
                  setFilterLabelIds((prev) =>
                    active ? prev.filter((id) => id !== lbl.id) : [...prev, lbl.id]
                  )
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? lbl.color : "transparent",
                    borderColor: lbl.color,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : lbl.color }]}>
                  {lbl.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
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
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            currency="FCFA"
            onPress={() => nav.navigate("ProductDetail", { productId: item._id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>
              {search ? "Aucun produit trouve" : "Aucun produit"}
            </Text>
          </View>
        }
      />
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  labelChips: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
