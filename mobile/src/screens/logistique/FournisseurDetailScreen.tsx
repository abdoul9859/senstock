import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Phone, Mail, MapPin, Globe, Edit2, Trash2 } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Supplier } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type RouteDef = RouteProp<ModulesStackParamList, "FournisseurDetail">;
type Nav = NativeStackNavigationProp<ModulesStackParamList, "FournisseurDetail">;

interface SupplierRating {
  _id: string;
  qualityScore: number;
  deliveryScore: number;
  priceScore: number;
  serviceScore: number;
  comment?: string;
  createdAt: string;
}

function renderStars(rating: number): string {
  const filled = Math.round(rating);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= filled ? "\u2605" : "\u2606";
  }
  return stars;
}

export default function FournisseurDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteDef>();
  const nav = useNavigation<Nav>();
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState<(Supplier & { rating?: number; ratingCount?: number }) | null>(null);
  const [ratings, setRatings] = useState<SupplierRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        apiFetch(`/api/suppliers/${supplierId}`),
        apiFetch(`/api/supplier-ratings/${supplierId}`),
      ]);
      if (sRes.ok) setSupplier(await sRes.json());
      if (rRes.ok) setRatings(await rRes.json());
    } catch {
      showAlert("Erreur", "Impossible de charger les donnees");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [nav, fetchData]);

  const handleDelete = () => {
    showConfirm(
      "Supprimer",
      "Voulez-vous vraiment supprimer ce fournisseur ?", async () => {
            try {
              const res = await apiFetch(`/api/suppliers/${supplierId}`, {
                method: "DELETE",
              });
              if (res.ok) {
                nav.goBack();
              } else {
                showAlert("Erreur", "Impossible de supprimer le fournisseur");
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

  if (!supplier) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Fournisseur introuvable</Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchData();
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarLetter, { color: colors.primaryForeground }]}>
            {supplier.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{supplier.name}</Text>
        {supplier.rating != null && (
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(supplier.rating)}</Text>
            <Text style={[styles.ratingCount, { color: colors.textDimmed }]}>
              ({supplier.ratingCount || 0} avis)
            </Text>
          </View>
        )}
      </View>

      {/* Contact info */}
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {supplier.phone && (
          <View style={styles.infoRow}>
            <Phone size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{supplier.phone}</Text>
          </View>
        )}
        {supplier.email && (
          <View style={styles.infoRow}>
            <Mail size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{supplier.email}</Text>
          </View>
        )}
        {supplier.address && (
          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{supplier.address}</Text>
          </View>
        )}
        {supplier.country && (
          <View style={styles.infoRow}>
            <Globe size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{supplier.country}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            nav.navigate("FournisseurForm", { supplierId: supplier._id })
          }
          activeOpacity={0.7}
        >
          <Edit2 size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.destructive }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={colors.destructive} />
          <Text style={[styles.actionText, { color: colors.destructive }]}>
            Supprimer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent ratings */}
      {ratings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Evaluations recentes</Text>
          {ratings.map((r) => (
            <View key={r._id} style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.ratingScores}>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  Qualite: {renderStars(r.qualityScore)}
                </Text>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  Livraison: {renderStars(r.deliveryScore)}
                </Text>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  Prix: {renderStars(r.priceScore)}
                </Text>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  Service: {renderStars(r.serviceScore)}
                </Text>
              </View>
              {r.comment && (
                <Text style={[styles.ratingComment, { color: colors.textMuted }]}>{r.comment}</Text>
              )}
              <Text style={[styles.ratingDate, { color: colors.textDimmed }]}>
                {new Date(r.createdAt).toLocaleDateString("fr-FR")}
              </Text>
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
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stars: {
    color: "#f59e0b",
    fontSize: fontSize.lg,
  },
  ratingCount: {
    fontSize: fontSize.sm,
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
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  ratingCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  ratingScores: {
    gap: spacing.xs,
  },
  ratingLabel: {
    fontSize: fontSize.sm,
  },
  ratingComment: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  ratingDate: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
});
