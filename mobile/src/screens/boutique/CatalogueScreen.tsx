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
  Image,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { Search, Eye, EyeOff } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Product } from "../../types";

export default function CatalogueScreen() {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const togglePublish = useCallback(
    async (product: Product) => {
      const currentPublished = (product as any).published ?? false;
      setToggling(product._id);
      try {
        const res = await apiFetch(
          `/api/boutique/products/${product._id}/publish`,
          {
            method: "POST",
            body: JSON.stringify({ published: !currentPublished }),
          }
        );
        if (res.ok) {
          setProducts((prev) =>
            prev.map((p) =>
              p._id === product._id
                ? { ...p, published: !currentPublished } as any
                : p
            )
          );
        } else {
          showAlert("Erreur", "Impossible de modifier le statut");
        }
      } catch {
        showAlert("Erreur", "Erreur de connexion");
      } finally {
        setToggling(null);
      }
    },
    []
  );

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.model && p.model.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderProduct = ({ item }: { item: Product }) => {
    const published = (item as any).published ?? false;
    const isToggling = toggling === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.cardAlt }]}>
            <Text style={[styles.imagePlaceholderText, { color: colors.textDimmed }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            {item.sellingPrice.toLocaleString("fr-FR")} FCFA
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                published ? styles.badgePublished : styles.badgeUnpublished,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  published
                    ? { color: colors.success }
                    : { color: colors.textDimmed },
                ]}
              >
                {published ? "Publie" : "Non publie"}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            published ? styles.toggleBtnActive : styles.toggleBtnInactive,
          ]}
          onPress={() => togglePublish(item)}
          activeOpacity={0.7}
          disabled={isToggling}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : published ? (
            <EyeOff size={18} color={colors.text} />
          ) : (
            <Eye size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

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
      </View>

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
        renderItem={renderProduct}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun produit</Text>
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  cardContent: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  productPrice: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgePublished: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  badgeUnpublished: {
    backgroundColor: "rgba(113,113,122,0.15)",
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  toggleBtnInactive: {
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
