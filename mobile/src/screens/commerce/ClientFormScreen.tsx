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
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { showAlert } from "../../utils/alert";
import type { Client } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "ClientForm">;
type Nav = NativeStackNavigationProp<AppStackParamList, "ClientForm">;

export default function ClientFormScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const clientId = route.params?.clientId;
  const isEdit = !!clientId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiFetch("/api/clients");
        if (res.ok) {
          const all: Client[] = await res.json();
          const found = all.find((c) => c._id === clientId);
          if (found) {
            setName(found.name || "");
            setPhone(found.phone || "");
            setEmail(found.email || "");
            setAddress(found.address || "");
          }
        }
      } catch {
        Alert.alert("Erreur", "Impossible de charger le client");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, clientId]);

  async function handleSubmit() {
    if (!name.trim()) {
      showAlert("Nom requis", "Veuillez saisir le nom du client.");
      return;
    }

    setSaving(true);
    try {
      const body = { name, phone, email, address };
      const res = await apiFetch(
        isEdit ? `/api/clients/${clientId}` : "/api/clients",
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        showAlert("Succes", isEdit ? "Client modifie" : "Client cree", () => nav.goBack());
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>Nom *</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        value={name}
        onChangeText={setName}
        placeholder="Nom du client"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Telephone</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        value={phone}
        onChangeText={setPhone}
        placeholder="Numero de telephone"
        placeholderTextColor={colors.placeholder}
        keyboardType="phone-pad"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        value={email}
        onChangeText={setEmail}
        placeholder="Adresse email"
        placeholderTextColor={colors.placeholder}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Adresse</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        value={address}
        onChangeText={setAddress}
        placeholder="Adresse"
        placeholderTextColor={colors.placeholder}
      />

      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: colors.primary },
          saving && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {isEdit ? "Enregistrer" : "Creer le client"}
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
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
