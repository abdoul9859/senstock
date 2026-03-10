import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView,
  RefreshControl, Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ChevronRight, Warehouse, ShoppingCart, Store, UsersRound,
  Landmark, BarChart3, Settings2, Truck,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { WORKSPACES } from "../../config/workspaces";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DashboardData {
  entrepot: { products: number; stockValue: number; outOfStock: number; movements: number };
  commerce: { revenue: number; invoices: number; unpaid: number; clients: number };
  boutique: { orders: number; onlineRevenue: number; published: number; pending: number };
  personnel: { employees: number; salaryMass: number; pendingLeaves: number; presentToday: number };
  banque: { totalBalance: number; accounts: number; monthEntries: number; monthExits: number };
  analytique: { monthRevenue: number; monthExpenses: number; profit: number; margin: number };
  logistique: { suppliers: number; pendingOrders: number; inTransit: number; delivered: number };
  pilotage: { totalProducts: number; totalClients: number; totalInvoices: number; totalRevenue: number };
}

const EMPTY_DATA: DashboardData = {
  entrepot: { products: 0, stockValue: 0, outOfStock: 0, movements: 0 },
  commerce: { revenue: 0, invoices: 0, unpaid: 0, clients: 0 },
  boutique: { orders: 0, onlineRevenue: 0, published: 0, pending: 0 },
  personnel: { employees: 0, salaryMass: 0, pendingLeaves: 0, presentToday: 0 },
  banque: { totalBalance: 0, accounts: 0, monthEntries: 0, monthExits: 0 },
  analytique: { monthRevenue: 0, monthExpenses: 0, profit: 0, margin: 0 },
  logistique: { suppliers: 0, pendingOrders: 0, inTransit: 0, delivered: 0 },
  pilotage: { totalProducts: 0, totalClients: 0, totalInvoices: 0, totalRevenue: 0 },
};

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;
  const slideAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(20))).current;

  const fetchAll = useCallback(async () => {
    try {
      const [
        prodRes, invRes, clientRes, boutiqueRes,
        empRes, salRes, leaveRes, attendRes,
        bankStatsRes, suppRes, poRes, trendsRes,
      ] = await Promise.all([
        apiFetch("/api/products").catch(() => null),
        apiFetch("/api/invoices").catch(() => null),
        apiFetch("/api/clients").catch(() => null),
        apiFetch("/api/boutique/stats").catch(() => null),
        apiFetch("/api/employees").catch(() => null),
        apiFetch("/api/salaries").catch(() => null),
        apiFetch("/api/leaves").catch(() => null),
        apiFetch("/api/attendance?date=" + new Date().toISOString().slice(0, 10)).catch(() => null),
        apiFetch("/api/bank-transactions/stats").catch(() => null),
        apiFetch("/api/suppliers").catch(() => null),
        apiFetch("/api/purchase-orders/stats").catch(() => null),
        apiFetch("/api/analytics/trends").catch(() => null),
      ]);

      const products = prodRes?.ok ? await prodRes.json() : [];
      const invoices = invRes?.ok ? await invRes.json() : [];
      const clients = clientRes?.ok ? await clientRes.json() : [];
      const boutiqueStats = boutiqueRes?.ok ? await boutiqueRes.json() : {};
      const employees = empRes?.ok ? await empRes.json() : [];
      const salariesList = salRes?.ok ? await salRes.json() : [];
      const leavesList = leaveRes?.ok ? await leaveRes.json() : [];
      const attendList = attendRes?.ok ? await attendRes.json() : [];
      const bankStats = bankStatsRes?.ok ? await bankStatsRes.json() : {};
      const suppliers = suppRes?.ok ? await suppRes.json() : [];
      const poStats = poRes?.ok ? await poRes.json() : {};
      const trends = trendsRes?.ok ? await trendsRes.json() : [];

      const prodArr = Array.isArray(products) ? products : [];
      const invArr = Array.isArray(invoices) ? invoices : [];
      const clientArr = Array.isArray(clients) ? clients : [];
      const empArr = Array.isArray(employees) ? employees : [];
      const suppArr = Array.isArray(suppliers) ? suppliers : [];
      const salArr = Array.isArray(salariesList) ? salariesList : [];
      const lvArr = Array.isArray(leavesList) ? leavesList : [];
      const attArr = Array.isArray(attendList) ? attendList : [];

      // ── Entrepot ──
      const stockValue = prodArr.reduce((s: number, p: any) => {
        if (p.variants && p.variants.length > 0) {
          return s + p.variants.filter((v: any) => !v.sold).reduce((vs: number, v: any) => vs + (v.price || v.sellingPrice || p.sellingPrice || 0), 0);
        }
        return s + (p.sellingPrice || 0) * (p.quantity || 0);
      }, 0);
      const outOfStock = prodArr.filter((p: any) => {
        const qty = p.variants && p.variants.length > 0
          ? p.variants.filter((v: any) => !v.sold).length
          : (p.quantity || 0);
        return qty === 0;
      }).length;

      // ── Commerce ──
      const revenue = invArr
        .filter((i: any) => i.status === "payee" || i.status === "partielle")
        .reduce((s: number, i: any) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0), 0);
      const unpaid = invArr.filter((i: any) =>
        i.status === "envoyee" || i.status === "partielle" || i.status === "en_retard"
      ).length;

      // ── Personnel — compute from raw lists ──
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const salaryMass = salArr
        .filter((s: any) => s.period === currentMonthKey && s.status === "payee")
        .reduce((sum: number, s: any) => sum + (s.netSalary || 0), 0);
      const pendingLeaves = lvArr.filter((l: any) => l.status === "en_attente").length;
      const presentToday = attArr.filter((a: any) => a.status === "present").length;

      // ── Analytique — from trends ──
      const trendsArr = Array.isArray(trends) ? trends : [];
      const currentMonthTrend = trendsArr.length > 0 ? trendsArr[trendsArr.length - 1] : { revenue: 0, expenses: 0, salaries: 0 };
      const monthRevenue = currentMonthTrend.revenue || 0;
      const monthExpenses = (currentMonthTrend.expenses || 0) + (currentMonthTrend.salaries || 0);
      const profit = monthRevenue - monthExpenses;

      setData({
        entrepot: { products: prodArr.length, stockValue, outOfStock, movements: 0 },
        commerce: { revenue, invoices: invArr.length, unpaid, clients: clientArr.length },
        boutique: {
          orders: boutiqueStats.totalOrders || 0,
          onlineRevenue: boutiqueStats.totalRevenue || 0,
          published: boutiqueStats.publishedProducts || 0,
          pending: boutiqueStats.pendingOrders || 0,
        },
        personnel: {
          employees: empArr.length,
          salaryMass,
          pendingLeaves,
          presentToday,
        },
        banque: {
          totalBalance: bankStats.totalBalance || 0,
          accounts: bankStats.accountCount || 0,
          monthEntries: bankStats.monthEntries || 0,
          monthExits: bankStats.monthExits || 0,
        },
        analytique: {
          monthRevenue,
          monthExpenses,
          profit,
          margin: monthRevenue > 0 ? Math.round((profit / monthRevenue) * 100) : 0,
        },
        logistique: {
          suppliers: suppArr.length,
          pendingOrders: poStats.envoyee || 0,
          inTransit: poStats.en_transit || 0,
          delivered: poStats.livree || 0,
        },
        pilotage: {
          totalProducts: prodArr.length,
          totalClients: clientArr.length,
          totalInvoices: invArr.length,
          totalRevenue: revenue,
        },
      });
    } catch { /* silent */ }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
    runEntryAnimation();
  }, []);

  function runEntryAnimation() {
    for (let i = 0; i < 10; i++) {
      Animated.parallel([
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 400, delay: i * 60, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 400, delay: i * 60, useNativeDriver: true }),
      ]).start();
    }
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon apres-midi";
    return "Bonsoir";
  };

  const wsColor = (key: string) => WORKSPACES.find(w => w.key === key)?.color || colors.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }}
          tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || "Utilisateur"}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
            onPress={() => nav.navigate("Settings" as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "?"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Global KPI Row */}
      <Animated.View style={[styles.globalKpiRow, { opacity: fadeAnims[0] }]}>
        <View style={[styles.globalKpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.globalKpiValue, { color: colors.primary }]}>{formatMoney(data.commerce.revenue)}</Text>
          <Text style={[styles.globalKpiLabel, { color: colors.textDimmed }]}>CA Total</Text>
        </View>
        <View style={[styles.globalKpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.globalKpiValue, { color: colors.info }]}>{data.commerce.invoices}</Text>
          <Text style={[styles.globalKpiLabel, { color: colors.textDimmed }]}>Factures</Text>
        </View>
        <View style={[styles.globalKpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.globalKpiValue, { color: colors.warning }]}>{data.commerce.clients}</Text>
          <Text style={[styles.globalKpiLabel, { color: colors.textDimmed }]}>Clients</Text>
        </View>
      </Animated.View>

      {/* ── Entrepot ── */}
      <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
        <DashboardCard
          title="Entrepot"
          wsKey="entrepot"
          color={wsColor("entrepot")}
          icon={<Warehouse size={20} color={wsColor("entrepot")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "entrepot" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Produits", value: String(data.entrepot.products), color: wsColor("entrepot") },
            { label: "Valeur stock", value: formatMoney(data.entrepot.stockValue) + " F", color: colors.info },
            { label: "Rupture", value: String(data.entrepot.outOfStock), color: data.entrepot.outOfStock > 0 ? colors.destructive : colors.success },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Commerce ── */}
      <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
        <DashboardCard
          title="Commerce"
          wsKey="commerce"
          color={wsColor("commerce")}
          icon={<ShoppingCart size={20} color={wsColor("commerce")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "commerce" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Chiffre d'affaires", value: formatMoney(data.commerce.revenue) + " F", color: colors.success },
            { label: "Factures", value: String(data.commerce.invoices), color: wsColor("commerce") },
            { label: "Impayees", value: String(data.commerce.unpaid), color: data.commerce.unpaid > 0 ? colors.warning : colors.success },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Boutique ── */}
      <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
        <DashboardCard
          title="Boutique"
          wsKey="boutique"
          color={wsColor("boutique")}
          icon={<Store size={20} color={wsColor("boutique")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "boutique" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Commandes", value: String(data.boutique.orders), color: wsColor("boutique") },
            { label: "CA en ligne", value: formatMoney(data.boutique.onlineRevenue) + " F", color: colors.success },
            { label: "En attente", value: String(data.boutique.pending), color: data.boutique.pending > 0 ? colors.warning : colors.textDimmed },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Personnel ── */}
      <Animated.View style={{ opacity: fadeAnims[4], transform: [{ translateY: slideAnims[4] }] }}>
        <DashboardCard
          title="Personnel"
          wsKey="personnel"
          color={wsColor("personnel")}
          icon={<UsersRound size={20} color={wsColor("personnel")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "personnel" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Employes", value: String(data.personnel.employees), color: wsColor("personnel") },
            { label: "Masse salariale", value: formatMoney(data.personnel.salaryMass) + " F", color: colors.info },
            { label: "Conges en attente", value: String(data.personnel.pendingLeaves), color: data.personnel.pendingLeaves > 0 ? colors.warning : colors.textDimmed },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Banque ── */}
      <Animated.View style={{ opacity: fadeAnims[5], transform: [{ translateY: slideAnims[5] }] }}>
        <DashboardCard
          title="Banque"
          wsKey="banque"
          color={wsColor("banque")}
          icon={<Landmark size={20} color={wsColor("banque")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "banque" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Solde total", value: formatMoney(data.banque.totalBalance) + " F", color: colors.success },
            { label: "Entrees/mois", value: formatMoney(data.banque.monthEntries) + " F", color: colors.success },
            { label: "Sorties/mois", value: formatMoney(data.banque.monthExits) + " F", color: colors.destructive },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Analytique ── */}
      <Animated.View style={{ opacity: fadeAnims[6], transform: [{ translateY: slideAnims[6] }] }}>
        <DashboardCard
          title="Analytique"
          wsKey="analytique"
          color={wsColor("analytique")}
          icon={<BarChart3 size={20} color={wsColor("analytique")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "analytique" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "CA du mois", value: formatMoney(data.analytique.monthRevenue) + " F", color: colors.success },
            { label: "Depenses", value: formatMoney(data.analytique.monthExpenses) + " F", color: colors.destructive },
            { label: "Marge", value: data.analytique.margin + "%", color: data.analytique.margin >= 0 ? colors.success : colors.destructive },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Logistique ── */}
      <Animated.View style={{ opacity: fadeAnims[7], transform: [{ translateY: slideAnims[7] }] }}>
        <DashboardCard
          title="Logistique"
          wsKey="logistique"
          color={wsColor("logistique")}
          icon={<Truck size={20} color={wsColor("logistique")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "logistique" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Fournisseurs", value: String(data.logistique.suppliers), color: wsColor("logistique") },
            { label: "En transit", value: String(data.logistique.inTransit), color: colors.warning },
            { label: "Livrees", value: String(data.logistique.delivered), color: colors.success },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* ── Pilotage ── */}
      <Animated.View style={{ opacity: fadeAnims[8], transform: [{ translateY: slideAnims[8] }] }}>
        <DashboardCard
          title="Pilotage"
          wsKey="pilotage"
          color={wsColor("pilotage")}
          icon={<Settings2 size={20} color={wsColor("pilotage")} />}
          onPress={() => nav.navigate("WorkspaceSections", { workspaceKey: "pilotage" })}
          colors={colors}
        >
          <KpiRow colors={colors} items={[
            { label: "Produits", value: String(data.pilotage.totalProducts), color: wsColor("pilotage") },
            { label: "Clients", value: String(data.pilotage.totalClients), color: colors.info },
            { label: "CA total", value: formatMoney(data.pilotage.totalRevenue) + " F", color: colors.success },
          ]} />
        </DashboardCard>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={{ opacity: fadeAnims[9], transform: [{ translateY: slideAnims[9] }] }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Acces rapide</Text>
        <View style={styles.quickActions}>
          <QuickActionBtn label="Nouvelle facture" color="#3b82f6" onPress={() => nav.navigate("CreateInvoice")} colors={colors} />
          <QuickActionBtn label="Nouveau produit" color="#10b981" onPress={() => nav.navigate("ProductForm")} colors={colors} />
          <QuickActionBtn label="Nouveau devis" color="#8b5cf6" onPress={() => nav.navigate("CreateDevis")} colors={colors} />
        </View>
      </Animated.View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

/* ── Dashboard Card ── */
function DashboardCard({ title, wsKey, color, icon, onPress, children, colors }: {
  title: string; wsKey: string; color: string; icon: React.ReactNode;
  onPress: () => void; children: React.ReactNode; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.dashCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.dashCardHeader}>
        <View style={[styles.dashCardIcon, { backgroundColor: color + "18" }]}>
          {icon}
        </View>
        <Text style={[styles.dashCardTitle, { color: colors.text }]}>{title}</Text>
        <ChevronRight size={16} color={colors.textDimmed} />
      </View>
      {children}
    </TouchableOpacity>
  );
}

/* ── KPI Row inside card ── */
function KpiRow({ items, colors }: { items: { label: string; value: string; color: string }[]; colors: any }) {
  return (
    <View style={styles.kpiRow}>
      {items.map((item, i) => (
        <View key={i} style={[styles.kpiItem, i < items.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textDimmed }]} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ── Quick Action Button ── */
function QuickActionBtn({ label, color, onPress, colors }: {
  label: string; color: string; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: color + "40" }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionDot, { backgroundColor: color }]} />
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
      <ChevronRight size={14} color={colors.textDimmed} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  header: { marginBottom: spacing.lg },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: fontSize.md },
  userName: { fontSize: fontSize.xxl, fontWeight: "700", marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: fontSize.lg, fontWeight: "700" },

  globalKpiRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  globalKpi: {
    flex: 1, borderRadius: borderRadius.md, borderWidth: 1,
    paddingVertical: spacing.md, alignItems: "center",
  },
  globalKpiValue: { fontSize: fontSize.xl, fontWeight: "700" },
  globalKpiLabel: { fontSize: 10, marginTop: 2 },

  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: "700", marginBottom: spacing.md,
  },

  dashCard: {
    borderRadius: borderRadius.lg, borderWidth: 1,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  dashCardHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dashCardIcon: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    justifyContent: "center", alignItems: "center",
  },
  dashCardTitle: { flex: 1, fontSize: fontSize.md, fontWeight: "700" },

  kpiRow: { flexDirection: "row" },
  kpiItem: {
    flex: 1, alignItems: "center", paddingVertical: spacing.xs,
  },
  kpiValue: { fontSize: fontSize.lg, fontWeight: "700" },
  kpiLabel: { fontSize: 10, marginTop: 2, textAlign: "center" },

  quickActions: { gap: spacing.sm, marginBottom: spacing.lg },
  quickActionBtn: {
    flexDirection: "row", alignItems: "center",
    borderRadius: borderRadius.md, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
  },
  quickActionDot: { width: 8, height: 8, borderRadius: 4 },
  quickActionLabel: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
});
