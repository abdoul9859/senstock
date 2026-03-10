import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";

type WorkspaceKey = "entrepot" | "commerce" | "boutique" | "banque";

// Entrepot settings
function EntrepotSettings({ colors }: { colors: any }) {
  const [lowStockVariant, setLowStockVariant] = useState("5");
  const [lowStockSimple, setLowStockSimple] = useState("2");
  const [currency, setCurrency] = useState(" FCFA");

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Inventaire</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingField label="Seuil stock bas (variants)" value={lowStockVariant}
          onChangeText={setLowStockVariant} keyboardType="numeric" colors={colors} />
        <SettingField label="Seuil stock bas (simple)" value={lowStockSimple}
          onChangeText={setLowStockSimple} keyboardType="numeric" colors={colors} />
        <SettingField label="Suffixe devise" value={currency}
          onChangeText={setCurrency} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Codes-barres</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Configurez les parametres de codes-barres depuis l'application web pour une meilleure experience.
        </Text>
      </View>
    </>
  );
}

// Commerce settings
function CommerceSettings({ colors }: { colors: any }) {
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [warrantyText, setWarrantyText] = useState("");

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Template de facture</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Le choix du template et la couleur d'accent sont configurables depuis l'application web.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Textes par defaut</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingField label="Notes facture par defaut" value={invoiceNotes}
          onChangeText={setInvoiceNotes} multiline colors={colors} />
        <SettingField label="Texte garantie par defaut" value={warrantyText}
          onChangeText={setWarrantyText} multiline colors={colors} />
      </View>
    </>
  );
}

// Boutique settings
function BoutiqueSettings({ colors }: { colors: any }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/boutique/settings");
        if (res.ok) setSettings(await res.json());
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Identite</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow label="Nom" value={settings?.shopName || "—"} colors={colors} />
        <InfoRow label="Description" value={settings?.shopDescription || "—"} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Contact</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow label="Telephone" value={settings?.contactPhone || "—"} colors={colors} />
        <InfoRow label="Email" value={settings?.contactEmail || "—"} colors={colors} />
        <InfoRow label="Adresse" value={settings?.contactAddress || "—"} colors={colors} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Commerce</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow label="Devise" value={settings?.currencySuffix || "FCFA"} colors={colors} />
        <InfoRow label="Taux TVA" value={`${settings?.taxRate || 0}%`} colors={colors} />
        <InfoRow label="Frais livraison" value={`${settings?.defaultShippingFee || 0} FCFA`} colors={colors} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: spacing.md }]}>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Pour modifier ces parametres en detail (theme, paiement, emails, footer), utilisez l'application web.
        </Text>
      </View>
    </>
  );
}

// Banque settings
function BanqueSettings({ colors }: { colors: any }) {
  const [currency, setCurrency] = useState("FCFA");
  const [perPage, setPerPage] = useState("25");
  const [autoReconcile, setAutoReconcile] = useState(false);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingField label="Devise par defaut" value={currency}
          onChangeText={setCurrency} colors={colors} />
        <SettingField label="Transactions par page" value={perPage}
          onChangeText={setPerPage} keyboardType="numeric" colors={colors} />
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Rapprochement automatique</Text>
          <Switch value={autoReconcile} onValueChange={setAutoReconcile}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff" />
        </View>
      </View>
    </>
  );
}

// Main component
export default function WorkspaceSettingsScreen() {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const wsKey: WorkspaceKey = route.params?.workspaceKey || "entrepot";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {wsKey === "entrepot" && <EntrepotSettings colors={colors} />}
      {wsKey === "commerce" && <CommerceSettings colors={colors} />}
      {wsKey === "boutique" && <BoutiqueSettings colors={colors} />}
      {wsKey === "banque" && <BanqueSettings colors={colors} />}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Shared sub-components
function SettingField({ label, value, onChangeText, keyboardType, multiline, colors }: any) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, {
          backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text,
        }, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
      />
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textDimmed }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: "700", marginBottom: spacing.sm,
    marginTop: spacing.md, textTransform: "uppercase", letterSpacing: 0.5,
  },
  card: {
    borderRadius: borderRadius.md, borderWidth: 1, padding: spacing.lg, gap: spacing.md,
  },
  infoText: { fontSize: fontSize.sm, lineHeight: 20 },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { fontSize: fontSize.sm },
  fieldInput: {
    borderRadius: borderRadius.sm, borderWidth: 1,
    fontSize: fontSize.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  switchLabel: { fontSize: fontSize.md, fontWeight: "500", flex: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoLabel: { fontSize: fontSize.sm, width: 100 },
  infoValue: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
});
