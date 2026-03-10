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
  } from "react-native";
import { showAlert } from "../../utils/alert";
import { ArrowLeftRight, ArrowRight } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { BankAccount, BankTransaction } from "../../types";

export default function VirementsScreen() {
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [accRes, txRes] = await Promise.all([
        apiFetch("/api/bank-accounts"),
        apiFetch("/api/bank-transactions?type=virement&limit=30"),
      ]);
      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(data);
        if (data.length >= 2) {
          if (!fromAccountId) setFromAccountId(data[0]._id);
          if (!toAccountId) setToAccountId(data[1]._id);
        }
      }
      if (txRes.ok) {
        const data = await txRes.json();
        setTransfers(Array.isArray(data) ? data : data.transactions ?? []);
      }
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  function getAccountName(id: string): string {
    return accounts.find((a) => a._id === id)?.name ?? "Inconnu";
  }

  function getAccountBalance(id: string): number {
    return accounts.find((a) => a._id === id)?.balance ?? 0;
  }

  async function handleTransfer() {
    if (!fromAccountId || !toAccountId) {
      showAlert("Erreur", "Veuillez selectionner les deux comptes.");
      return;
    }
    if (fromAccountId === toAccountId) {
      showAlert("Erreur", "Les comptes source et destination doivent etre differents.");
      return;
    }
    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      showAlert("Erreur", "Montant invalide.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        type: "virement",
        amount: transferAmount,
        description: description.trim() || "Virement interne",
        fromAccount: fromAccountId,
        toAccount: toAccountId,
        accountId: fromAccountId,
        date: new Date().toISOString(),
      };

      const res = await apiFetch("/api/bank-transactions", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showAlert("Succes", "Virement effectue avec succes.");
        setAmount("");
        setDescription("");
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible d'effectuer le virement");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
      {/* Transfer Form */}
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Nouveau virement</Text>

        {/* From Account */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Compte source</Text>
        <View style={styles.accountPicker}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc._id}
              style={[
                styles.accountChip,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
                fromAccountId === acc._id && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setFromAccountId(acc._id)}
            >
              <Text
                style={[
                  styles.accountChipText,
                  { color: colors.textMuted },
                  fromAccountId === acc._id && { color: colors.primaryForeground, fontWeight: "600" },
                ]}
                numberOfLines={1}
              >
                {acc.name}
              </Text>
              <Text style={[styles.accountChipBalance, { color: colors.textDimmed }]}>
                {acc.balance.toLocaleString("fr-FR")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Arrow */}
        <View style={styles.arrowRow}>
          <ArrowRight size={20} color={colors.primary} />
        </View>

        {/* To Account */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Compte destination</Text>
        <View style={styles.accountPicker}>
          {accounts
            .filter((a) => a._id !== fromAccountId)
            .map((acc) => (
              <TouchableOpacity
                key={acc._id}
                style={[
                  styles.accountChip,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  toAccountId === acc._id && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setToAccountId(acc._id)}
              >
                <Text
                  style={[
                    styles.accountChipText,
                    { color: colors.textMuted },
                    toAccountId === acc._id && { color: colors.primaryForeground, fontWeight: "600" },
                  ]}
                  numberOfLines={1}
                >
                  {acc.name}
                </Text>
                <Text style={[styles.accountChipBalance, { color: colors.textDimmed }]}>
                  {acc.balance.toLocaleString("fr-FR")}
                </Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Amount */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Montant (FCFA)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Motif du virement"
          placeholderTextColor={colors.placeholder}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
          onPress={handleTransfer}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Effectuer le virement</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Transfers */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Virements recents</Text>

      <FlatList
        data={transfers}
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
          const from =
            typeof item.fromAccount === "object"
              ? item.fromAccount?.name
              : getAccountName(item.fromAccount ?? "");
          const to =
            typeof item.toAccount === "object"
              ? item.toAccount?.name
              : getAccountName(item.toAccount ?? "");
          return (
            <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.txIcon}>
                <ArrowLeftRight size={16} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={[styles.txMeta, { color: colors.textDimmed }]}>
                  {from} → {to} · {formatDate(item.date ?? item.createdAt)}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: colors.warning }]}>
                {item.amount.toLocaleString("fr-FR")}
              </Text>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun virement</Text>
          </View>
        }
      />
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
  formCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  accountPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  accountChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    minWidth: 100,
  },
  accountChipText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  accountChipBalance: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  arrowRow: {
    alignItems: "center",
    paddingVertical: spacing.sm,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
    backgroundColor: "rgba(245,158,11,0.1)",
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
});
