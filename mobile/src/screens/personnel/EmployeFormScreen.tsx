import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Employee } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "EmployeForm">;
type RouteDef = RouteProp<ModulesStackParamList, "EmployeForm">;

export default function EmployeFormScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const employeeId = route.params?.employeeId;
  const isEdit = !!employeeId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiFetch(`/api/employees/${employeeId}`);
        if (res.ok) {
          const emp: Employee = await res.json();
          setFirstName(emp.firstName || "");
          setLastName(emp.lastName || "");
          setPhone(emp.phone || "");
          setEmail(emp.email || "");
          setRole(emp.role || "");
          setSalary(emp.salary != null ? String(emp.salary) : "");
          setStartDate(
            emp.startDate ? emp.startDate.split("T")[0] : ""
          );
        } else {
          // fallback: fetch all
          const allRes = await apiFetch("/api/employees");
          if (allRes.ok) {
            const all: Employee[] = await allRes.json();
            const emp = all.find((e) => e._id === employeeId);
            if (emp) {
              setFirstName(emp.firstName || "");
              setLastName(emp.lastName || "");
              setPhone(emp.phone || "");
              setEmail(emp.email || "");
              setRole(emp.role || "");
              setSalary(emp.salary != null ? String(emp.salary) : "");
              setStartDate(
                emp.startDate ? emp.startDate.split("T")[0] : ""
              );
            }
          }
        }
      } catch {
        showAlert("Erreur", "Impossible de charger les donnees");
      } finally {
        setLoading(false);
      }
    })();
  }, [employeeId, isEdit]);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert("Champs requis", "Le prenom et le nom sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role: role.trim() || undefined,
        salary: salary.trim() ? Number(salary) : undefined,
        startDate: startDate.trim() || undefined,
      };

      const url = isEdit ? `/api/employees/${employeeId}` : "/api/employees";
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        nav.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de sauvegarder");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isEdit ? "Modifier l'employe" : "Nouvel employe"}
      </Text>

      <Text style={[styles.label, { color: colors.textMuted }]}>Prenom *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Prenom"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Nom *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Nom"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Telephone</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={phone}
        onChangeText={setPhone}
        placeholder="Telephone"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Poste / Role</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={role}
        onChangeText={setRole}
        placeholder="Ex: Vendeur, Caissier..."
        placeholderTextColor={colors.placeholder}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Salaire (FCFA)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={salary}
        onChangeText={setSalary}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Date de debut (AAAA-MM-JJ)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="2024-01-15"
        placeholderTextColor={colors.placeholder}
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {isEdit ? "Enregistrer" : "Creer l'employe"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.xl,
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
  submitBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
});
