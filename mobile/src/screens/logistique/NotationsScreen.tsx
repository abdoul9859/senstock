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
  Modal,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Supplier } from "../../types";

interface SupplierWithRating extends Supplier {
  rating?: number;
  ratingCount?: number;
}

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

function StarPicker({
  value,
  onChange,
  label,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  colors: any;
}) {
  return (
    <View style={pickerStyles.row}>
      <Text style={[pickerStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={pickerStyles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <Text style={pickerStyles.star}>
              {n <= value ? "\u2605" : "\u2606"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  stars: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  star: {
    color: "#f59e0b",
    fontSize: fontSize.xxl,
  },
});

export default function NotationsScreen() {
  const { colors } = useTheme();
  const [suppliers, setSuppliers] = useState<SupplierWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, SupplierRating[]>>({});
  const [loadingRatings, setLoadingRatings] = useState<string | null>(null);

  // Add rating form
  const [showForm, setShowForm] = useState(false);
  const [formSupplierId, setFormSupplierId] = useState<string | null>(null);
  const [formSupplierName, setFormSupplierName] = useState("");
  const [qualityScore, setQualityScore] = useState(3);
  const [deliveryScore, setDeliveryScore] = useState(3);
  const [priceScore, setPriceScore] = useState(3);
  const [serviceScore, setServiceScore] = useState(3);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRatings({});
    setExpandedId(null);
    fetchSuppliers();
  }, [fetchSuppliers]);

  const toggleExpand = async (supplierId: string) => {
    if (expandedId === supplierId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(supplierId);
    if (!ratings[supplierId]) {
      setLoadingRatings(supplierId);
      try {
        const res = await apiFetch(`/api/supplier-ratings/${supplierId}`);
        if (res.ok) {
          const data = await res.json();
          setRatings((prev) => ({ ...prev, [supplierId]: data }));
        }
      } catch {
        // silent
      } finally {
        setLoadingRatings(null);
      }
    }
  };

  const openRatingForm = (supplier: SupplierWithRating) => {
    setFormSupplierId(supplier._id);
    setFormSupplierName(supplier.name);
    setQualityScore(3);
    setDeliveryScore(3);
    setPriceScore(3);
    setServiceScore(3);
    setComment("");
    setShowForm(true);
  };

  const submitRating = async () => {
    if (!formSupplierId) return;
    setSaving(true);
    try {
      const body = {
        supplierId: formSupplierId,
        qualityScore,
        deliveryScore,
        priceScore,
        serviceScore,
        comment,
      };
      const res = await apiFetch("/api/supplier-ratings", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        // Refresh ratings for this supplier
        setRatings((prev) => {
          const copy = { ...prev };
          delete copy[formSupplierId!];
          return copy;
        });
        fetchSuppliers();
        if (expandedId === formSupplierId) {
          // Re-fetch ratings
          const rRes = await apiFetch(`/api/supplier-ratings/${formSupplierId}`);
          if (rRes.ok) {
            const data = await rRes.json();
            setRatings((prev) => ({ ...prev, [formSupplierId!]: data }));
          }
        }
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible d'ajouter la notation");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={suppliers}
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
          const isExpanded = expandedId === item._id;
          const supplierRatings = ratings[item._id] || [];
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggleExpand(item._id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.stars}>
                      {renderStars(item.rating || 0)}
                    </Text>
                    <Text style={[styles.ratingCount, { color: colors.textDimmed }]}>
                      ({item.ratingCount || 0})
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addRatingBtn, { backgroundColor: colors.primary }]}
                  onPress={() => openRatingForm(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.addRatingText, { color: colors.primaryForeground }]}>+ Noter</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.ratingsContainer, { borderTopColor: colors.border }]}>
                  {loadingRatings === item._id ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={{ padding: spacing.md }}
                    />
                  ) : supplierRatings.length === 0 ? (
                    <Text style={[styles.noRatings, { color: colors.textDimmed }]}>
                      Aucune evaluation pour le moment
                    </Text>
                  ) : (
                    supplierRatings.map((r) => (
                      <View key={r._id} style={[styles.ratingItem, { backgroundColor: colors.cardAlt }]}>
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
                    ))
                  )}
                </View>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun fournisseur</Text>
          </View>
        }
      />

      {/* Rating Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Noter {formSupplierName}
            </Text>

            <StarPicker
              value={qualityScore}
              onChange={setQualityScore}
              label="Qualite"
              colors={colors}
            />
            <StarPicker
              value={deliveryScore}
              onChange={setDeliveryScore}
              label="Livraison"
              colors={colors}
            />
            <StarPicker
              value={priceScore}
              onChange={setPriceScore}
              label="Prix"
              colors={colors}
            />
            <StarPicker
              value={serviceScore}
              onChange={setServiceScore}
              label="Service"
              colors={colors}
            />

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Commentaire (optionnel)"
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowForm(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
                onPress={submitRating}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
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
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stars: {
    color: "#f59e0b",
    fontSize: fontSize.md,
  },
  ratingCount: {
    fontSize: fontSize.xs,
  },
  addRatingBtn: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addRatingText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  ratingsContainer: {
    borderTopWidth: 1,
    padding: spacing.md,
  },
  noRatings: {
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  ratingItem: {
    borderRadius: borderRadius.sm,
    padding: spacing.md,
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
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
