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
  ScrollView,
} from "react-native";
import { showAlert } from "../../utils/alert";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  ChevronDown,
} from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { BankAccount, BankTransaction } from "../../types";

const CATEGORIES = [
  "Vente",
  "Achat",
  "Salaire",
  "Loyer",
  "Frais bancaires",
  "Transport",
  "Autre",
];

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<"credit" | "debit">("credit");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Autre");
  const [formAccountId, setFormAccountId] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !formAccountId) {
          setFormAccountId(data[0]._id);
        }
      }
    } catch {
      // silent
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      let url = "/api/bank-transactions?page=1&limit=50";
      if (selectedAccount !== "all") {
        url += `&accountId=${selectedAccount}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : data.transactions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  function openCreate() {
    setFormType("credit");
    setFormAmount("");
    setFormDescription("");
    setFormCategory("Autre");
    if (accounts.length > 0) setFormAccountId(accounts[0]._id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formAccountId) {
      showAlert("Erreur", "Veuillez selectionner un compte.");
      return;
    }
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) {
      showAlert("Erreur", "Montant invalide.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        type: formType,
        amount,
        description: formDescription.trim() || `${formType === "credit" ? "Entree" : "Sortie"} de fonds`,
        category: formCategory,
        accountId: formAccountId,
        date: new Date().toISOString(),
      };

      const res = await apiFetch("/api/bank-transactions", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        fetchTransactions();
        fetchAccounts();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de creer la transaction");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  function getAccountName(accountId: string | { _id: string; name: string }): string {
    if (typeof accountId === "object" && accountId?.name) return accountId.name;
    const acc = accounts.find((a) => a._id === accountId);
    return acc?.name ?? "Compte inconnu";
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const selectedAccountLabel =
    selectedAccount === "all"
      ? "Tous les comptes"
      : accounts.find((a) => a._id === selectedAccount)?.name ?? "Compte";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Account Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
          onPress={() => setShowAccountPicker(!showAccountPicker)}
        >
          <Text style={[styles.filterBtnText, { color: colors.text }]} numberOfLines={1}>
            {selectedAccountLabel}
          </Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openCreate}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {showAccountPicker && (
        <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.pickerOption,
              { borderBottomColor: colors.border },
              selectedAccount === "all" && { backgroundColor: colors.cardAlt },
            ]}
            onPress={() => {
              setSelectedAccount("all");
              setShowAccountPicker(false);
            }}
          >
            <Text
              style={[
                styles.pickerOptionText,
                { color: colors.text },
                selectedAccount === "all" && { color: colors.primary, fontWeight: "600" },
              ]}
            >
              Tous les comptes
            </Text>
          </TouchableOpacity>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc._id}
              style={[
                styles.pickerOption,
                { borderBottomColor: colors.border },
                selectedAccount === acc._id && { backgroundColor: colors.cardAlt },
              ]}
              onPress={() => {
                setSelectedAccount(acc._id);
                setShowAccountPicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerOptionText,
                  { color: colors.text },
                  selectedAccount === acc._id && { color: colors.primary, fontWeight: "600" },
                ]}
              >
                {acc.name}
              </Text>
              <Text style={[styles.pickerOptionSub, { color: colors.textDimmed }]}>
                {acc.balance.toLocaleString("fr-FR")} {acc.currency}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={transactions}
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
          const isCredit = item.type === "credit";
          return (
            <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View
                style={[
                  styles.txIcon,
                  {
                    backgroundColor: isCredit
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(239,68,68,0.1)",
                  },
                ]}
              >
                {isCredit ? (
                  <ArrowDownLeft size={16} color={colors.success} />
                ) : (
                  <ArrowUpRight size={16} color={colors.destructive} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={[styles.txMeta, { color: colors.textDimmed }]}>
                  {formatDate(item.date ?? item.createdAt)} ·{" "}
                  {item.category ?? item.type}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: isCredit ? colors.success : colors.destructive },
                ]}
              >
                {isCredit ? "+" : "-"}
                {item.amount.toLocaleString("fr-FR")}
              </Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune transaction</Text>
          </View>
        }
      />

      {/* Create Transaction Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle transaction</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Type */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    formType === "credit" && { backgroundColor: colors.success, borderColor: colors.success },
                  ]}
                  onPress={() => setFormType("credit")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: colors.textMuted },
                      formType === "credit" && { color: colors.primaryForeground, fontWeight: "600" },
                    ]}
                  >
                    Credit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    formType === "debit" && { backgroundColor: colors.destructive, borderColor: colors.destructive },
                  ]}
                  onPress={() => setFormType("debit")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: colors.textMuted },
                      formType === "debit" && { color: colors.primaryForeground, fontWeight: "600" },
                    ]}
                  >
                    Debit
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Account */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Compte</Text>
              <View style={styles.accountPicker}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc._id}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      formAccountId === acc._id && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFormAccountId(acc._id)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textMuted },
                        formAccountId === acc._id && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                      numberOfLines={1}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Montant (FCFA)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />

              {/* Description */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Description de la transaction"
                placeholderTextColor={colors.placeholder}
              />

              {/* Category */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Categorie</Text>
              <View style={styles.accountPicker}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      formCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textMuted },
                        formCategory === cat && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterBtnText: {
    fontSize: fontSize.md,
    flex: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerDropdown: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerOptionText: {
    fontSize: fontSize.sm,
  },
  pickerOptionSub: {
    fontSize: fontSize.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  txDesc: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  txMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  txAmount: {
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
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  formScroll: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
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
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: fontSize.sm,
  },
  accountPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  submitBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
});
