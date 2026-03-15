import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Wrench } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface MaintenanceTicket {
  _id: string;
  number: string;
  deviceName: string;
  deviceBrand: string;
  clientName: string;
  clientPhone: string;
  status: string;
  priority: string;
  finalCost: number;
  paymentStatus: string;
  receivedDate: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  recu: { label: "Reçu", color: "#3b82f6" },
  diagnostic: { label: "Diagnostic", color: "#8b5cf6" },
  en_reparation: { label: "En réparation", color: "#f97316" },
  pret: { label: "Prêt", color: "#22c55e" },
  rendu: { label: "Rendu", color: "#64748b" },
  annule: { label: "Annulé", color: "#ef4444" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "recu", label: "Reçus" },
  { value: "en_reparation", label: "En réparation" },
  { value: "pret", label: "Prêts" },
  { value: "rendu", label: "Rendus" },
];

export default function MaintenanceListScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    try {
      const res = await apiFetch("/api/maintenance");
      if (res.ok) setTickets(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => {
    const unsub = nav.addListener("focus", () => fetchTickets());
    return unsub;
  }, [nav, fetchTickets]);

  const filtered = tickets.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.number.toLowerCase().includes(q)
        || t.clientName.toLowerCase().includes(q)
        || t.deviceName.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search} onChangeText={setSearch}
            placeholder="Rechercher..." placeholderTextColor={colors.placeholder}
          />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("CreateMaintenance")} activeOpacity={0.7}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.value}
            style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(f.value)}>
            <Text style={[styles.filterText, { color: colors.textMuted },
              filter === f.value && { color: "#fff", fontWeight: "600" }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Wrench size={48} color={colors.textDimmed} />
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun ticket</Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS_CONFIG[item.status] || { label: item.status, color: "#64748b" };
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nav.navigate("MaintenanceDetail", { ticketId: item._id })} activeOpacity={0.7}>
              <View style={styles.cardTop}>
                <Text style={[styles.number, { color: colors.textDimmed }]}>{item.number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: s.color + "20" }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={[styles.device, { color: colors.text }]}>
                {[item.deviceBrand, item.deviceName].filter(Boolean).join(" ") || "Appareil inconnu"}
              </Text>
              <Text style={[styles.client, { color: colors.textDimmed }]}>
                {item.clientName} · {item.clientPhone}
              </Text>
              {item.finalCost > 0 && (
                <Text style={[styles.cost, { color: colors.primary }]}>
                  {item.finalCost.toLocaleString("fr-FR")} FCFA
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: borderRadius.sm, borderWidth: 1, paddingHorizontal: spacing.md, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  addBtn: { width: 44, height: 44, borderRadius: borderRadius.sm, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  filterText: { fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: fontSize.md },
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { fontSize: fontSize.sm },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  device: { fontSize: fontSize.md, fontWeight: "600" },
  client: { fontSize: fontSize.sm },
  cost: { fontSize: fontSize.sm, fontWeight: "600" },
});
