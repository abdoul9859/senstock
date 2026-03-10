import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Store, UserCog, Building2, BarChart3, Truck, CheckSquare } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "ModulesGrid">;

const MODULES = [
  { key: "boutique", label: "Boutique", desc: "Boutique en ligne, commandes", icon: Store, screen: "BoutiqueDashboard" as const },
  { key: "personnel", label: "Personnel", desc: "Employes, salaires", icon: UserCog, screen: "PersonnelDashboard" as const },
  { key: "banque", label: "Banque", desc: "Comptes, transactions", icon: Building2, screen: "BanqueDashboard" as const },
  { key: "analytique", label: "Analytique", desc: "Rapports, tendances", icon: BarChart3, screen: "AnalytiqueDashboard" as const },
  { key: "logistique", label: "Logistique", desc: "Fournisseurs, commandes", icon: Truck, screen: "LogistiqueDashboard" as const },
  { key: "taches", label: "Taches", desc: "Tableaux, taches Kanban", icon: CheckSquare, screen: "TachesDashboard" as const },
];

export default function ModulesGridScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();

  return (
    <ScreenContainer>
      <Text style={[styles.intro, { color: colors.textMuted }]}>
        Acces rapide aux modules supplementaires de SenStock.
      </Text>

      <View style={styles.grid}>
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <TouchableOpacity
              key={mod.key}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nav.navigate(mod.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.iconRow}>
                <Icon size={24} color={colors.primary} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.text }]}>{mod.label}</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{mod.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    width: "47%",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  cardDesc: {
    fontSize: fontSize.sm,
  },
});
