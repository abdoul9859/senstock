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
import { Plus, Building2, X } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { BankAccount } from "../../types";

const ACCOUNT_TYPES = [
  { label: "Courant", value: "courant" },
  { label: "Epargne", value: "epargne" },
  { label: "Caisse", value: "caisse" },
  { label: "Mobile Money", value: "mobile_money" },
];

export default function ComptesScreen() {
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("courant");
  const [initialBalance, setInitialBalance] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/bank-accounts");
      if (res.ok) setAccounts(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccounts();
  }, [fetchAccounts]);

  function openCreate() {
    setEditId(null);
    setName("");
    setType("courant");
    setInitialBalance("");
    setShowForm(true);
  }

  function openEdit(account: BankAccount) {
    setEditId(account._id);
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.balance));
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showAlert("Erreur", "Le nom du compte est requis.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        type,
        currency: "FCFA",
        initialBalance: parseFloat(initialBalance) || 0,
      };

      const url = editId
        ? `/api/bank-accounts/${editId}`
        : "/api/bank-accounts";
      const method = editId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowForm(false);
        fetchAccounts();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de sauvegarder le compte");
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
          {accounts.length} compte{accounts.length !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={openCreate}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
          >
            <Building2 size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.accName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.accType, { color: colors.textDimmed }]}>
                {ACCOUNT_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
              </Text>
            </View>
            <View style={styles.balanceCol}>
              <Text style={[styles.accBalance, { color: colors.primary }]}>
                {item.balance.toLocaleString("fr-FR")}
              </Text>
              <Text style={[styles.accCurrency, { color: colors.textDimmed }]}>{item.currency}</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun compte bancaire</Text>
          </View>
        }
      />

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editId ? "Modifier le compte" : "Nouveau compte"}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Name */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nom du compte</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Compte principal"
                placeholderTextColor={colors.placeholder}
              />

              {/* Type */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Type de compte</Text>
              <View style={styles.typeRow}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      type === t.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setType(t.value)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textMuted },
                        type === t.value && { color: colors.primaryForeground, fontWeight: "600" },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Initial Balance */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {editId ? "Solde" : "Solde initial"} (FCFA)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={initialBalance}
                onChangeText={setInitialBalance}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />

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
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                    {editId ? "Modifier" : "Creer le compte"}
                  </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.lg,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accName: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  accType: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: "flex-end",
  },
  accBalance: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  accCurrency: {
    fontSize: fontSize.xs,
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
    maxHeight: "85%",
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
    flexWrap: "wrap",
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
