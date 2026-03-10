import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, Trash2, User } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import type { Supplier } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "CreateCommandeLog">;

interface OrderItem {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateCommandeLogScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierPicker, setShowSupplierPicker] = useState(true);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");

  // New item form
  const [newDesc, setNewDesc] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    apiFetch("/api/suppliers")
      .then((r) => (r.ok ? r.json() : []))
      .then((s) => setSuppliers(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addItem() {
    if (!newDesc.trim()) {
      showAlert("Description requise", "Veuillez saisir une description.");
      return;
    }
    const qty = parseInt(newQty, 10) || 1;
    const price = parseFloat(newPrice) || 0;
    setItems((prev) => [
      ...prev,
      {
        key: `item_${Date.now()}`,
        description: newDesc.trim(),
        quantity: qty,
        unitPrice: price,
      },
    ]);
    setNewDesc("");
    setNewQty("");
    setNewPrice("");
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  async function handleSubmit() {
    if (!selectedSupplier) {
      showAlert("Fournisseur requis", "Veuillez selectionner un fournisseur.");
      return;
    }
    if (items.length === 0) {
      showAlert("Articles requis", "Ajoutez au moins un article.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        supplier: selectedSupplier._id,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.unitPrice * i.quantity,
        })),
        total,
        notes,
      };

      const res = await apiFetch("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        nav.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de creer la commande");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : suppliers.slice(0, 10);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Supplier Selection */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Fournisseur</Text>
      {selectedSupplier ? (
        <View style={[styles.selectedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <User size={18} color={colors.primary} />
          <Text style={[styles.selectedName, { color: colors.text }]}>{selectedSupplier.name}</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedSupplier(null);
              setShowSupplierPicker(true);
            }}
          >
            <Text style={[styles.changeLink, { color: colors.primary }]}>Changer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Search size={16} color={colors.textDimmed} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={supplierSearch}
              onChangeText={setSupplierSearch}
              placeholder="Rechercher un fournisseur..."
              placeholderTextColor={colors.placeholder}
            />
          </View>
          {filteredSuppliers.map((s) => (
            <TouchableOpacity
              key={s._id}
              style={[styles.pickerRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSelectedSupplier(s);
                setShowSupplierPicker(false);
              }}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>{s.name}</Text>
              {s.phone && <Text style={[styles.pickerSub, { color: colors.textDimmed }]}>{s.phone}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Items */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles ({items.length})</Text>
      </View>

      {/* Add item form */}
      <View style={[styles.addItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
          value={newDesc}
          onChangeText={setNewDesc}
          placeholder="Description"
          placeholderTextColor={colors.placeholder}
        />
        <View style={styles.addItemRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={newQty}
            onChangeText={setNewQty}
            placeholder="Qte"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={newPrice}
            onChangeText={setNewPrice}
            placeholder="Prix unitaire"
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
          />
          <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: colors.primary }]} onPress={addItem}>
            <Plus size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {items.map((item) => (
        <View key={item.key} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={[styles.itemPrice, { color: colors.textMuted }]}>
              {item.quantity} x {item.unitPrice.toLocaleString("fr-FR")} ={" "}
              {(item.quantity * item.unitPrice).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeItem(item.key)}>
            <Trash2 size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Total */}
      {items.length > 0 && (
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {total.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      )}

      {/* Notes */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes supplementaires..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={3}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Creer la commande</Text>
        )}
      </TouchableOpacity>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  selectedName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  changeLink: {
    fontSize: fontSize.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerText: {
    fontSize: fontSize.sm,
  },
  pickerSub: {
    fontSize: fontSize.xs,
  },
  addItemCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addItemRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  addItemBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  totalCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  submitBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
});
