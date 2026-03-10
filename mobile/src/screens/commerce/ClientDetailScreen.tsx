import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity } from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { User, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import InvoiceCard from "../../components/invoice/InvoiceCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Client, Invoice } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "ClientDetail">;
type Nav = NativeStackNavigationProp<AppStackParamList, "ClientDetail">;

export default function ClientDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const { clientId } = route.params;
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          apiFetch("/api/clients"),
          apiFetch("/api/invoices"),
        ]);
        if (cRes.ok) {
          const all: Client[] = await cRes.json();
          setClient(all.find((c) => c._id === clientId) || null);
        }
        if (iRes.ok) {
          const all: Invoice[] = await iRes.json();
          setInvoices(all.filter((i) => i.client?._id === clientId));
        }
      } catch {
        showAlert("Erreur", "Impossible de charger les donnees");
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  function handleEdit() {
    nav.navigate("ClientForm", { clientId });
  }

  function handleDelete() {
    showConfirm(
      "Supprimer le client",
      "Etes-vous sur de vouloir supprimer ce client ?", async () => {
            try {
              const res = await apiFetch(`/api/clients/${clientId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                showAlert("Succes", "Client supprime", () => nav.goBack());
              } else {
                showAlert("Erreur", "Impossible de supprimer le client");
              }
            } catch {
              showAlert("Erreur", "Impossible de contacter le serveur");
            }
          });
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Client introuvable</Text>
      </View>
    );
  }

  const totalSpent = invoices
    .filter((i) => i.status === "payee")
    .reduce((s, i) => s + i.total, 0);

  return (
    <ScreenContainer>
      {/* Avatar + name */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarLetter, { color: colors.primaryForeground }]}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{client.name}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Pencil size={16} color={colors.primaryForeground} />
          <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.danger || "#dc2626" }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#fff" />
          <Text style={[styles.actionText, { color: "#fff" }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      {/* Contact info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {client.phone && (
          <View style={styles.infoRow}>
            <Phone size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{client.phone}</Text>
          </View>
        )}
        {client.email && (
          <View style={styles.infoRow}>
            <Mail size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{client.email}</Text>
          </View>
        )}
        {client.address && (
          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{client.address}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{invoices.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Factures</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSpent.toLocaleString("fr-FR")}</Text>
          <Text style={[styles.statLabel, { color: colors.textDimmed }]}>FCFA depense</Text>
        </View>
      </View>

      {/* Invoices */}
      {invoices.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Historique factures</Text>
          {invoices.map((inv) => (
            <View key={inv._id} style={{ marginBottom: spacing.sm }}>
              <InvoiceCard invoice={inv} currency="FCFA" onPress={() => nav.navigate("InvoiceDetail", { invoiceId: inv._id })} />
            </View>
          ))}
        </>
      )}
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
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: "600",
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
});
