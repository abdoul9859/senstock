import { showConfirm } from "../../utils/alert";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Settings, ChevronRight, Boxes, Receipt, Store, Building2,
  Sun, Moon, LogOut,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";

const WORKSPACE_SETTINGS = [
  { key: "entrepot", label: "Entrepot", icon: Boxes, color: "#10b981", screen: "EntrepotSettings" },
  { key: "commerce", label: "Commerce", icon: Receipt, color: "#3b82f6", screen: "CommerceSettings" },
  { key: "boutique", label: "Boutique", icon: Store, color: "#8b5cf6", screen: "BoutiqueSettings" },
  { key: "banque", label: "Banque", icon: Building2, color: "#06b6d4", screen: "BanqueSettings" },
];

export default function SettingsMenuScreen() {
  const nav = useNavigation<any>();
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Profile mini */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarLetter}>{user?.name?.charAt(0).toUpperCase() || "?"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || "Utilisateur"}</Text>
          <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email || ""}</Text>
        </View>
      </View>

      {/* General Settings */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => nav.navigate("SettingsGeneral")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary + "18" }]}>
            <Settings size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Parametres generaux</Text>
            <Text style={[styles.menuDesc, { color: colors.textDimmed }]}>Entreprise, abonnement, application</Text>
          </View>
          <ChevronRight size={16} color={colors.textDimmed} />
        </TouchableOpacity>
      </View>

      {/* Workspace Settings */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Espaces de travail</Text>
      <View style={styles.menuGroup}>
        {WORKSPACE_SETTINGS.map((ws) => {
          const Icon = ws.icon;
          return (
            <TouchableOpacity
              key={ws.key}
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => nav.navigate(ws.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: ws.color + "18" }]}>
                <Icon size={20} color={ws.color} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{ws.label}</Text>
              <ChevronRight size={16} color={colors.textDimmed} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Theme + Logout */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Application</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          {isDark ? <Moon size={20} color={colors.warning} /> : <Sun size={20} color={colors.warning} />}
          <Text style={[styles.menuLabel, { color: colors.text, marginLeft: spacing.md }]}>
            {isDark ? "Mode sombre" : "Mode clair"}
          </Text>
          <View style={[styles.toggle, { backgroundColor: isDark ? colors.primary : colors.textDimmed }]}>
            <View style={[styles.toggleKnob, isDark ? { right: 2 } : { left: 2 }]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            showConfirm("Deconnexion", "Voulez-vous vraiment vous deconnecter ?", logout);
          }}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={colors.destructive} />
          <Text style={[styles.menuLabel, { color: colors.destructive, marginLeft: spacing.md }]}>Se deconnecter</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.lg,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center",
  },
  avatarLetter: { color: "#fff", fontSize: fontSize.xl, fontWeight: "700" },
  profileName: { fontSize: fontSize.lg, fontWeight: "700" },
  profileEmail: { fontSize: fontSize.sm, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: "700", marginBottom: spacing.sm,
    marginTop: spacing.md, textTransform: "uppercase", letterSpacing: 0.5,
  },
  menuGroup: { gap: spacing.sm },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    justifyContent: "center", alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
  menuDesc: { fontSize: fontSize.xs, marginTop: 2 },
  toggle: {
    width: 44, height: 24, borderRadius: 12, justifyContent: "center", position: "relative",
  },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", position: "absolute",
  },
});
