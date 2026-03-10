import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

type QuoteStatus = "en_attente" | "accepte" | "refuse" | "expire";

interface Quote {
  _id: string;
  number: string;
  client?: { _id: string; name: string };
  date: string;
  total: number;
  status: QuoteStatus;
  createdAt: string;
}

const FILTERS: { label: string; value: QuoteStatus | "all" }[] = [
  { label: "Tous", value: "all" },
  { label: "En attente", value: "en_attente" },
  { label: "Acceptes", value: "accepte" },
  { label: "Refuses", value: "refuse" },
];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  en_attente: "En attente", accepte: "Accepte", refuse: "Refuse", expire: "Expire",
};

export default function DevisListScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");

  const statusColor = (s: QuoteStatus) => {
    const map: Record<QuoteStatus, string> = {
      en_attente: colors.info, accepte: colors.success, refuse: colors.destructive, expire: colors.textDimmed,
    };
    return map[s] || colors.textDimmed;
  };

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await apiFetch("/api/quotes");
      if (res.ok) setQuotes(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => {
    const unsub = nav.addListener("focus", () => fetchQuotes());
    return unsub;
  }, [nav, fetchQuotes]);

  const filtered = quotes.filter((q) => {
    if (filter !== "all" && q.status !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return q.number.toLowerCase().includes(s) || (q.client?.name && q.client.name.toLowerCase().includes(s));
    }
    return true;
  });

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} value={search} onChangeText={setSearch}
            placeholder="Rechercher..." placeholderTextColor={colors.placeholder} />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("CreateDevis")} activeOpacity={0.7}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.value}
            style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(f.value)}>
            <Text style={[{ color: colors.textMuted, fontSize: fontSize.sm },
              filter === f.value && { color: "#fff", fontWeight: "600" }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuotes(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate("DevisDetail", { quoteId: item._id })} activeOpacity={0.7}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardNumber, { color: colors.text }]}>{item.number}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>
            <Text style={[styles.cardClient, { color: colors.textMuted }]}>{item.client?.name || "Inconnu"}</Text>
            <View style={styles.cardBottom}>
              <Text style={[{ color: colors.textDimmed, fontSize: fontSize.xs }]}>{new Date(item.date).toLocaleDateString("fr-FR")}</Text>
              <Text style={[{ color: colors.primary, fontSize: fontSize.md, fontWeight: "700" }]}>{item.total.toLocaleString("fr-FR")} FCFA</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={[{ color: colors.textDimmed, fontSize: fontSize.md }]}>Aucun devis</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderRadius: borderRadius.sm, borderWidth: 1, paddingHorizontal: spacing.md, gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  addBtn: { width: 44, height: 44, borderRadius: borderRadius.sm, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  cardNumber: { fontSize: fontSize.md, fontWeight: "600" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
  cardClient: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
});
