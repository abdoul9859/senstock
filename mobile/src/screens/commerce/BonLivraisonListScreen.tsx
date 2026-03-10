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
import { Search } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "BonLivraisonList">;

type DeliveryNoteStatus = "en_cours" | "livre";

interface DeliveryNote {
  _id: string;
  number: string;
  invoice?: { _id: string; number: string };
  client?: { _id: string; name: string };
  status: DeliveryNoteStatus;
  date: string;
  items: any[];
  createdAt: string;
}

const FILTERS: { label: string; value: DeliveryNoteStatus | "all" }[] = [
  { label: "Tous", value: "all" },
  { label: "En cours", value: "en_cours" },
  { label: "Livres", value: "livre" },
];

const STATUS_LABELS: Record<DeliveryNoteStatus, string> = {
  en_cours: "En cours",
  livre: "Livre",
};

export default function BonLivraisonListScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DeliveryNoteStatus | "all">("all");

  const STATUS_COLORS: Record<DeliveryNoteStatus, string> = {
    en_cours: colors.warning,
    livre: colors.success,
  };

  const fetchNotes = useCallback(async () => {
    try {
      const res = await apiFetch("/api/delivery-notes");
      if (res.ok) setNotes(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchNotes();
    });
    return unsubscribe;
  }, [nav, fetchNotes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [fetchNotes]);

  const filtered = notes.filter((n) => {
    if (filter !== "all" && n.status !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        n.number.toLowerCase().includes(s) ||
        (n.client?.name && n.client.name.toLowerCase().includes(s)) ||
        (n.invoice?.number && n.invoice.number.toLowerCase().includes(s))
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
      {/* Search */}
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
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, { color: colors.textMuted }, filter === f.value && { color: colors.primaryForeground, fontWeight: "600" }]}>
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
            onPress={() => nav.navigate("BonLivraisonDetail", { deliveryNoteId: item._id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardNumber, { color: colors.text }]}>{item.number}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
            </View>
            {item.invoice?.number && (
              <Text style={[styles.cardRef, { color: colors.textDimmed }]}>Facture : {item.invoice.number}</Text>
            )}
            <View style={styles.cardBottom}>
              <Text style={[styles.cardClient, { color: colors.textMuted }]}>{item.client?.name || "Inconnu"}</Text>
              <Text style={[styles.cardDate, { color: colors.textDimmed }]}>
                {new Date(item.date).toLocaleDateString("fr-FR")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun bon de livraison</Text>
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
    padding: spacing.lg,
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: fontSize.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardNumber: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  cardRef: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardClient: {
    fontSize: fontSize.sm,
  },
  cardDate: {
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
