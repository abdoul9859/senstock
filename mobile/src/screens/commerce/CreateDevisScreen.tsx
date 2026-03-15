import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Search, Plus, Trash2, User } from "lucide-react-native";
import { showAlert } from "../../utils/alert";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { useDraftSync } from "../../hooks/useDraftSync";
import DraftBanner from "../../components/DraftBanner";
import type { Client, Product, ProductVariant } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "CreateDevis">;
type RouteDef = RouteProp<AppStackParamList, "CreateDevis">;

interface DevisItem {
  key: string;
  type: "product" | "service";
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  quantityLocked?: boolean;
}

export default function CreateDevisScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteDef>();
  const editId = route.params?.quoteId;

  // Draft sync
  const { otherDrafts, saveDraft, clearDraft, loadOtherDraft } = useDraftSync({ type: "devis", enabled: !editId });

  function resumeFromOtherDevice() {
    const data = loadOtherDraft();
    if (!data) return;
    if (data.clientId && clients.length > 0) {
      const client = clients.find((c) => c._id === data.clientId);
      if (client) { setSelectedClient(client); setShowClientPicker(false); }
    }
    if (data.items && Array.isArray(data.items)) setItems(data.items as DevisItem[]);
    if (data.notes) setNotes(data.notes as string);
    if (data.showTax !== undefined) setShowTax(data.showTax as boolean);
    if (data.taxRate) setTaxRate(data.taxRate as string);
    if (data.validityDate) setValidityDate(data.validityDate as string);
    showAlert("Brouillon restaure", "Le brouillon a ete restaure depuis un autre appareil.");
  }

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(true);
  const [items, setItems] = useState<DevisItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [validityDate, setValidityDate] = useState("");
  const [showTax, setShowTax] = useState(false);
  const [taxRate, setTaxRate] = useState("18");
  const [notes, setNotes] = useState("");
  const [autoNumber, setAutoNumber] = useState("");

  // Sync full form state for cross-device
  useEffect(() => {
    if (editId || items.length === 0) return;
    saveDraft({
      clientId: selectedClient?._id, items, notes,
      showTax, taxRate, validityDate,
    });
  }, [editId, saveDraft, selectedClient, items, notes, showTax, taxRate, validityDate]);

  useEffect(() => {
    const promises: Promise<any>[] = [
      apiFetch("/api/clients").then((r) => (r.ok ? r.json() : [])),
      apiFetch("/api/products").then((r) => (r.ok ? r.json() : [])),
      apiFetch("/api/quotes/next-number").then((r) => (r.ok ? r.json() : null)),
    ];

    if (editId) {
      promises.push(apiFetch(`/api/quotes/${editId}`).then((r) => (r.ok ? r.json() : null)));
    }

    Promise.all(promises)
      .then(([c, p, numData, existingQuote]) => {
        setClients(c);
        setProducts(p);
        if (numData?.number) setAutoNumber(numData.number);

        if (existingQuote) {
          setSelectedClient(existingQuote.client || null);
          setShowClientPicker(!existingQuote.client);
          setItems(
            (existingQuote.items || []).map((it: any, idx: number) => ({
              key: `${it._id || idx}_${Date.now()}`,
              type: it.type || "product",
              productId: it.productId?._id || it.productId || undefined,
              variantId: it.variantId || undefined,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              quantityLocked: !!it.variantId,
            }))
          );
          setValidityDate(
            existingQuote.validityDate
              ? new Date(existingQuote.validityDate).toISOString().split("T")[0]
              : ""
          );
          setShowTax(existingQuote.showTax || false);
          setTaxRate(String(existingQuote.taxRate || 18));
          setNotes(existingQuote.notes || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [editId]);

  function addProduct(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: `${product._id}_${Date.now()}`,
        type: "product",
        productId: product._id,
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
      },
    ]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  function addVariant(product: Product, variant: ProductVariant) {
    const variantPrice = variant.price != null ? variant.price : (variant.sellingPrice || product.sellingPrice);
    const variantLabel = variant.serialNumber || variant.name || variant._id;
    setItems((prev) => [
      ...prev,
      {
        key: `${product._id}_${variant._id}_${Date.now()}`,
        type: "product",
        productId: product._id,
        variantId: variant._id,
        description: `${product.name} - ${variantLabel}`,
        quantity: 1,
        unitPrice: variantPrice,
        quantityLocked: true,
      },
    ]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  function addService() {
    setItems((prev) => [
      ...prev,
      {
        key: `service_${Date.now()}`,
        type: "service",
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItemQty(key: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }

  function updateItemUnitPrice(key: string, priceStr: string) {
    const price = parseFloat(priceStr) || 0;
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, unitPrice: price } : i))
    );
  }

  function updateItemDescription(key: string, desc: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, description: desc } : i))
    );
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxAmount = showTax ? Math.round(subtotal * (parseFloat(taxRate) || 0) / 100) : 0;
  const total = subtotal + taxAmount;

  async function handleSubmit() {
    if (!selectedClient) {
      showAlert("Client requis", "Veuillez selectionner un client.");
      return;
    }
    if (items.length === 0) {
      showAlert("Articles requis", "Ajoutez au moins un article.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        client: selectedClient._id,
        validityDate: validityDate || undefined,
        items: items.map((i) => ({
          type: i.type,
          productId: i.productId || undefined,
          variantId: i.variantId || undefined,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.unitPrice * i.quantity,
        })),
        subtotal,
        showTax,
        taxRate: showTax ? parseFloat(taxRate) || 0 : 0,
        taxAmount,
        total,
        notes: notes || undefined,
      };

      const url = editId ? `/api/quotes/${editId}` : "/api/quotes";
      const method = editId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        clearDraft();
        nav.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de sauvegarder le devis");
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

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients.slice(0, 10);

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products.slice(0, 10);

  // Build picker rows: for products with unsold variants, show each variant as a row;
  // for products without variants, show the product itself
  function renderProductPickerRows() {
    const rows: React.ReactNode[] = [];
    filteredProducts.forEach((p) => {
      const unsoldVariants = (p.variants || []).filter((v) => !v.sold);
      if (unsoldVariants.length > 0) {
        // Show each unsold variant as a selectable row
        unsoldVariants.forEach((v) => {
          const variantPrice = v.price != null ? v.price : (v.sellingPrice || p.sellingPrice);
          const variantLabel = v.serialNumber || v.name || v._id;
          const conditionText = v.condition || "";
          rows.push(
            <TouchableOpacity
              key={`${p._id}_${v._id}`}
              style={[styles.pickerRow, { borderBottomColor: colors.border }]}
              onPress={() => addVariant(p, v)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {p.name} - {variantLabel}
                </Text>
                {conditionText ? (
                  <View style={[styles.conditionBadge, { backgroundColor: colors.primaryDark + "22" }]}>
                    <Text style={[styles.conditionText, { color: colors.primaryDark }]}>{conditionText}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.pickerPrice, { color: colors.primary }]}>
                {variantPrice.toLocaleString("fr-FR")} FCFA
              </Text>
            </TouchableOpacity>
          );
        });
      } else {
        // No variants (or all sold) - show the product directly
        rows.push(
          <TouchableOpacity
            key={p._id}
            style={[styles.pickerRow, { borderBottomColor: colors.border }]}
            onPress={() => addProduct(p)}
          >
            <Text style={[styles.pickerText, { color: colors.text }]}>{p.name}</Text>
            <Text style={[styles.pickerPrice, { color: colors.primary }]}>
              {p.sellingPrice.toLocaleString("fr-FR")} FCFA
            </Text>
          </TouchableOpacity>
        );
      }
    });
    return rows;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {!editId && <DraftBanner drafts={otherDrafts} onResume={resumeFromOtherDevice} />}
      {/* Auto number */}
      {autoNumber && !editId ? (
        <View style={[styles.numberBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.numberLabel, { color: colors.textSecondary }]}>Numero : {autoNumber}</Text>
        </View>
      ) : null}

      {/* ── Client Selection ── */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Client</Text>
      {selectedClient ? (
        <View style={[styles.selectedClient, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <User size={18} color={colors.primary} />
          <Text style={[styles.selectedClientName, { color: colors.text }]}>{selectedClient.name}</Text>
          <TouchableOpacity onPress={() => { setSelectedClient(null); setShowClientPicker(true); }}>
            <Text style={[styles.changeLink, { color: colors.primary }]}>Changer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Search size={16} color={colors.textDimmed} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder="Rechercher un client..."
              placeholderTextColor={colors.placeholder}
            />
          </View>
          {filteredClients.map((c) => (
            <TouchableOpacity
              key={c._id}
              style={[styles.pickerRow, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSelectedClient(c);
                setShowClientPicker(false);
              }}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>{c.name}</Text>
              {c.phone && <Text style={[styles.pickerSub, { color: colors.textDimmed }]}>{c.phone}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Validity Date ── */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xl, color: colors.textSecondary }]}>Date de validite</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={validityDate}
        onChangeText={setValidityDate}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={colors.placeholder}
      />

      {/* ── Items ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Articles ({items.length})</Text>
        <View style={styles.addButtonsRow}>
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
            onPress={() => setShowProductPicker(true)}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addItemBtnText, { color: colors.primary }]}>Ajouter un article</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: colors.primaryDark + "15", borderColor: colors.primaryDark, marginLeft: spacing.sm }]}
            onPress={addService}
          >
            <Plus size={16} color={colors.primaryDark} />
            <Text style={[styles.addItemBtnText, { color: colors.primaryDark }]}>Ajouter un service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showProductPicker && (
        <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <Search size={16} color={colors.textDimmed} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Rechercher un produit..."
              placeholderTextColor={colors.placeholder}
              autoFocus
            />
          </View>
          <TouchableOpacity
            style={{ alignSelf: "flex-end", paddingVertical: spacing.xs }}
            onPress={() => { setShowProductPicker(false); setProductSearch(""); }}
          >
            <Text style={[{ color: colors.textDimmed, fontSize: fontSize.sm }]}>Fermer</Text>
          </TouchableOpacity>
          {renderProductPickerRows()}
        </View>
      )}

      {items.map((item) => (
        <View key={item.key} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            {/* Type badge */}
            <View style={styles.itemHeaderRow}>
              <View style={[styles.typeBadge, { backgroundColor: item.type === "service" ? colors.primaryDark + "22" : colors.primary + "22" }]}>
                <Text style={[styles.typeBadgeText, { color: item.type === "service" ? colors.primaryDark : colors.primary }]}>
                  {item.type === "service" ? "Service" : "Produit"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(item.key)} style={{ marginLeft: spacing.sm }}>
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>

            {/* Description - editable for services */}
            {item.type === "service" ? (
              <TextInput
                style={[styles.serviceDescInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                value={item.description}
                onChangeText={(text) => updateItemDescription(item.key, text)}
                placeholder="Description du service..."
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.description}</Text>
            )}

            {/* Unit price input + quantity controls */}
            <View style={styles.itemControlsRow}>
              <View style={styles.unitPriceContainer}>
                <Text style={[styles.unitPriceLabel, { color: colors.textMuted }]}>Prix unit.:</Text>
                <TextInput
                  style={[styles.unitPriceInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
                  value={String(item.unitPrice)}
                  onChangeText={(text) => updateItemUnitPrice(item.key, text)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                />
              </View>

              <View style={styles.itemActions}>
                {!item.quantityLocked && (
                  <TouchableOpacity onPress={() => updateItemQty(item.key, item.quantity - 1)}>
                    <Text style={[styles.qtyBtn, { color: colors.primary }]}>-</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                {!item.quantityLocked && (
                  <TouchableOpacity onPress={() => updateItemQty(item.key, item.quantity + 1)}>
                    <Text style={[styles.qtyBtn, { color: colors.primary }]}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[styles.itemPrice, { color: colors.textMuted }]}>
              Total: {(item.quantity * item.unitPrice).toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      ))}

      {/* ── Tax ── */}
      <View style={styles.taxRow}>
        <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Appliquer la TVA</Text>
        <Switch
          value={showTax}
          onValueChange={setShowTax}
          trackColor={{ false: colors.border, true: colors.primaryDark }}
          thumbColor={showTax ? colors.primary : colors.textDimmed}
        />
      </View>
      {showTax && (
        <View style={styles.taxInputRow}>
          <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Taux TVA (%)</Text>
          <TextInput
            style={[styles.taxInput, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
            value={taxRate}
            onChangeText={setTaxRate}
            keyboardType="numeric"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      )}

      {/* ── Notes ── */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.xl, color: colors.textSecondary }]}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.text }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes optionnelles..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={3}
      />

      {/* ── Total ── */}
      {items.length > 0 && (
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Sous-total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{subtotal.toLocaleString("fr-FR")} FCFA</Text>
          </View>
          {showTax && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>TVA ({taxRate}%)</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{taxAmount.toLocaleString("fr-FR")} FCFA</Text>
            </View>
          )}
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <Text style={[styles.totalLabelBold, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValueBold, { color: colors.primary }]}>{total.toLocaleString("fr-FR")} FCFA</Text>
          </View>
        </View>
      )}

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary }, saving && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
            {editId ? "Modifier le devis" : "Creer le devis"}
          </Text>
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
  numberBanner: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  numberLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  addButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  addItemBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  selectedClient: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  selectedClientName: {
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
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pickerCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    flex: 1,
  },
  pickerSub: {
    fontSize: fontSize.xs,
  },
  pickerPrice: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginLeft: spacing.sm,
  },
  conditionBadge: {
    alignSelf: "flex-start",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  itemRow: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  typeBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  serviceDescInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  itemControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  unitPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  unitPriceLabel: {
    fontSize: fontSize.xs,
  },
  unitPriceInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.sm,
    width: 100,
    textAlign: "center",
  },
  itemPrice: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  qtyBtn: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
  },
  qtyText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
  },
  taxRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  taxLabel: {
    fontSize: fontSize.md,
  },
  taxInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  taxInput: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    width: 80,
    textAlign: "center",
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
    marginBottom: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.sm,
  },
  totalValue: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  totalLabelBold: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  totalValueBold: {
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
