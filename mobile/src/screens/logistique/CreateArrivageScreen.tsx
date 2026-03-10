import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { showAlert } from "../../utils/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Trash2, Search, X, ChevronDown } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Product, Supplier } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "CreateArrivage">;

interface ArrivageItemForm {
  key: string;
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
}

export default function CreateArrivageScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ArrivageItemForm[]>([
    { key: "1", productId: "", productName: "", quantity: "1", unitCost: "0" },
  ]);

  // Modals
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [activeItemKey, setActiveItemKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          apiFetch("/api/suppliers"),
          apiFetch("/api/products"),
        ]);
        if (sRes.ok) setSuppliers(await sRes.json());
        if (pRes.ok) setProducts(await pRes.json());
      } catch {
        // silent
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: String(Date.now()),
        productId: "",
        productName: "",
        quantity: "1",
        unitCost: "0",
      },
    ]);
  }

  function removeItem(key: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItem(key: string, field: keyof ArrivageItemForm, value: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function selectProduct(product: Product) {
    setItems((prev) =>
      prev.map((i) =>
        i.key === activeItemKey
          ? {
              ...i,
              productId: product._id,
              productName: product.name,
              unitCost: String(product.purchasePrice || product.sellingPrice || 0),
            }
          : i
      )
    );
    setShowProductPicker(false);
    setSearchQuery("");
  }

  function selectSupplier(supplier: Supplier) {
    setSupplierId(supplier._id);
    setSupplierName(supplier.name);
    setShowSupplierPicker(false);
    setSearchQuery("");
  }

  const totalCost = items.reduce((s, i) => {
    return s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitCost) || 0);
  }, 0);

  const totalItems = items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);

  async function handleSubmit() {
    const validItems = items.filter((i) => i.productName.trim());
    if (validItems.length === 0) {
      return showAlert("Erreur", "Ajoutez au moins un article");
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId: supplierId || null,
        notes,
        items: validItems.map((i) => ({
          productId: i.productId || null,
          productName: i.productName,
          quantity: parseInt(i.quantity) || 1,
          unitCost: parseFloat(i.unitCost) || 0,
        })),
      };

      const res = await apiFetch("/api/arrivages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        showAlert("Succes", `Arrivage ${data.reference} cree`, () => nav.goBack());
      } else {
        const data = await res.json();
        showAlert("Erreur", data.error || "Impossible de creer l'arrivage");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.model && p.model.toLowerCase().includes(q))
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loadingData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer>
      {/* Supplier */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Fournisseur (optionnel)</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        onPress={() => { setSearchQuery(""); setShowSupplierPicker(true); }}
      >
        <Text style={[styles.pickerText, { color: supplierName ? colors.text : colors.placeholder }]}>
          {supplierName || "Selectionner un fournisseur"}
        </Text>
        <ChevronDown size={18} color={colors.textDimmed} />
      </TouchableOpacity>

      {/* Notes */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes sur cet arrivage..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={3}
      />

      {/* Items */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles</Text>
        <TouchableOpacity onPress={addItem}>
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {items.map((item, idx) => (
        <View
          key={item.key}
          style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemLabel, { color: colors.textDimmed }]}>Article {idx + 1}</Text>
            {items.length > 1 && (
              <TouchableOpacity onPress={() => removeItem(item.key)}>
                <Trash2 size={16} color={colors.destructive || "#dc2626"} />
              </TouchableOpacity>
            )}
          </View>

          {/* Product selector */}
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            onPress={() => {
              setActiveItemKey(item.key);
              setSearchQuery("");
              setShowProductPicker(true);
            }}
          >
            <Text style={[styles.pickerText, { color: item.productName ? colors.text : colors.placeholder }]}>
              {item.productName || "Selectionner un produit"}
            </Text>
            <ChevronDown size={18} color={colors.textDimmed} />
          </TouchableOpacity>

          {/* Or manual name */}
          {!item.productId && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
              value={item.productName}
              onChangeText={(v) => updateItem(item.key, "productName", v)}
              placeholder="Ou saisir le nom manuellement"
              placeholderTextColor={colors.placeholder}
            />
          )}

          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniLabel, { color: colors.textDimmed }]}>Quantite</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={item.quantity}
                onChangeText={(v) => updateItem(item.key, "quantity", v)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniLabel, { color: colors.textDimmed }]}>Cout unitaire</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={item.unitCost}
                onChangeText={(v) => updateItem(item.key, "unitCost", v)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.itemSubtotal, { color: colors.primary }]}>
            Sous-total: {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)).toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      ))}

      {/* Totals */}
      <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total articles</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{totalItems}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Cout total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {totalCost.toLocaleString("fr-FR")} FCFA
          </Text>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.7}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Creer l'arrivage</Text>
        )}
      </TouchableOpacity>

      {/* Supplier Picker Modal */}
      <Modal visible={showSupplierPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Fournisseur</Text>
              <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
                <X size={22} color={colors.textDimmed} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Search size={16} color={colors.textDimmed} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher..."
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredSuppliers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectSupplier(item)}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item.name}</Text>
                  {item.phone ? (
                    <Text style={[styles.modalItemSub, { color: colors.textDimmed }]}>{item.phone}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.modalEmpty, { color: colors.textDimmed }]}>Aucun fournisseur</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={showProductPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Produit</Text>
              <TouchableOpacity onPress={() => setShowProductPicker(false)}>
                <X size={22} color={colors.textDimmed} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
              <Search size={16} color={colors.textDimmed} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un produit..."
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectProduct(item)}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.modalItemSub, { color: colors.textDimmed }]}>
                    {item.brand ? `${item.brand} ` : ""}{item.model || ""} — Stock: {item.quantity}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.modalEmpty, { color: colors.textDimmed }]}>Aucun produit</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerText: { fontSize: fontSize.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "600" },
  itemCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  itemLabel: { fontSize: fontSize.sm, fontWeight: "600" },
  rowInputs: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  miniLabel: { fontSize: fontSize.xs, marginBottom: 4 },
  itemSubtotal: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginTop: spacing.sm,
    textAlign: "right",
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
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  totalLabel: { fontSize: fontSize.md },
  totalValue: { fontSize: fontSize.md, fontWeight: "700" },
  submitBtn: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  submitText: { fontSize: fontSize.md, fontWeight: "700" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "70%",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "600" },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalSearchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: spacing.sm },
  modalItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemText: { fontSize: fontSize.md },
  modalItemSub: { fontSize: fontSize.sm, marginTop: 2 },
  modalEmpty: {
    textAlign: "center",
    paddingVertical: spacing.xl,
    fontSize: fontSize.md,
  },
});
