import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ArrowRightLeft } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { StockMovement } from "../../types";

export default function MouvementsScreen() {
  const { colors } = useTheme();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovements = useCallback(async () => {
    try {
      const res = await apiFetch("/api/movements");
      if (res.ok) {
        setMovements(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMovements();
  }, [fetchMovements]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={movements}
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
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ArrowRightLeft size={18} color={colors.primary} />
            <View style={styles.info}>
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                {item.product?.name || "Produit"}
              </Text>
              <Text style={[styles.detail, { color: colors.textMuted }]}>
                {item.type} · Qte: {item.quantity}
              </Text>
              {item.note ? (
                <Text style={[styles.note, { color: colors.textDimmed }]} numberOfLines={1}>{item.note}</Text>
              ) : null}
            </View>
            <Text style={[styles.date, { color: colors.textDimmed }]}>
              {new Date(item.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun mouvement enregistre</Text>
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
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  info: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  detail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  note: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  date: {
    fontSize: fontSize.xs,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
