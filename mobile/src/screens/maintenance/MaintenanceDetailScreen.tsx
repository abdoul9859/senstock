import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { Pencil, Wrench, User, Calendar, DollarSign } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, "MaintenanceDetail">;

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  recu: { label: "Reçu", color: "#3b82f6", next: "diagnostic", nextLabel: "Passer en diagnostic" },
  diagnostic: { label: "Diagnostic", color: "#8b5cf6", next: "en_reparation", nextLabel: "Commencer réparation" },
  en_reparation: { label: "En réparation", color: "#f97316", next: "pret", nextLabel: "Marquer prêt" },
  pret: { label: "Prêt", color: "#22c55e", next: "rendu", nextLabel: "Marquer rendu" },
  rendu: { label: "Rendu", color: "#64748b" },
  annule: { label: "Annulé", color: "#ef4444" },
};

export default function MaintenanceDetailScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    apiFetch(`/api/maintenance/${route.params.ticketId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setTicket)
      .finally(() => setLoading(false));
  }, [route.params.ticketId]);

  async function advanceStatus() {
    if (!ticket) return;
    const s = STATUS_CONFIG[ticket.status];
    if (!s?.next) return;
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/maintenance/${ticket._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: s.next }),
      });
      if (res.ok) setTicket(await res.json());
    } catch { Alert.alert("Erreur", "Impossible de changer le statut"); }
    finally { setUpdatingStatus(false); }
  }

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!ticket) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textDimmed }}>Ticket introuvable</Text>
    </View>
  );

  const s = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: "#64748b" };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.number, { color: colors.textDimmed }]}>{ticket.number}</Text>
          <Text style={[styles.device, { color: colors.text }]}>
            {[ticket.deviceBrand, ticket.deviceName, ticket.deviceModel].filter(Boolean).join(" ") || "Appareil"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: s.color + "20" }]}>
          <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
        </View>
      </View>

      {/* Client */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.textDimmed} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{ticket.clientName}</Text>
        <Text style={[styles.sub, { color: colors.textDimmed }]}>{ticket.clientPhone}</Text>
        {ticket.clientEmail && <Text style={[styles.sub, { color: colors.textDimmed }]}>{ticket.clientEmail}</Text>}
      </View>

      {/* Problem */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Wrench size={16} color={colors.textDimmed} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Problème</Text>
        </View>
        <Text style={[styles.value, { color: colors.text }]}>{ticket.issueDescription}</Text>
        {ticket.accessories && <Text style={[styles.sub, { color: colors.textDimmed }]}>Accessoires: {ticket.accessories}</Text>}
        <Text style={[styles.sub, { color: colors.textDimmed }]}>État réception: {ticket.conditionAtReception}</Text>
      </View>

      {/* Diagnostic */}
      {ticket.diagnostic && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Diagnostic</Text>
          <Text style={[styles.value, { color: colors.text }]}>{ticket.diagnostic}</Text>
        </View>
      )}

      {/* Costs */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <DollarSign size={16} color={colors.textDimmed} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Coûts</Text>
        </View>
        {ticket.estimatedCost > 0 && (
          <Text style={[styles.sub, { color: colors.textDimmed }]}>
            Estimé: {ticket.estimatedCost.toLocaleString("fr-FR")} FCFA
          </Text>
        )}
        {ticket.finalCost > 0 && (
          <Text style={[styles.value, { color: colors.primary }]}>
            Final: {ticket.finalCost.toLocaleString("fr-FR")} FCFA
          </Text>
        )}
        <Text style={[styles.sub, { color: colors.textDimmed }]}>Paiement: {ticket.paymentStatus}</Text>
      </View>

      {/* Parts */}
      {ticket.partsUsed && ticket.partsUsed.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pièces utilisées</Text>
          {ticket.partsUsed.map((p: any, i: number) => (
            <View key={i} style={styles.partRow}>
              <Text style={[styles.sub, { color: colors.text, flex: 1 }]}>{p.name} x{p.quantity}</Text>
              <Text style={[styles.sub, { color: colors.textDimmed }]}>{p.unitPrice.toLocaleString("fr-FR")} FCFA</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={() => nav.navigate("CreateMaintenance", { ticketId: ticket._id })}>
          <Pencil size={18} color={colors.text} />
          <Text style={[styles.editBtnText, { color: colors.text }]}>Modifier</Text>
        </TouchableOpacity>
        {s.next && (
          <TouchableOpacity style={[styles.advanceBtn, { backgroundColor: s.color }]}
            onPress={advanceStatus} disabled={updatingStatus}>
            {updatingStatus
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.advanceBtnText}>{s.nextLabel}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  number: { fontSize: fontSize.sm, marginBottom: 4 },
  device: { fontSize: fontSize.xl, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: "700" },
  section: { borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.md, gap: 4 },
  sectionHeader: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 4 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: "600" },
  value: { fontSize: fontSize.md },
  sub: { fontSize: fontSize.sm },
  partRow: { flexDirection: "row", justifyContent: "space-between" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  editBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: borderRadius.sm, paddingVertical: spacing.md },
  editBtnText: { fontSize: fontSize.md, fontWeight: "600" },
  advanceBtn: { flex: 2, alignItems: "center", justifyContent: "center", borderRadius: borderRadius.sm, paddingVertical: spacing.md },
  advanceBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
});
