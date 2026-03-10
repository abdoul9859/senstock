import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  } from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { ChevronLeft, ChevronRight, Users, CheckCircle } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Employee } from "../../types";

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string;
  status: string;
}

interface AttendanceStats {
  present?: number;
  absent?: number;
  late?: number;
  onLeave?: number;
}

type AttendanceStatus = "present" | "absent" | "retard" | "conge";

export default function PresencesScreen() {
  const { colors } = useTheme();

  const STATUS_OPTIONS: { label: string; value: AttendanceStatus; color: string }[] = [
    { label: "P", value: "present", color: colors.success },
    { label: "A", value: "absent", color: colors.destructive },
    { label: "R", value: "retard", color: colors.warning },
    { label: "C", value: "conge", color: colors.info },
  ];

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, attRes, statsRes] = await Promise.all([
        apiFetch("/api/employees"),
        apiFetch(`/api/attendance?date=${date}`),
        apiFetch(`/api/attendance/stats?date=${date}`),
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  function changeDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  }

  function getEmployeeStatus(employeeId: string): string {
    const record = attendance.find((a) => a.employeeId === employeeId);
    return record?.status || "";
  }

  async function handleSetStatus(employeeId: string, status: AttendanceStatus) {
    try {
      const res = await apiFetch("/api/attendance", {
        method: "POST",
        body: JSON.stringify({ employeeId, date, status }),
      });
      if (res.ok) {
        fetchData();
      } else {
        showAlert("Erreur", "Impossible d'enregistrer la presence");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    }
  }

  async function handleMarkAllPresent() {
    showConfirm(
      "Marquer tous presents",
      "Marquer tous les employes comme presents ?", async () => {
            setMarkingAll(true);
            try {
              const res = await apiFetch("/api/attendance/bulk", {
                method: "POST",
                body: JSON.stringify({
                  date,
                  status: "present",
                  employeeIds: employees.map((e) => e._id),
                }),
              });
              if (res.ok) {
                fetchData();
              } else {
                showAlert("Erreur", "Impossible de marquer la presence en lot");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            } finally {
              setMarkingAll(false);
            }
          });
  }

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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
      {/* Date selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={() => changeDate(-1)} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: colors.text }]}>{displayDate}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} activeOpacity={0.7}>
          <ChevronRight size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {stats.present || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Presents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.destructive }]}>
            {stats.absent || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Absents</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {stats.late || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Retards</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.info }]}>
            {stats.onLeave || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Conges</Text>
        </View>
      </View>

      {/* Mark all present */}
      <TouchableOpacity
        style={[styles.markAllBtn, { backgroundColor: colors.primary }, markingAll && styles.btnDisabled]}
        onPress={handleMarkAllPresent}
        disabled={markingAll}
        activeOpacity={0.7}
      >
        {markingAll ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <CheckCircle size={18} color={colors.primaryForeground} />
            <Text style={[styles.markAllText, { color: colors.primaryForeground }]}>Marquer tous presents</Text>
          </>
        )}
      </TouchableOpacity>

      <FlatList
        data={employees}
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
          const currentStatus = getEmployeeStatus(item._id);
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                  {item.firstName} {item.lastName}
                </Text>
                {item.role && (
                  <Text style={[styles.cardRole, { color: colors.textDimmed }]}>{item.role}</Text>
                )}
              </View>
              <View style={styles.statusToggles}>
                {STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusBtn,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                      currentStatus === opt.value && {
                        backgroundColor: opt.color,
                        borderColor: opt.color,
                      },
                    ]}
                    onPress={() => handleSetStatus(item._id, opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        { color: colors.textMuted },
                        currentStatus === opt.value && { color: colors.primaryForeground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={32} color={colors.textDimmed} />
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun employe</Text>
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
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  markAllText: {
    fontSize: fontSize.md,
    fontWeight: "600",
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  cardRole: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  statusToggles: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBtnText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
