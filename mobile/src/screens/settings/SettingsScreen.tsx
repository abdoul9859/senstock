import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking,
  ScrollView, TextInput, ActivityIndicator,
} from "react-native";
import { showAlert, showConfirm } from "../../utils/alert";
import {
  LogOut, Globe, Info, ChevronRight, Building, Bell,
  Shield, Database, RefreshCw, Mail, Phone, Sun, Moon,
} from "lucide-react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";

interface CompanySettings {
  companyName: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  quotePrefix: string;
}

export default function SettingsScreen() {
  const { user, tenant, logout, refreshTenant } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch("/api/company-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormData(data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/company-settings", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setEditMode(false);
        showAlert("Succes", "Parametres sauvegardes");
      }
    } catch {
      showAlert("Erreur", "Impossible de sauvegarder");
    }
    setSaving(false);
  }

  function handleLogout() {
    showConfirm(
      "Deconnexion",
      "Voulez-vous vraiment vous deconnecter ?", logout);
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarLetter}>
            {user?.name?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name || "Utilisateur"}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || ""}</Text>
          <Text style={[styles.role, { color: colors.primary }]}>{user?.role || "admin"}</Text>
        </View>
      </View>

      {/* Company Settings */}
      <SectionHeader title="Entreprise" color={colors.textSecondary} />
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : editMode ? (
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FormField label="Nom de l'entreprise" value={formData.companyName || ""}
            onChangeText={(v) => setFormData({ ...formData, companyName: v })} colors={colors} />
          <FormField label="Telephone" value={formData.phone || ""}
            onChangeText={(v) => setFormData({ ...formData, phone: v })} colors={colors} />
          <FormField label="Email" value={formData.email || ""}
            onChangeText={(v) => setFormData({ ...formData, email: v })} colors={colors} />
          <FormField label="Adresse" value={formData.address || ""}
            onChangeText={(v) => setFormData({ ...formData, address: v })} colors={colors} />
          <FormField label="Devise" value={formData.currency || "FCFA"}
            onChangeText={(v) => setFormData({ ...formData, currency: v })} colors={colors} />
          <FormField label="Taux TVA (%)" value={String(formData.taxRate || 0)}
            onChangeText={(v) => setFormData({ ...formData, taxRate: parseFloat(v) || 0 })} keyboardType="numeric" colors={colors} />
          <FormField label="Prefixe facture" value={formData.invoicePrefix || "FAC-"}
            onChangeText={(v) => setFormData({ ...formData, invoicePrefix: v })} colors={colors} />
          <FormField label="Prefixe devis" value={formData.quotePrefix || "DEV-"}
            onChangeText={(v) => setFormData({ ...formData, quotePrefix: v })} colors={colors} />
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setEditMode(false); setFormData(settings || {}); }}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveSettings} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Sauvegarder</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {settings ? (
            <>
              <InfoRow icon={<Building size={16} color={colors.textMuted} />} label="Entreprise" value={settings.companyName || "—"} colors={colors} />
              <InfoRow icon={<Phone size={16} color={colors.textMuted} />} label="Telephone" value={settings.phone || "—"} colors={colors} />
              <InfoRow icon={<Mail size={16} color={colors.textMuted} />} label="Email" value={settings.email || "—"} colors={colors} />
              <InfoRow icon={<Globe size={16} color={colors.textMuted} />} label="Devise" value={settings.currency || "FCFA"} colors={colors} />
            </>
          ) : (
            <Text style={[styles.noData, { color: colors.textDimmed }]}>Aucun parametre configure</Text>
          )}
          <TouchableOpacity style={[styles.editBtn, { borderTopColor: colors.border }]} onPress={() => setEditMode(true)}>
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Modifier</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subscription */}
      <SectionHeader title="Abonnement" color={colors.textSecondary} />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow icon={<Shield size={16} color={colors.primary} />} label="Plan" value={tenant?.plan?.toUpperCase() || "—"} colors={colors} />
        {tenant?.subscriptionStatus && tenant.subscriptionStatus !== "none" && (
          <InfoRow icon={<RefreshCw size={16} color={colors.textMuted} />} label="Statut" value={tenant.subscriptionStatus} colors={colors} />
        )}
        {tenant?.trialEndsAt && (
          <InfoRow icon={<Bell size={16} color={colors.warning} />} label="Fin d'essai"
            value={new Date(tenant.trialEndsAt).toLocaleDateString("fr-FR")} colors={colors} />
        )}
        <TouchableOpacity style={[styles.editBtn, { borderTopColor: colors.border }]} onPress={refreshTenant}>
          <RefreshCw size={14} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Actualiser</Text>
        </TouchableOpacity>
      </View>

      {/* Application */}
      <SectionHeader title="Application" color={colors.textSecondary} />
      <View style={styles.menuSection}>
        {/* Theme toggle */}
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          {isDark ? <Moon size={18} color={colors.warning} /> : <Sun size={18} color={colors.warning} />}
          <Text style={[styles.menuLabel, { color: colors.text }]}>
            {isDark ? "Mode sombre" : "Mode clair"}
          </Text>
          <View style={[styles.themeToggle, { backgroundColor: isDark ? colors.primary : colors.textDimmed }]}>
            <View style={[
              styles.themeToggleKnob,
              isDark ? { right: 2 } : { left: 2 },
            ]} />
          </View>
        </TouchableOpacity>

        <MenuItem icon={<Globe size={18} color={colors.info} />} label="Ouvrir StockFlow Web"
          onPress={() => {
            const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
            Linking.openURL(`http://${host}:8080`);
          }} colors={colors} />
        <MenuItem icon={<Database size={18} color={colors.textMuted} />} label="Synchroniser les donnees"
          onPress={() => { refreshTenant(); showAlert("Sync", "Donnees synchronisees"); }} colors={colors} />
        <MenuItem icon={<Info size={18} color={colors.textMuted} />} label="A propos"
          onPress={() => showAlert("StockFlow Mobile", "Version 1.0.0\nApplication de gestion commerciale")} colors={colors} />
      </View>

      {/* Logout */}
      <View style={[styles.menuSection, { marginTop: spacing.xl }]}>
        <MenuItem icon={<LogOut size={18} color={colors.destructive} />} label="Se deconnecter" destructive onPress={handleLogout} colors={colors} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
}

function InfoRow({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={[styles.infoLabel, { color: colors.textDimmed }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, keyboardType, colors }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; colors: any;
}) {
  return (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.formInput, {
          backgroundColor: colors.inputBackground,
          borderColor: colors.inputBorder,
          color: colors.text,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function MenuItem({ icon, label, onPress, destructive, colors }: {
  icon: React.ReactNode; label: string; onPress: () => void; destructive?: boolean; colors: any;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.menuLabel, { color: destructive ? colors.destructive : colors.text }]}>{label}</Text>
      <ChevronRight size={16} color={colors.textDimmed} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.lg },
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.xl,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
  },
  avatarLetter: { color: "#fff", fontSize: fontSize.xxl, fontWeight: "700" },
  name: { fontSize: fontSize.xl, fontWeight: "700" },
  email: { fontSize: fontSize.sm, marginTop: 2 },
  role: { fontSize: fontSize.xs, fontWeight: "600", marginTop: 2, textTransform: "uppercase" },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: "700",
    marginBottom: spacing.md, marginTop: spacing.xl, textTransform: "uppercase", letterSpacing: 0.5,
  },
  infoCard: {
    borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, gap: spacing.md,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoLabel: { fontSize: fontSize.sm, width: 90 },
  infoValue: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
  noData: { fontSize: fontSize.sm, textAlign: "center" },
  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, paddingVertical: spacing.sm, marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  editBtnText: { fontSize: fontSize.sm, fontWeight: "600" },
  formCard: {
    borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, gap: spacing.md,
  },
  formField: { gap: spacing.xs },
  formLabel: { fontSize: fontSize.sm },
  formInput: {
    borderRadius: borderRadius.sm, borderWidth: 1,
    fontSize: fontSize.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  formActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.sm,
    borderWidth: 1, alignItems: "center",
  },
  cancelBtnText: { fontSize: fontSize.md, fontWeight: "500" },
  saveBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.sm, alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  menuSection: { gap: spacing.sm },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
  themeToggle: {
    width: 44, height: 24, borderRadius: 12,
    justifyContent: "center", position: "relative",
  },
  themeToggleKnob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#fff", position: "absolute",
  },
});
