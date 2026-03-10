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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, ShoppingBag } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "AchatsQuotidiens">;

interface DailyPurchase {
  _id: string;
  description: string;
  amount: number;
  category?: string;
  date: string;
  createdAt: string;
}

interface PurchaseStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
}

export default function AchatsQuotidiensScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [purchases, setPurchases] = useState<DailyPurchase[]>([]);
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [purchasesRes, statsRes] = await Promise.all([
        apiFetch("/api/daily-purchases"),
        apiFetch("/api/daily-purchases/stats"),
      ]);
      if (purchasesRes.ok) setPurchases(await purchasesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
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

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [nav, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  function openAddModal() {
    setDescription("");
    setAmount("");
    setCategory("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!description.trim()) {
      showAlert("Description requise", "Veuillez saisir une description.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showAlert("Montant invalide", "Veuillez saisir un montant valide.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/daily-purchases", {
        method: "POST",
        body: JSON.stringify({
          description: description.trim(),
          amount: parsedAmount,
          category: category.trim() || undefined,
          date: purchaseDate || undefined,
        }),
      });

      if (res.ok) {
        setModalVisible(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de creer l'achat");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSubmitting(false);
    }
  }

  // Group purchases by date
  const groupedPurchases: { date: string; items: DailyPurchase[] }[] = [];
  const dateMap = new Map<string, DailyPurchase[]>();
  for (const p of purchases) {
    const dateKey = new Date(p.date).toLocaleDateString("fr-FR");
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }
    dateMap.get(dateKey)!.push(p);
  }
  for (const [date, items] of dateMap) {
    groupedPurchases.push({ date, items });
  }

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
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Aujourd'hui</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {(stats.totalToday || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Semaine</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {(stats.totalWeek || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textDimmed }]}>Mois</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {(stats.totalMonth || 0).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      )}

      {/* Add button */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Plus size={18} color={colors.primaryForeground} />
          <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Nouvel achat</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedPurchases}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item: group }) => (
          <View style={styles.dateGroup}>
            <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{group.date}</Text>
            {group.items.map((purchase) => (
              <View key={purchase._id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardIcon, { backgroundColor: colors.cardAlt }]}>
                  <ShoppingBag size={18} color={colors.textDimmed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardDesc, { color: colors.text }]}>{purchase.description}</Text>
                  {purchase.category && (
                    <Text style={[styles.cardCategory, { color: colors.textDimmed }]}>{purchase.category}</Text>
                  )}
                </View>
                <Text style={[styles.cardAmount, { color: colors.primary }]}>
                  {purchase.amount.toLocaleString("fr-FR")} FCFA
                </Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun achat quotidien</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvel achat</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description de l'achat..."
              placeholderTextColor={colors.placeholder}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Montant (FCFA)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Categorie</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={category}
              onChangeText={setCategory}
              placeholder="Categorie (optionnel)"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={colors.placeholder}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }, submitting && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: colors.primaryForeground }]}>Ajouter</Text>
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  addRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  addBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDesc: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  cardCategory: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: fontSize.md,
    fontWeight: "700",
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
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  confirmBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  submitDisabled: {
    opacity: 0.6,
  },
});
