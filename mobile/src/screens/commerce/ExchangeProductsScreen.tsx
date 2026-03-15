import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Package, Wrench, ShoppingCart, Clock, Check } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface ExchangeItem {
  id: string;
  _id: string;
  description: string;
  variantLabel: string;
  price: number;
  quantity: number;
  notes: string;
  disposition: string | null;
  maintenanceTicketId: string | null;
  maintenanceTicket?: { id: string; _id: string; number: string; status: string } | null;
  label?: { id: string; name: string; color: string } | null;
  invoice: {
    _id: string;
    number: string;
    date: string;
    client?: { _id: string; name: string } | null;
  };
}

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "revente", label: "Revente" },
  { value: "maintenance", label: "Maintenance" },
];

const dispositionConfig: Record<string, { label: string; color: string }> = {
  revente: { label: "Revente", color: "#22c55e" },
  maintenance: { label: "Maintenance", color: "#f97316" },
};

export default function ExchangeProductsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [maintenanceModal, setMaintenanceModal] = useState<ExchangeItem | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({ issueDescription: "", conditionAtReception: "moyen", accessories: "", estimatedCost: "" });
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const params = filter !== "all" ? `?disposition=${filter}` : "";
      const res = await apiFetch(`/api/exchange-items${params}`);
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function setDisposition(item: ExchangeItem, disposition: string | null) {
    if (disposition === "maintenance") {
      setMaintenanceModal(item);
      setMaintenanceForm({ issueDescription: "", conditionAtReception: "moyen", accessories: "", estimatedCost: "" });
      return;
    }
    try {
      const res = await apiFetch(`/api/exchange-items/${item._id}/disposition`, {
        method: "PATCH",
        body: JSON.stringify({ disposition }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => i._id === item._id ? updated : i));
      }
    } catch { /* silent */ }
  }

  async function createMaintenanceTicket() {
    if (!maintenanceModal) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/exchange-items/${maintenanceModal._id}/create-maintenance`, {
        method: "POST",
        body: JSON.stringify(maintenanceForm),
      });
      if (res.ok) {
        setMaintenanceModal(null);
        fetchItems();
        Alert.alert("Succès", "Ticket de maintenance créé");
      } else {
        const d = await res.json();
        Alert.alert("Erreur", d.error || "Erreur lors de la création");
      }
    } catch { Alert.alert("Erreur", "Erreur réseau"); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border },
              filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, { color: colors.textMuted },
              filter === f.value && { color: "#fff", fontWeight: "600" }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }}
            tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package size={48} color={colors.textDimmed} />
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun produit repris</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
                  {item.description || item.variantLabel || "Produit sans nom"}
                </Text>
                <Text style={[styles.meta, { color: colors.textDimmed }]}>
                  Facture {item.invoice.number} · {item.invoice.client?.name || "Sans client"}
                </Text>
                <Text style={[styles.meta, { color: colors.textDimmed }]}>
                  {new Date(item.invoice.date).toLocaleDateString("fr-FR")}
                  {item.price > 0 ? ` · ${item.price.toLocaleString("fr-FR")} FCFA` : ""}
                </Text>
              </View>
              {item.label && (
                <View style={[styles.labelBadge, { backgroundColor: item.label.color }]}>
                  <Text style={styles.labelText}>{item.label.name}</Text>
                </View>
              )}
            </View>

            {/* Disposition status */}
            {item.disposition ? (
              <View style={styles.dispositionRow}>
                <View style={[styles.dispositionBadge, { backgroundColor: dispositionConfig[item.disposition]?.color + "20" }]}>
                  {item.disposition === "revente" ? <ShoppingCart size={12} color={dispositionConfig[item.disposition].color} /> : <Wrench size={12} color={dispositionConfig[item.disposition].color} />}
                  <Text style={[styles.dispositionText, { color: dispositionConfig[item.disposition]?.color }]}>
                    {dispositionConfig[item.disposition]?.label}
                  </Text>
                </View>
                {item.maintenanceTicket && (
                  <TouchableOpacity
                    style={[styles.ticketBtn, { borderColor: colors.border }]}
                    onPress={() => nav.navigate("MaintenanceDetail", { ticketId: item.maintenanceTicket!._id })}
                  >
                    <Text style={[styles.ticketText, { color: colors.primary }]}>
                      {item.maintenanceTicket.number}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDisposition(item, null)}>
                  <Text style={[styles.resetText, { color: colors.textDimmed }]}>Réinitialiser</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <Text style={[styles.actionLabel, { color: colors.textDimmed }]}>Destination :</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#22c55e20", borderColor: "#22c55e" }]}
                  onPress={() => setDisposition(item, "revente")}
                >
                  <ShoppingCart size={14} color="#22c55e" />
                  <Text style={[styles.actionBtnText, { color: "#22c55e" }]}>Revente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#f9731620", borderColor: "#f97316" }]}
                  onPress={() => setDisposition(item, "maintenance")}
                >
                  <Wrench size={14} color="#f97316" />
                  <Text style={[styles.actionBtnText, { color: "#f97316" }]}>Maintenance</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />

      {/* Maintenance creation modal */}
      <Modal visible={!!maintenanceModal} animationType="slide" transparent onRequestClose={() => setMaintenanceModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Créer un ticket maintenance</Text>
            {maintenanceModal && (
              <Text style={[styles.modalSubtitle, { color: colors.textDimmed }]}>
                {maintenanceModal.description || maintenanceModal.variantLabel}
              </Text>
            )}

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description du problème</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={maintenanceForm.issueDescription}
              onChangeText={(v) => setMaintenanceForm((f) => ({ ...f, issueDescription: v }))}
              placeholder="Décrire le problème..."
              placeholderTextColor={colors.placeholder}
              multiline numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>État à la réception</Text>
            <View style={styles.conditionRow}>
              {["bon", "moyen", "mauvais"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.conditionChip, { borderColor: colors.border },
                    maintenanceForm.conditionAtReception === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setMaintenanceForm((f) => ({ ...f, conditionAtReception: c }))}
                >
                  <Text style={[{ color: colors.text, fontSize: fontSize.sm },
                    maintenanceForm.conditionAtReception === c && { color: "#fff" }]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Coût estimé (FCFA)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              value={maintenanceForm.estimatedCost}
              onChangeText={(v) => setMaintenanceForm((f) => ({ ...f, estimatedCost: v }))}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setMaintenanceModal(null)}>
                <Text style={{ color: colors.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={createMaintenanceTicket} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "600" }}>Créer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", padding: spacing.lg, gap: spacing.sm, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  filterText: { fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: fontSize.md },
  card: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  description: { fontSize: fontSize.md, fontWeight: "600" },
  meta: { fontSize: fontSize.sm, marginTop: 2 },
  labelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  labelText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  dispositionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  dispositionBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dispositionText: { fontSize: fontSize.sm, fontWeight: "600" },
  ticketBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticketText: { fontSize: fontSize.sm, fontWeight: "600" },
  resetText: { fontSize: fontSize.xs, textDecorationLine: "underline" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  actionLabel: { fontSize: fontSize.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: "600" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "700" },
  modalSubtitle: { fontSize: fontSize.sm },
  fieldLabel: { fontSize: fontSize.sm, marginTop: spacing.sm },
  fieldInput: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, marginTop: 4 },
  conditionRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  conditionChip: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1 },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modalBtn: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: borderRadius.sm },
});
