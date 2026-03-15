import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScanLine, Search, FileText, Package } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import BarcodeScanner from "../../components/BarcodeScanner";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Invoice } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "ScanInvoice">;

const STATUS_LABELS: Record<string, string> = {
  impayee: "Impayee",
  partielle: "Partielle",
  payee: "Payee",
  annulee: "Annulee",
};

const TYPE_LABELS: Record<string, string> = {
  facture: "Facture",
  proforma: "Proforma",
  avoir: "Avoir",
  echange: "Echange",
  vente_flash: "Vente flash",
};

export default function ScanInvoiceScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchInvoices = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await apiFetch(`/api/invoices/find-by-product?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } else {
        setError("Erreur lors de la recherche.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScanned = useCallback((data: string) => {
    setScannerVisible(false);
    setQuery(data);
    searchInvoices(data);
  }, [searchInvoices]);

  const handleSubmit = useCallback(() => {
    searchInvoices(query);
  }, [query, searchInvoices]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => nav.navigate("InvoiceDetail", { invoiceId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceTitle}>
          <FileText size={16} color={colors.primary} />
          <Text style={[styles.invoiceNumber, { color: colors.text }]}>{item.number}</Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === "payee" ? colors.success + "20" :
            item.status === "annulee" ? colors.destructive + "20" : colors.warning + "20",
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === "payee" ? colors.success :
              item.status === "annulee" ? colors.destructive : colors.warning,
          }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>

      <View style={styles.invoiceBody}>
        <Text style={[styles.invoiceType, { color: colors.textSecondary }]}>
          {TYPE_LABELS[item.type] || item.type}
        </Text>
        <Text style={[styles.invoiceDate, { color: colors.textSecondary }]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <View style={styles.invoiceFooter}>
        <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
          {item.client?.name || item.client?.company || "---"}
        </Text>
        <Text style={[styles.invoiceTotal, { color: colors.primary }]}>
          {formatAmount(item.total)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Scanner button */}
      <TouchableOpacity
        style={[styles.scanBtn, { backgroundColor: colors.primary }]}
        onPress={() => setScannerVisible(true)}
        activeOpacity={0.8}
      >
        <ScanLine size={24} color={colors.primaryForeground} />
        <Text style={[styles.scanBtnText, { color: colors.primaryForeground }]}>
          Scanner un code-barres
        </Text>
      </TouchableOpacity>

      {/* Manual input */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Code-barres ou numero de serie..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Search size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Recherche...</Text>
        </View>
      )}

      {/* Error */}
      {!!error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {/* Results */}
      {!loading && !error && results !== null && (
        results.length > 0 ? (
          <>
            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
              {results.length} facture{results.length > 1 ? "s" : ""} trouvee{results.length > 1 ? "s" : ""}
            </Text>
            <FlatList
              data={results}
              keyExtractor={(item) => item._id}
              renderItem={renderInvoice}
              scrollEnabled={false}
              contentContainerStyle={styles.resultsList}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Package size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune facture trouvee</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Aucune facture ne contient ce produit.
            </Text>
          </View>
        )
      )}

      {/* Scanner modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
        title="Scanner pour trouver une facture"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  scanBtnText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  searchBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
  },
  center: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: "center",
  },
  resultCount: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  resultsList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  invoiceCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invoiceTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  invoiceNumber: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  invoiceBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceType: {
    fontSize: fontSize.sm,
  },
  invoiceDate: {
    fontSize: fontSize.sm,
  },
  invoiceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clientName: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    flex: 1,
    marginRight: spacing.sm,
  },
  invoiceTotal: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
