import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ArrowUpDown } from "lucide-react-native";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Currency {
  code: string;
  label: string;
}

const CURRENCIES: Currency[] = [
  { code: "FCFA", label: "Franc CFA" },
  { code: "EUR", label: "Euro" },
  { code: "USD", label: "Dollar US" },
  { code: "GBP", label: "Livre Sterling" },
  { code: "MAD", label: "Dirham Marocain" },
  { code: "GNF", label: "Franc Guineen" },
];

// Rates: 1 unit of currency = X FCFA
const RATES_TO_FCFA: Record<string, number> = {
  FCFA: 1,
  EUR: 655.957,
  USD: 615,
  GBP: 775,
  MAD: 62,
  GNF: 0.072,
};

function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const amountInFcfa = amount * RATES_TO_FCFA[from];
  return amountInFcfa / RATES_TO_FCFA[to];
}

function formatResult(value: number, currency: string): string {
  if (currency === "FCFA" || currency === "GNF") {
    return Math.round(value).toLocaleString("fr-FR");
  }
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ConversionScreen() {
  const { colors } = useTheme();
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("FCFA");
  const [toCurrency, setToCurrency] = useState("EUR");

  const result = useMemo(() => {
    const val = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) return 0;
    return convert(val, fromCurrency, toCurrency);
  }, [amount, fromCurrency, toCurrency]);

  const rate = useMemo(() => {
    return convert(1, fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency]);

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Amount Input */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Montant</Text>
      <TextInput
        style={[styles.amountInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
      />

      {/* From Currency */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>De</Text>
      <View style={styles.currencyGrid}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[
              styles.currencyChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              fromCurrency === c.code && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              setFromCurrency(c.code);
              if (c.code === toCurrency) {
                setToCurrency(fromCurrency);
              }
            }}
          >
            <Text
              style={[
                styles.currencyCode,
                { color: colors.text },
                fromCurrency === c.code && { color: colors.primaryForeground },
              ]}
            >
              {c.code}
            </Text>
            <Text
              style={[
                styles.currencyLabel,
                { color: colors.textDimmed },
                fromCurrency === c.code && { color: colors.primaryForeground },
              ]}
              numberOfLines={1}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Swap Button */}
      <TouchableOpacity
        style={[styles.swapBtn, { backgroundColor: colors.primary }]}
        onPress={swapCurrencies}
        activeOpacity={0.7}
      >
        <ArrowUpDown size={22} color={colors.primaryForeground} />
        <Text style={[styles.swapText, { color: colors.primaryForeground }]}>Inverser</Text>
      </TouchableOpacity>

      {/* To Currency */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Vers</Text>
      <View style={styles.currencyGrid}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[
              styles.currencyChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              toCurrency === c.code && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              setToCurrency(c.code);
              if (c.code === fromCurrency) {
                setFromCurrency(toCurrency);
              }
            }}
          >
            <Text
              style={[
                styles.currencyCode,
                { color: colors.text },
                toCurrency === c.code && { color: colors.primaryForeground },
              ]}
            >
              {c.code}
            </Text>
            <Text
              style={[
                styles.currencyLabel,
                { color: colors.textDimmed },
                toCurrency === c.code && { color: colors.primaryForeground },
              ]}
              numberOfLines={1}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Result */}
      <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
        <Text style={[styles.resultLabel, { color: colors.textMuted }]}>Resultat</Text>
        <Text style={[styles.resultValue, { color: colors.primary }]}>
          {formatResult(result, toCurrency)} {toCurrency}
        </Text>
        <Text style={[styles.rateText, { color: colors.textDimmed }]}>
          1 {fromCurrency} = {formatResult(rate, toCurrency)} {toCurrency}
        </Text>
      </View>

      {/* Quick Reference Table */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Taux de reference (FCFA)</Text>
      <View style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {CURRENCIES.filter((c) => c.code !== "FCFA").map((c) => (
          <View key={c.code} style={[styles.rateRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rateRowLabel, { color: colors.text }]}>1 {c.code}</Text>
            <Text style={[styles.rateRowValue, { color: colors.primary }]}>
              {RATES_TO_FCFA[c.code].toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        ))}
      </View>
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  amountInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    textAlign: "center",
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  currencyChip: {
    width: "31%",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
  },
  currencyCode: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  currencyLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  swapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: "center",
    marginVertical: spacing.md,
  },
  swapText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  resultCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  resultLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  resultValue: {
    fontSize: fontSize.xxxl,
    fontWeight: "700",
  },
  rateText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rateCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rateRowLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  rateRowValue: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
