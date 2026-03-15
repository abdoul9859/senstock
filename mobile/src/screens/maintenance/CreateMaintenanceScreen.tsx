import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { Plus, Trash2 } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, "CreateMaintenance">;

interface Part { name: string; quantity: string; unitPrice: string; }

export default function CreateMaintenanceScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const ticketId = (route.params as any)?.ticketId;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!ticketId);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [conditionAtReception, setConditionAtReception] = useState("moyen");
  const [accessories, setAccessories] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [repairNotes, setRepairNotes] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [finalCost, setFinalCost] = useState("");
  const [priority, setPriority] = useState("normale");
  const [parts, setParts] = useState<Part[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!ticketId) return;
    apiFetch(`/api/maintenance/${ticketId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((t) => {
        if (!t) return;
        setClientName(t.clientName || "");
        setClientPhone(t.clientPhone || "");
        setClientEmail(t.clientEmail || "");
        setDeviceName(t.deviceName || "");
        setDeviceBrand(t.deviceBrand || "");
        setDeviceModel(t.deviceModel || "");
        setSerialNumber(t.serialNumber || "");
        setIssueDescription(t.issueDescription || "");
        setConditionAtReception(t.conditionAtReception || "moyen");
        setAccessories(t.accessories || "");
        setDiagnostic(t.diagnostic || "");
        setRepairNotes(t.repairNotes || "");
        setLaborCost(String(t.laborCost || ""));
        setEstimatedCost(String(t.estimatedCost || ""));
        setFinalCost(String(t.finalCost || ""));
        setPriority(t.priority || "normale");
        setNotes(t.notes || "");
        setParts((t.partsUsed || []).map((p: any) => ({ name: p.name, quantity: String(p.quantity), unitPrice: String(p.unitPrice) })));
      })
      .finally(() => setLoading(false));
  }, [ticketId]);

  function addPart() { setParts((p) => [...p, { name: "", quantity: "1", unitPrice: "0" }]); }
  function updatePart(i: number, key: keyof Part, val: string) {
    setParts((p) => p.map((part, idx) => idx === i ? { ...part, [key]: val } : part));
  }
  function removePart(i: number) { setParts((p) => p.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!clientName.trim()) { Alert.alert("Erreur", "Le nom du client est requis"); return; }
    if (!clientPhone.trim()) { Alert.alert("Erreur", "Le téléphone du client est requis"); return; }
    if (!issueDescription.trim()) { Alert.alert("Erreur", "La description du problème est requise"); return; }

    setSaving(true);
    const body = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      deviceName: deviceName.trim(),
      deviceBrand: deviceBrand.trim(),
      deviceModel: deviceModel.trim(),
      serialNumber: serialNumber.trim(),
      issueDescription: issueDescription.trim(),
      conditionAtReception,
      accessories: accessories.trim(),
      diagnostic: diagnostic.trim(),
      repairNotes: repairNotes.trim(),
      laborCost: parseFloat(laborCost) || 0,
      estimatedCost: parseFloat(estimatedCost) || 0,
      finalCost: parseFloat(finalCost) || 0,
      priority,
      notes: notes.trim(),
      partsUsed: parts.filter((p) => p.name.trim()).map((p) => ({
        name: p.name, quantity: parseInt(p.quantity) || 1, unitPrice: parseFloat(p.unitPrice) || 0,
      })),
    };

    try {
      const url = ticketId ? `/api/maintenance/${ticketId}` : "/api/maintenance";
      const method = ticketId ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        nav.goBack();
      } else {
        const d = await res.json();
        Alert.alert("Erreur", d.error || "Erreur lors de l'enregistrement");
      }
    } catch { Alert.alert("Erreur", "Erreur réseau"); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const field = (label: string, value: string, onChange: (v: string) => void, props: any = {}) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        value={value} onChangeText={onChange} placeholderTextColor={colors.placeholder}
        {...props}
      />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
      {field("Nom *", clientName, setClientName, { placeholder: "Nom du client" })}
      {field("Téléphone *", clientPhone, setClientPhone, { placeholder: "77 000 00 00", keyboardType: "phone-pad" })}
      {field("Email", clientEmail, setClientEmail, { placeholder: "client@email.com", keyboardType: "email-address" })}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Appareil</Text>
      {field("Marque", deviceBrand, setDeviceBrand, { placeholder: "Samsung, Apple..." })}
      {field("Nom / Modèle", deviceName, setDeviceName, { placeholder: "Galaxy S24, iPhone 15..." })}
      {field("N° de série / IMEI", serialNumber, setSerialNumber, { placeholder: "Optionnel" })}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Problème</Text>
      {field("Description *", issueDescription, setIssueDescription, { placeholder: "Décrire le problème...", multiline: true, numberOfLines: 3 })}
      {field("Accessoires", accessories, setAccessories, { placeholder: "Chargeur, coque..." })}

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>État à la réception</Text>
      <View style={styles.row}>
        {["bon", "moyen", "mauvais"].map((c) => (
          <TouchableOpacity key={c}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card },
              conditionAtReception === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setConditionAtReception(c)}>
            <Text style={[styles.chipText, { color: colors.text }, conditionAtReception === c && { color: "#fff" }]}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Diagnostic & Réparation</Text>
      {field("Diagnostic", diagnostic, setDiagnostic, { placeholder: "Résultat du diagnostic...", multiline: true, numberOfLines: 2 })}
      {field("Notes de réparation", repairNotes, setRepairNotes, { placeholder: "Travaux effectués...", multiline: true, numberOfLines: 2 })}

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Pièces utilisées</Text>
      {parts.map((p, i) => (
        <View key={i} style={[styles.partRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput style={[styles.partInput, { flex: 2, color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={p.name} onChangeText={(v) => updatePart(i, "name", v)} placeholder="Nom pièce" placeholderTextColor={colors.placeholder} />
          <TextInput style={[styles.partInput, { flex: 1, color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={p.quantity} onChangeText={(v) => updatePart(i, "quantity", v)} keyboardType="numeric" placeholder="Qté" placeholderTextColor={colors.placeholder} />
          <TextInput style={[styles.partInput, { flex: 1, color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
            value={p.unitPrice} onChangeText={(v) => updatePart(i, "unitPrice", v)} keyboardType="numeric" placeholder="Prix" placeholderTextColor={colors.placeholder} />
          <TouchableOpacity onPress={() => removePart(i)}>
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={[styles.addPartBtn, { borderColor: colors.border }]} onPress={addPart}>
        <Plus size={16} color={colors.primary} />
        <Text style={[styles.addPartText, { color: colors.primary }]}>Ajouter une pièce</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Coûts</Text>
      {field("Coût estimé (FCFA)", estimatedCost, setEstimatedCost, { keyboardType: "numeric", placeholder: "0" })}
      {field("Main d'œuvre (FCFA)", laborCost, setLaborCost, { keyboardType: "numeric", placeholder: "0" })}
      {field("Coût final (FCFA)", finalCost, setFinalCost, { keyboardType: "numeric", placeholder: "0" })}

      {field("Notes internes", notes, setNotes, { placeholder: "Notes...", multiline: true, numberOfLines: 2 })}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
        onPress={handleSave} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.submitText}>{ticketId ? "Modifier" : "Créer le ticket"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  field: { marginTop: spacing.sm },
  label: { fontSize: fontSize.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  chip: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: fontSize.sm },
  partRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: borderRadius.sm, borderWidth: 1 },
  partInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: fontSize.sm },
  addPartBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: spacing.md, borderRadius: borderRadius.sm, borderWidth: 1, justifyContent: "center", borderStyle: "dashed" },
  addPartText: { fontSize: fontSize.sm, fontWeight: "600" },
  submitBtn: { marginTop: spacing.xl, borderRadius: borderRadius.sm, paddingVertical: spacing.lg, alignItems: "center" },
  submitText: { color: "#fff", fontSize: fontSize.lg, fontWeight: "600" },
});
