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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Package } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Arrivage } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "ArrivageList">;

type StatusFilter = "all" | "en_cours" | "recu" | "annule";

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Tous", value: "all" },
  { label: "En cours", value: "en_cours" },
  { label: "Recu", value: "recu" },
  { label: "Annule", value: "annule" },
];

export default function ArrivageListScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [arrivages, setArrivages] = useState<Arrivage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const STATUS_COLORS: Record<string, string> = {
    en_cours: "#f59e0b",
    recu: colors.success,
    annule: colors.destructive,
  };

  const STATUS_LABELS: Record<string, string> = {
    en_cours: "En cours",
    recu: "Recu",
    annule: "Annule",
  };

  const fetchArrivages = useCallback(async () => {
    try {
      const res = await apiFetch("/api/arrivages");
      if (res.ok) setArrivages(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArrivages();
  }, [fetchArrivages]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchArrivages();
    });
    return unsubscribe;
  }, [nav, fetchArrivages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArrivages();
  }, [fetchArrivages]);

  const filtered = arrivages.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.reference.toLowerCase().includes(q) ||
        (a.supplier?.name && a.supplier.name.toLowerCase().includes(q))
      );
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
      {/* Search + add */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("CreateArrivage")}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textMuted },
                filter === f.value && { color: colors.primaryForeground, fontWeight: "600" },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate("ArrivageDetail", { arrivageId: item._id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Package size={16} color={colors.primary} />
                <Text style={[styles.orderNumber, { color: colors.text }]}>{item.reference}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: (STATUS_COLORS[item.status] || colors.textDimmed) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_COLORS[item.status] || colors.textDimmed },
                  ]}
                >
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
            </View>
            {item.supplier && (
              <Text style={[styles.supplierName, { color: colors.textDimmed }]}>
                {item.supplier.name}
              </Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
                {item.totalItems} article{item.totalItems > 1 ? "s" : ""}
              </Text>
              <Text style={[styles.total, { color: colors.primary }]}>
                {(item.totalCost || 0).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
            <Text style={[styles.date, { color: colors.textDimmed }]}>
              {new Date(item.date || item.createdAt).toLocaleDateString("fr-FR")}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package size={48} color={colors.textDimmed} />
            <Text style={[styles.emptyText, { color: colors.textDimmed, marginTop: spacing.md }]}>
              Aucun arrivage
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  orderNumber: { fontSize: fontSize.md, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: "600" },
  supplierName: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemCount: { fontSize: fontSize.sm },
  total: { fontSize: fontSize.sm, fontWeight: "600" },
  date: { fontSize: fontSize.xs, marginTop: spacing.xs },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyText: { fontSize: fontSize.md },
});
