import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Barcode, Monitor, Smartphone, FileEdit } from "lucide-react-native";
import BarcodeScanner from "../../components/BarcodeScanner";
import InvoiceCard from "../../components/invoice/InvoiceCard";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Invoice, InvoiceStatus } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const FILTERS: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "Toutes", value: "all" },
  { label: "Impayees", value: "impayee" },
  { label: "Partielles", value: "partielle" },
  { label: "Payees", value: "payee" },
];

interface DraftInvoice {
  _id: string;
  id?: string;
  number: string;
  type: string;
  date: string;
  total: number;
  lastEditedOn?: "web" | "mobile";
  updatedAt?: string;
  client?: { id: string; name: string } | null;
}

export default function InvoiceListScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [drafts, setDrafts] = useState<DraftInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [showScanner, setShowScanner] = useState(false);

  async function handleBarcodeScan(data: string) {
    setShowScanner(false);
    try {
      const res = await apiFetch(`/api/invoices/by-product?barcode=${encodeURIComponent(data)}`);
      if (res.ok) {
        const invoice = await res.json();
        nav.navigate("InvoiceDetail", { invoiceId: invoice._id });
      } else {
        setSearch(data);
      }
    } catch {
      setSearch(data);
    }
  }

  const fetchInvoices = useCallback(async () => {
    try {
      const [invRes, draftRes] = await Promise.all([
        apiFetch("/api/invoices"),
        apiFetch("/api/invoices/drafts"),
      ]);
      if (invRes.ok) setInvoices(await invRes.json());
      if (draftRes.ok) {
        const draftData = await draftRes.json();
        setDrafts(draftData.map((d: any) => ({ ...d, _id: d._id || d.id })));
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    const unsub = nav.addListener("focus", () => fetchInvoices());
    return unsub;
  }, [nav, fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return inv.number.toLowerCase().includes(q) || (inv.client?.name && inv.client.name.toLowerCase().includes(q));
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
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => setShowScanner(true)} activeOpacity={0.7}>
          <Barcode size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("CreateInvoice")} activeOpacity={0.7}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleBarcodeScan}
        title="Scanner pour trouver une facture"
      />

      {/* Filters */}
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
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvoices(); }}
            tintColor={colors.primary} />
        }
        ListHeaderComponent={
          drafts.length > 0 ? (
            <View style={styles.draftsSection}>
              <View style={styles.draftsSectionHeader}>
                <FileEdit size={18} color={colors.primary} />
                <Text style={[styles.draftsSectionTitle, { color: colors.text }]}>
                  Brouillons ({drafts.length})
                </Text>
              </View>
              {drafts.map((draft) => (
                <TouchableOpacity
                  key={draft._id}
                  style={[styles.draftCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => nav.navigate("CreateInvoice", { invoiceId: draft._id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.draftCardTop}>
                    <View style={styles.draftCardInfo}>
                      <Text style={[styles.draftType, { color: colors.primary }]}>
                        {draft.type === "facture" ? "Facture" : draft.type === "proforma" ? "Proforma" : draft.type === "vente_flash" ? "Vente flash" : draft.type === "avoir" ? "Avoir" : draft.type === "echange" ? "Echange" : draft.type}
                      </Text>
                      <Text style={[styles.draftNumber, { color: colors.textMuted }]}>
                        {draft.number}
                      </Text>
                    </View>
                    <View style={styles.draftPlatformBadge}>
                      {draft.lastEditedOn === "web" ? (
                        <Monitor size={14} color={colors.textMuted} />
                      ) : (
                        <Smartphone size={14} color={colors.textMuted} />
                      )}
                      <Text style={[styles.draftPlatformText, { color: colors.textMuted }]}>
                        {draft.lastEditedOn === "web" ? "Web" : "Mobile"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.draftCardBottom}>
                    <Text style={[styles.draftClient, { color: colors.textSecondary }]}>
                      {draft.client?.name || "Sans client"}
                    </Text>
                    <Text style={[styles.draftTotal, { color: colors.text }]}>
                      {draft.total.toLocaleString()} FCFA
                    </Text>
                  </View>
                  {draft.updatedAt && (
                    <Text style={[styles.draftDate, { color: colors.textDimmed }]}>
                      {new Date(draft.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              <View style={[styles.draftsDivider, { borderBottomColor: colors.border }]} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <InvoiceCard invoice={item} currency="FCFA"
            onPress={() => nav.navigate("InvoiceDetail", { invoiceId: item._id })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune facture</Text>
          </View>
        }
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
  filterRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  filterText: { fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyText: { fontSize: fontSize.md },

  // Drafts section
  draftsSection: { marginBottom: spacing.md },
  draftsSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  draftsSectionTitle: { fontSize: fontSize.lg, fontWeight: "600" },
  draftCard: {
    borderWidth: 1, borderRadius: borderRadius.sm,
    padding: spacing.md, marginBottom: spacing.sm,
    borderStyle: "dashed" as const,
  },
  draftCardTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: spacing.xs,
  },
  draftCardInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  draftType: { fontSize: fontSize.sm, fontWeight: "600", textTransform: "capitalize" },
  draftNumber: { fontSize: fontSize.xs },
  draftPlatformBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  draftPlatformText: { fontSize: fontSize.xs },
  draftCardBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  draftClient: { fontSize: fontSize.sm },
  draftTotal: { fontSize: fontSize.md, fontWeight: "600" },
  draftDate: { fontSize: fontSize.xs, marginTop: 4 },
  draftsDivider: { borderBottomWidth: 1, marginTop: spacing.sm, marginBottom: spacing.sm },
});
