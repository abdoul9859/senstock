import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { showAlert } from "../../utils/alert";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { FileText, User, Calendar, MapPin, Package, Printer } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type RouteDef = RouteProp<AppStackParamList, "BonLivraisonDetail">;

type DeliveryNoteStatus = "en_cours" | "livre";

interface DeliveryNoteItem {
  _id: string;
  description: string;
  quantity: number;
}

interface DeliveryNote {
  _id: string;
  number: string;
  invoice?: { _id: string; number: string };
  client?: { _id: string; name: string; phone?: string; email?: string; address?: string };
  deliveryAddress?: string;
  status: DeliveryNoteStatus;
  date: string;
  deliveryDate?: string;
  items: DeliveryNoteItem[];
  notes?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  en_cours: "En cours",
  livre: "Livre",
};

export default function BonLivraisonDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const { deliveryNoteId } = route.params;
  const [note, setNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_COLORS: Record<string, string> = {
    en_cours: colors.warning,
    livre: colors.success,
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/delivery-notes/${deliveryNoteId}`);
        if (res.ok) {
          setNote(await res.json());
        }
      } catch {
        showAlert("Erreur", "Impossible de charger le bon de livraison");
      } finally {
        setLoading(false);
      }
    })();
  }, [deliveryNoteId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Bon de livraison introuvable</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[note.status] || colors.textDimmed;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <FileText size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.number, { color: colors.text }]}>{note.number}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {STATUS_LABELS[note.status] || note.status}
          </Text>
        </View>
      </View>

      {/* Related invoice */}
      {note.invoice?.number && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Facture associee</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.clientName, { color: colors.text }]}>{note.invoice.number}</Text>
          </View>
        </View>
      )}

      {/* Client info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientName, { color: colors.text }]}>{note.client?.name || "Inconnu"}</Text>
          {note.client?.phone && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{note.client.phone}</Text>
          )}
          {note.client?.email && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{note.client.email}</Text>
          )}
        </View>
      </View>

      {/* Delivery address */}
      {(note.deliveryAddress || note.client?.address) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Adresse de livraison</Text>
          </View>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
              {note.deliveryAddress || note.client?.address}
            </Text>
          </View>
        </View>
      )}

      {/* Dates */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Dates</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
            Date : {new Date(note.date).toLocaleDateString("fr-FR")}
          </Text>
          {note.deliveryDate && (
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>
              Livraison : {new Date(note.deliveryDate).toLocaleDateString("fr-FR")}
            </Text>
          )}
        </View>
      </View>

      {/* Items */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Package size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles ({note.items.length})</Text>
        </View>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {note.items.map((item) => (
            <View key={item._id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
              <Text style={[styles.itemQty, { color: colors.textMuted }]}>x{item.quantity}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Notes */}
      {note.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.clientDetail, { color: colors.textMuted }]}>{note.notes}</Text>
          </View>
        </View>
      ) : null}

      {/* Print */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          backgroundColor: colors.primary,
          borderRadius: borderRadius.sm,
          paddingVertical: spacing.lg,
          marginTop: spacing.md,
        }}
        onPress={() => {
          if (typeof window !== "undefined") window.print();
        }}
        activeOpacity={0.8}
      >
        <Printer size={18} color={colors.primaryForeground} />
        <Text style={{ color: colors.primaryForeground, fontSize: fontSize.md, fontWeight: "600" }}>
          Imprimer
        </Text>
      </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  number: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  status: {
    fontSize: fontSize.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  infoCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  clientDetail: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemDesc: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    flex: 1,
  },
  itemQty: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginLeft: spacing.md,
  },
});
