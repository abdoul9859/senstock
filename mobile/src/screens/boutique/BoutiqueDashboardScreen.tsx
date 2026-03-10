import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  BookOpen,
  ClipboardList,
  Tag,
} from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import KpiCard from "../../components/ui/KpiCard";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "BoutiqueDashboard">;

export default function BoutiqueDashboardScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch("/api/boutique/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetchStats();
      }}
    >
      {/* KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<ShoppingCart size={18} color={colors.primary} />}
          label="Commandes"
          value={stats?.totalOrders ?? 0}
        />
        <KpiCard
          icon={<DollarSign size={18} color={colors.success} />}
          label="CA en ligne"
          value={`${((stats?.totalRevenue ?? 0) / 1000).toFixed(0)}k`}
          subtitle="FCFA"
        />
      </View>
      <View style={styles.kpiGrid}>
        <KpiCard
          icon={<Package size={18} color={colors.info} />}
          label="Produits publies"
          value={stats?.publishedProducts ?? 0}
        />
        <KpiCard
          icon={<TrendingUp size={18} color={colors.warning} />}
          label="En attente"
          value={stats?.pendingOrders ?? 0}
        />
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Acces rapide</Text>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("Catalogue")}
        activeOpacity={0.7}
      >
        <BookOpen size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Catalogue</Text>
          <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Gerer vos produits en ligne</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("CommandesBoutique")}
        activeOpacity={0.7}
      >
        <ClipboardList size={20} color={colors.info} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Commandes</Text>
          <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Suivre les commandes boutique</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => nav.navigate("Promotions")}
        activeOpacity={0.7}
      >
        <Tag size={20} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>Promotions</Text>
          <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Gerer les offres promotionnelles</Text>
        </View>
      </TouchableOpacity>
    </ScreenContainer>
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
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  actionDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
