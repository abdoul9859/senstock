import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  } from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Phone, Mail, Briefcase, DollarSign, Calendar, Edit2, Trash2 } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Employee } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "EmployeDetail">;
type RouteDef = RouteProp<ModulesStackParamList, "EmployeDetail">;

export default function EmployeDetailScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const { employeeId } = route.params;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/employees/${employeeId}`);
        if (res.ok) {
          setEmployee(await res.json());
        } else {
          // fallback: fetch all and find
          const allRes = await apiFetch("/api/employees");
          if (allRes.ok) {
            const all: Employee[] = await allRes.json();
            setEmployee(all.find((e) => e._id === employeeId) || null);
          }
        }
      } catch {
        showAlert("Erreur", "Impossible de charger les donnees");
      } finally {
        setLoading(false);
      }
    })();
  }, [employeeId]);

  const handleDelete = () => {
    showConfirm(
      "Supprimer l'employe",
      "Etes-vous sur de vouloir supprimer cet employe ?", async () => {
            try {
              const res = await apiFetch(`/api/employees/${employeeId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                nav.goBack();
              } else {
                showAlert("Erreur", "Impossible de supprimer l'employe");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            }
          });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Employe introuvable</Text>
      </View>
    );
  }

  const startDateFormatted = employee.startDate
    ? new Date(employee.startDate).toLocaleDateString("fr-FR")
    : null;

  return (
    <ScreenContainer>
      {/* Avatar + name */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarLetter, { color: colors.primaryForeground }]}>
            {employee.firstName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {employee.firstName} {employee.lastName}
        </Text>
        {employee.role && <Text style={[styles.role, { color: colors.textMuted }]}>{employee.role}</Text>}
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {employee.phone && (
          <View style={styles.infoRow}>
            <Phone size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{employee.phone}</Text>
          </View>
        )}
        {employee.email && (
          <View style={styles.infoRow}>
            <Mail size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{employee.email}</Text>
          </View>
        )}
        {employee.role && (
          <View style={styles.infoRow}>
            <Briefcase size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{employee.role}</Text>
          </View>
        )}
        {employee.salary != null && (
          <View style={styles.infoRow}>
            <DollarSign size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {employee.salary.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        )}
        {startDateFormatted && (
          <View style={styles.infoRow}>
            <Calendar size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{startDateFormatted}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("EmployeForm", { employeeId: employee._id })}
          activeOpacity={0.7}
        >
          <Edit2 size={18} color={colors.primaryForeground} />
          <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.destructive }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={colors.destructiveForeground} />
          <Text style={[styles.deleteBtnText, { color: colors.destructiveForeground }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: fontSize.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarLetter: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  role: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  infoCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoText: {
    fontSize: fontSize.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  editBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  deleteBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
