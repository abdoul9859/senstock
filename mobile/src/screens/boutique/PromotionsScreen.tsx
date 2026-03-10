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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import { Plus, Trash2, Tag } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Promotion {
  _id: string;
  name: string;
  type: "pourcentage" | "fixe";
  value: number;
  startDate: string;
  endDate: string;
  active?: boolean;
}

export default function PromotionsScreen() {
  const { colors } = useTheme();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"pourcentage" | "fixe">("pourcentage");
  const [formValue, setFormValue] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await apiFetch("/api/boutique/promotions");
      if (res.ok) setPromotions(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPromotions();
  }, [fetchPromotions]);

  const resetForm = () => {
    setFormName("");
    setFormType("pourcentage");
    setFormValue("");
    setFormStartDate("");
    setFormEndDate("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      showAlert("Erreur", "Le nom est requis");
      return;
    }
    if (!formValue.trim() || isNaN(Number(formValue))) {
      showAlert("Erreur", "La valeur doit etre un nombre valide");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/boutique/promotions", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          value: Number(formValue),
          startDate: formStartDate.trim() || undefined,
          endDate: formEndDate.trim() || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPromotions((prev) => [created, ...prev]);
        setModalVisible(false);
        resetForm();
      } else {
        showAlert("Erreur", "Impossible de creer la promotion");
      }
    } catch {
      showAlert("Erreur", "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (promo: Promotion) => {
    showConfirm("Supprimer", `Supprimer "${promo.name}" ?`, async () => {
          try {
            const res = await apiFetch(
              `/api/boutique/promotions/${promo._id}`,
              { method: "DELETE" }
            );
            if (res.ok) {
              setPromotions((prev) =>
                prev.filter((p) => p._id !== promo._id)
              );
            } else {
              showAlert("Erreur", "Impossible de supprimer");
            }
          } catch {
            showAlert("Erreur", "Erreur de connexion");
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

  const renderPromotion = ({ item }: { item: Promotion }) => {
    const now = new Date();
    const start = item.startDate ? new Date(item.startDate) : null;
    const end = item.endDate ? new Date(item.endDate) : null;
    const isActive =
      item.active !== false &&
      (!start || start <= now) &&
      (!end || end >= now);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cardLeft, { backgroundColor: colors.cardAlt }]}>
          <Tag size={18} color={isActive ? colors.success : colors.textDimmed} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.promoName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.activeBadge,
                isActive ? styles.activeBadgeOn : styles.activeBadgeOff,
              ]}
            >
              <Text
                style={[
                  styles.activeBadgeText,
                  isActive
                    ? { color: colors.success }
                    : { color: colors.textDimmed },
                ]}
              >
                {isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <Text style={[styles.promoValue, { color: colors.primary }]}>
            {item.type === "pourcentage"
              ? `-${item.value}%`
              : `-${item.value.toLocaleString("fr-FR")} FCFA`}
          </Text>
          <Text style={[styles.promoDates, { color: colors.textDimmed }]}>
            {start
              ? start.toLocaleDateString("fr-FR")
              : "Sans debut"}{" "}
            -{" "}
            {end
              ? end.toLocaleDateString("fr-FR")
              : "Sans fin"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with add */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          {promotions.length} promotion{promotions.length !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={promotions}
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
        renderItem={renderPromotion}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune promotion</Text>
          </View>
        }
      />

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle promotion</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ex: Soldes d'ete"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    formType === "pourcentage" && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setFormType("pourcentage")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: colors.textMuted },
                      formType === "pourcentage" && { color: colors.primaryForeground, fontWeight: "600" },
                    ]}
                  >
                    Pourcentage
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    formType === "fixe" && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setFormType("fixe")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: colors.textMuted },
                      formType === "fixe" && { color: colors.primaryForeground, fontWeight: "600" },
                    ]}
                  >
                    Fixe (FCFA)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Valeur</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formValue}
                onChangeText={setFormValue}
                placeholder={formType === "pourcentage" ? "Ex: 10" : "Ex: 5000"}
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date de debut (AAAA-MM-JJ)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formStartDate}
                onChangeText={setFormStartDate}
                placeholder="Ex: 2026-03-01"
                placeholderTextColor={colors.placeholder}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date de fin (AAAA-MM-JJ)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formEndDate}
                onChangeText={setFormEndDate}
                placeholder="Ex: 2026-03-31"
                placeholderTextColor={colors.placeholder}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCreate}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    <Text style={[styles.modalSubmitText, { color: colors.primaryForeground }]}>Creer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardLeft: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  promoName: {
    fontSize: fontSize.md,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing.sm,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  activeBadgeOn: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  activeBadgeOff: {
    backgroundColor: "rgba(113,113,122,0.15)",
  },
  activeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  promoValue: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  promoDates: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
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
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  typeBtnText: {
    fontSize: fontSize.sm,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  modalSubmitText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
