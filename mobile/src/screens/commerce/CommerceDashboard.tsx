import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Receipt, DollarSign, AlertCircle, Users, ChevronRight, Plus } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import InvoiceCard from "../../components/invoice/InvoiceCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Invoice } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "CommerceDashboard">;

export default function CommerceDashboard() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/invoices");
      if (res.ok) setInvoices(await res.json());
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

  // KPIs
  const today = new Date().toDateString();
  const todayInvoices = invoices.filter((i) => new Date(i.date).toDateString() === today);
  const totalCA = invoices
    .filter((i) => i.status === "payee" || i.status === "partielle")
    .reduce((s, i) => s + ((i as any).payment?.enabled ? ((i as any).payment.amount || 0) : 0), 0);
  const unpaid = invoices.filter((i) =>
    i.status === "envoyee" || i.status === "partielle" || i.status === "en_retard"
  ).length;

  // Recent 5
  const recent = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="CA total"
          value={totalCA >= 1_000_000 ? `${(totalCA / 1_000_000).toFixed(1)}M` : totalCA >= 1_000 ? `${(totalCA / 1_000).toFixed(0)}k` : String(totalCA)}
          subtitle="FCFA"
        />
        <KpiCard
          icon={<Receipt size={18} color={colors.info} />}
          label="Aujourd'hui"
          value={todayInvoices.length}
          subtitle="factures"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<AlertCircle size={18} color={colors.destructive} />}
          label="Impayees"
          value={unpaid}
        />
        <KpiCard
          icon={<Users size={18} color={colors.primary} />}
          label="Total"
          value={invoices.length}
          subtitle="factures"
        />
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => nav.navigate("CreateInvoice")} activeOpacity={0.8}>
          <Plus size={18} color={colors.primaryForeground} />
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Nouvelle facture</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickLinks}>
        <QuickAction label="Toutes les factures" onPress={() => nav.navigate("InvoiceList")} colors={colors} />
        <QuickAction label="Devis" onPress={() => nav.navigate("DevisList")} colors={colors} />
        <QuickAction label="Bons de livraison" onPress={() => nav.navigate("BonLivraisonList")} colors={colors} />
        <QuickAction label="Creances" onPress={() => nav.navigate("Creances")} colors={colors} />
        <QuickAction label="Achats quotidiens" onPress={() => nav.navigate("AchatsQuotidiens")} colors={colors} />
        <QuickAction label="Clients" onPress={() => nav.navigate("ClientList")} colors={colors} />
      </View>

      {/* Recent invoices */}
      {recent.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Factures recentes</Text>
          {recent.map((inv) => (
            <View key={inv._id} style={{ marginBottom: spacing.sm }}>
              <InvoiceCard
                invoice={inv}
                currency="FCFA"
                onPress={() => nav.navigate("InvoiceDetail", { invoiceId: inv._id })}
              />
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

function QuickAction({ label, onPress, colors }: { label: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actions: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
  },
  createBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  quickLinks: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
});
