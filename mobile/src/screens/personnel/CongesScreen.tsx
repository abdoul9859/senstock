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
  Modal,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { Plus, Check, X, Calendar, Search } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Employee } from "../../types";

interface LeaveRequest {
  _id: string;
  employee?: { _id: string; firstName: string; lastName: string };
  employeeId?: string;
  type: string;
  startDate: string;
  endDate: string;
  days?: number;
  reason?: string;
  status: string;
}

interface LeaveStats {
  pending?: number;
  approved?: number;
  refused?: number;
}

type StatusFilter = "all" | "en_attente" | "approuve" | "refuse";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "Tous", value: "all" },
  { label: "En attente", value: "en_attente" },
  { label: "Approuves", value: "approuve" },
  { label: "Refuses", value: "refuse" },
];

const LEAVE_TYPES: { label: string; value: string }[] = [
  { label: "Conge paye", value: "conge_paye" },
  { label: "Maladie", value: "maladie" },
  { label: "Sans solde", value: "sans_solde" },
  { label: "Maternite", value: "maternite" },
  { label: "Autre", value: "autre" },
];

function getLeaveTypeLabel(type: string): string {
  const found = LEAVE_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

export default function CongesScreen() {
  const { colors } = useTheme();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formType, setFormType] = useState("conge_paye");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formReason, setFormReason] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [lRes, sRes, eRes] = await Promise.all([
        apiFetch("/api/leaves"),
        apiFetch("/api/leaves/stats"),
        apiFetch("/api/employees"),
      ]);
      if (lRes.ok) setLeaves(await lRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  async function handleApprove(id: string) {
    try {
      const res = await apiFetch(`/api/leaves/${id}/approve`, { method: "PUT" });
      if (res.ok) fetchData();
      else showAlert("Erreur", "Impossible d'approuver");
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    }
  }

  async function handleRefuse(id: string) {
    try {
      const res = await apiFetch(`/api/leaves/${id}/refuse`, { method: "PUT" });
      if (res.ok) fetchData();
      else showAlert("Erreur", "Impossible de refuser");
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    }
  }

  async function handleSubmitLeave() {
    if (!formEmployeeId) {
      showAlert("Champ requis", "Selectionnez un employe.");
      return;
    }
    if (!formStartDate.trim() || !formEndDate.trim()) {
      showAlert("Champs requis", "Les dates sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/leaves", {
        method: "POST",
        body: JSON.stringify({
          employeeId: formEmployeeId,
          type: formType,
          startDate: formStartDate.trim(),
          endDate: formEndDate.trim(),
          reason: formReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de creer le conge");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormEmployeeId("");
    setFormType("conge_paye");
    setFormStartDate("");
    setFormEndDate("");
    setFormReason("");
    setEmployeeSearch("");
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "approuve":
        return { bg: colors.success + "20", color: colors.success, label: "Approuve" };
      case "en_attente":
        return { bg: colors.warning + "20", color: colors.warning, label: "En attente" };
      case "refuse":
        return { bg: colors.destructive + "20", color: colors.destructive, label: "Refuse" };
      default:
        return { bg: colors.textDimmed + "20", color: colors.textDimmed, label: status };
    }
  }

  const filtered = leaves.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    return true;
  });

  const filteredEmployees = employeeSearch.trim()
    ? employees.filter((e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : employees.slice(0, 10);

  const selectedEmployee = employees.find((e) => e._id === formEmployeeId);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {stats.pending || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>En attente</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.approved || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Approuves</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.destructive }]}>
            {stats.refused || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Refuses</Text>
        </View>
      </View>

      {/* Filters + Add */}
      <View style={styles.filterAddRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => (
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
        </ScrollView>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowForm(true)}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
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
        renderItem={({ item }) => {
          const statusInfo = getStatusStyle(item.status);
          const empName = item.employee
            ? `${item.employee.firstName} ${item.employee.lastName}`
            : "Employe";
          const start = new Date(item.startDate).toLocaleDateString("fr-FR");
          const end = new Date(item.endDate).toLocaleDateString("fr-FR");
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{empName}</Text>
                <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.badgeText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardType, { color: colors.textMuted }]}>{getLeaveTypeLabel(item.type)}</Text>
              <View style={styles.cardDates}>
                <Calendar size={14} color={colors.textDimmed} />
                <Text style={[styles.cardDateText, { color: colors.textDimmed }]}>
                  {start} - {end}
                  {item.days != null ? ` (${item.days}j)` : ""}
                </Text>
              </View>
              {item.reason && (
                <Text style={[styles.cardReason, { color: colors.textDimmed }]} numberOfLines={2}>
                  {item.reason}
                </Text>
              )}
              {item.status === "en_attente" && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: colors.success }]}
                    onPress={() => handleApprove(item._id)}
                    activeOpacity={0.7}
                  >
                    <Check size={16} color={colors.primaryForeground} />
                    <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Approuver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.refuseBtn, { backgroundColor: colors.destructive }]}
                    onPress={() => handleRefuse(item._id)}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={colors.destructiveForeground} />
                    <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune demande de conge</Text>
          </View>
        }
      />

      {/* Add Leave Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau conge</Text>
                <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Employee picker */}
              <Text style={[styles.label, { color: colors.textMuted }]}>Employe *</Text>
              {selectedEmployee ? (
                <View style={[styles.selectedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.selectedText, { color: colors.text }]}>
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </Text>
                  <TouchableOpacity onPress={() => setFormEmployeeId("")}>
                    <Text style={[styles.changeLink, { color: colors.primary }]}>Changer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                    <Search size={16} color={colors.textDimmed} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      value={employeeSearch}
                      onChangeText={setEmployeeSearch}
                      placeholder="Rechercher un employe..."
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  {filteredEmployees.map((e) => (
                    <TouchableOpacity
                      key={e._id}
                      style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setFormEmployeeId(e._id);
                        setEmployeeSearch("");
                      }}
                    >
                      <Text style={[styles.pickerText, { color: colors.text }]}>
                        {e.firstName} {e.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Leave type */}
              <Text style={[styles.label, { color: colors.textMuted }]}>Type de conge</Text>
              <View style={styles.typeGrid}>
                {LEAVE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      formType === t.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFormType(t.value)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textMuted },
                        formType === t.value && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dates */}
              <Text style={[styles.label, { color: colors.textMuted }]}>Date debut (AAAA-MM-JJ) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formStartDate}
                onChangeText={setFormStartDate}
                placeholder="2024-01-15"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Date fin (AAAA-MM-JJ) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formEndDate}
                onChangeText={setFormEndDate}
                placeholder="2024-01-20"
                placeholderTextColor={colors.placeholder}
              />

              {/* Reason */}
              <Text style={[styles.label, { color: colors.textMuted }]}>Motif</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formReason}
                onChangeText={setFormReason}
                placeholder="Motif du conge..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.btnDisabled]}
                onPress={handleSubmitLeave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Creer la demande</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  filterAddRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  cardType: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  cardDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardDateText: {
    fontSize: fontSize.sm,
  },
  cardReason: {
    fontSize: fontSize.sm,
    fontStyle: "italic",
    marginTop: spacing.xs,
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
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
  },
  refuseBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  selectedText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  changeLink: {
    fontSize: fontSize.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  pickerRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerText: {
    fontSize: fontSize.sm,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: fontSize.sm,
  },
  submitBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
});
