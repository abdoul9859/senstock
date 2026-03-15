import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Search, Plus, Trash2, User, FileText, Briefcase, Barcode } from "lucide-react-native";
import BarcodeScanner from "../../components/BarcodeScanner";
import { showAlert } from "../../utils/alert";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import { useDraftSync } from "../../hooks/useDraftSync";
import DraftBanner from "../../components/DraftBanner";
import type { Client, Product } from "../../types";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList, "CreateInvoice">;
type RouteDef = RouteProp<AppStackParamList, "CreateInvoice">;
type InvoiceType = "facture" | "proforma" | "vente_flash" | "avoir" | "echange";
type PaymentMethod = "especes" | "wave" | "orange_money" | "carte" | "virement";

interface InvoiceItem {
  key: string;
  type: "product" | "service";
  productId?: string;
  variantId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  hasVariant: boolean;
  discountAmount: number;
  discountReason: string;
  showDiscount: boolean;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: "facture", label: "Facture" },
  { value: "proforma", label: "Proforma" },
  { value: "vente_flash", label: "Vente flash" },
  { value: "avoir", label: "Avoir" },
  { value: "echange", label: "Echange" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "especes", label: "Especes" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "carte", label: "Carte" },
  { value: "virement", label: "Virement" },
];

const WARRANTY_DURATIONS = ["1 mois", "3 mois", "6 mois", "1 an", "2 ans"];

export default function CreateInvoiceScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteDef>();
  const editingId = route.params?.invoiceId;

  // Draft sync
  const { otherDrafts, saveDraft, clearDraft, loadOtherDraft } = useDraftSync({
    type: "invoice",
    enabled: !editingId,
  });

  function resumeFromOtherDevice() {
    const data = loadOtherDraft();
    if (!data) return;
    if (data.invoiceType) setInvoiceType(data.invoiceType as InvoiceType);
    if (data.items && Array.isArray(data.items)) setItems(data.items as any[]);
    if (data.exchangeItems && Array.isArray(data.exchangeItems)) setExchangeItems(data.exchangeItems as any[]);
    if (data.notes) setNotes(data.notes as string);
    if (data.showTax !== undefined) setShowTax(data.showTax as boolean);
    if (data.taxRate) setTaxRate(data.taxRate as string);
    if (data.paymentEnabled !== undefined) setPaymentEnabled(data.paymentEnabled as boolean);
    if (data.paymentAmount) setPaymentAmount(String(data.paymentAmount));
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod as PaymentMethod);
    if (data.warrantyEnabled !== undefined) setWarrantyEnabled(data.warrantyEnabled as boolean);
    if (data.warrantyDuration) setWarrantyDuration(data.warrantyDuration as string);
    if (data.warrantyDescription) setWarrantyDescription(data.warrantyDescription as string);
    // Resolve client
    if (data.clientId) {
      const client = clients.find((c) => c._id === data.clientId);
      if (client) setSelectedClient(client);
    }
    showAlert("Reprise", "Brouillon repris depuis l'autre appareil");
  }

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("facture");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Exchange items (for "echange" type)
  const [exchangeItems, setExchangeItems] = useState<InvoiceItem[]>([]);
  const [showExchangeProductPicker, setShowExchangeProductPicker] = useState(false);
  const [exchangeProductSearch, setExchangeProductSearch] = useState("");

  // Invoice-level discount
  const [invoiceDiscountEnabled, setInvoiceDiscountEnabled] = useState(false);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState("");
  const [invoiceDiscountReason, setInvoiceDiscountReason] = useState("");

  // Tax
  const [showTax, setShowTax] = useState(false);
  const [taxRate, setTaxRate] = useState("18");

  // Payment
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("especes");
  const [paymentDate, setPaymentDate] = useState(todayISO());

  // Warranty
  const [warrantyEnabled, setWarrantyEnabled] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyText, setWarrantyText] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  // Autosave draft state
  const [draftId, setDraftId] = useState<string | null>(editingId || null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutosaving = useRef(false);

  useEffect(() => {
    const fetches: Promise<any>[] = [
      apiFetch("/api/clients").then((r) => (r.ok ? r.json() : [])),
      apiFetch("/api/products").then((r) => (r.ok ? r.json() : [])),
    ];
    if (editingId) {
      fetches.push(apiFetch(`/api/invoices/${editingId}`).then((r) => (r.ok ? r.json() : null)));
    }
    Promise.all(fetches)
      .then(([c, p, existingInvoice]) => {
        setClients(c);
        setProducts(p);

        // Pre-fill form when editing
        if (existingInvoice) {
          setInvoiceType(existingInvoice.type || "facture");
          setInvoiceDate(existingInvoice.date ? existingInvoice.date.slice(0, 10) : todayISO());
          setDueDate(existingInvoice.dueDate ? existingInvoice.dueDate.slice(0, 10) : "");
          if (existingInvoice.client) {
            setSelectedClient(existingInvoice.client);
            setShowClientPicker(false);
          }
          setNotes(existingInvoice.notes || "");
          setShowTax(existingInvoice.showTax || false);
          setTaxRate(String(existingInvoice.taxRate ?? 18));

          // Invoice-level discount
          if (existingInvoice.discountAmount > 0) {
            setInvoiceDiscountEnabled(true);
            setInvoiceDiscountAmount(String(existingInvoice.discountAmount));
            setInvoiceDiscountReason(existingInvoice.discountReason || "");
          }

          // Payment
          if (existingInvoice.payment?.enabled) {
            setPaymentEnabled(true);
            setPaymentAmount(String(existingInvoice.payment.amount || 0));
            setPaymentMethod(existingInvoice.payment.method || "especes");
            setPaymentDate(existingInvoice.payment.date ? existingInvoice.payment.date.slice(0, 10) : todayISO());
          }

          // Warranty
          if (existingInvoice.warranty?.enabled) {
            setWarrantyEnabled(true);
            setWarrantyDuration(existingInvoice.warranty.duration || "");
            setWarrantyText(existingInvoice.warranty.description || "");
          }

          // Items
          if (existingInvoice.items && existingInvoice.items.length > 0) {
            setItems(existingInvoice.items.map((item: any, idx: number) => ({
              key: `edit_${item._id || idx}_${Date.now()}`,
              type: item.type || "product",
              productId: item.productId?._id || item.productId || undefined,
              variantId: item.variantId || undefined,
              description: item.description || item.productId?.name || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              purchasePrice: item.purchasePrice || 0,
              hasVariant: !!item.variantId,
              discountAmount: item.discountAmount || 0,
              discountReason: item.discountReason || "",
              showDiscount: (item.discountAmount || 0) > 0,
            })));
          }

          // Exchange items
          if (existingInvoice.exchangeItems && existingInvoice.exchangeItems.length > 0) {
            setExchangeItems(existingInvoice.exchangeItems.map((ei: any, idx: number) => ({
              key: `ex_edit_${ei._id || idx}_${Date.now()}`,
              type: "product" as const,
              productId: ei.productId || undefined,
              variantId: ei.variantId || undefined,
              description: ei.description || "",
              quantity: ei.quantity || 1,
              unitPrice: ei.price || 0,
              purchasePrice: 0,
              hasVariant: !!ei.variantId,
            })));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [editingId]);

  // ── Computed totals ──

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [items],
  );

  const totalItemDiscounts = useMemo(
    () => items.reduce((s, i) => s + (i.discountAmount || 0), 0),
    [items],
  );

  const invoiceDiscount = useMemo(
    () => (invoiceDiscountEnabled ? parseFloat(invoiceDiscountAmount) || 0 : 0),
    [invoiceDiscountEnabled, invoiceDiscountAmount],
  );

  const subtotalAfterDiscounts = useMemo(
    () => Math.max(0, subtotal - totalItemDiscounts - invoiceDiscount),
    [subtotal, totalItemDiscounts, invoiceDiscount],
  );

  const taxAmount = useMemo(
    () => (showTax ? subtotalAfterDiscounts * (parseFloat(taxRate) || 0) / 100 : 0),
    [subtotalAfterDiscounts, showTax, taxRate],
  );

  const total = useMemo(() => subtotalAfterDiscounts + taxAmount, [subtotalAfterDiscounts, taxAmount]);

  // Sync payment amount to total when payment is first enabled
  useEffect(() => {
    if (paymentEnabled && paymentAmount === "") {
      setPaymentAmount(total.toString());
    }
  }, [paymentEnabled, total]);

  // ── Autosave draft ──

  const buildDraftBody = useCallback((): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      type: invoiceType,
      status: "brouillon",
      date: invoiceDate,
      dueDate: dueDate || undefined,
      items: items.map((i) => ({
        type: i.type,
        productId: i.productId,
        variantId: i.variantId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        purchasePrice: i.purchasePrice,
        discountAmount: i.discountAmount || 0,
        discountReason: i.discountReason || "",
        total: i.unitPrice * i.quantity - (i.discountAmount || 0),
      })),
      subtotal,
      discountAmount: invoiceDiscount,
      discountReason: invoiceDiscountReason || "",
      showTax,
      taxRate: showTax ? parseFloat(taxRate) : 0,
      taxAmount,
      total,
      payment: {
        enabled: paymentEnabled,
        amount: paymentEnabled ? parseFloat(paymentAmount) : 0,
        method: paymentEnabled ? paymentMethod : undefined,
        date: paymentEnabled ? paymentDate : undefined,
      },
      warranty: {
        enabled: warrantyEnabled,
        duration: warrantyEnabled ? warrantyDuration : undefined,
        description: warrantyEnabled ? warrantyText : undefined,
      },
      notes: notes || undefined,
      lastEditedOn: "mobile",
      exchangeItems: invoiceType === "echange" ? exchangeItems.map((i) => ({
        description: i.description,
        productId: i.productId,
        variantId: i.variantId,
        price: i.unitPrice,
        quantity: i.quantity,
        addToStock: true,
      })) : undefined,
    };
    if (invoiceType !== "vente_flash" && selectedClient) {
      body.client = selectedClient._id;
    }
    return body;
  }, [invoiceType, invoiceDate, dueDate, items, subtotal, invoiceDiscount,
    invoiceDiscountReason, showTax, taxRate, taxAmount, total,
    paymentEnabled, paymentAmount, paymentMethod, paymentDate,
    warrantyEnabled, warrantyDuration, warrantyText, notes,
    exchangeItems, selectedClient]);

  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (items.length === 0 && exchangeItems.length === 0) return;
      if (saving || isAutosaving.current) return;
      isAutosaving.current = true;
      try {
        const body = buildDraftBody();
        const url = draftId ? `/api/invoices/${draftId}` : "/api/invoices";
        const method = draftId ? "PUT" : "POST";
        const res = await apiFetch(url, { method, body: JSON.stringify(body) });
        if (res.ok) {
          const data = await res.json();
          if (!draftId) setDraftId(data._id || data.id);
          setDraftSavedAt(new Date());
        }
      } catch { /* silent */ }
      finally { isAutosaving.current = false; }
    }, 3000);
  }, [items, exchangeItems, saving, draftId, buildDraftBody]);

  // Trigger autosave when relevant form state changes
  useEffect(() => {
    triggerAutosave();
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [items, exchangeItems, selectedClient, invoiceType, notes, invoiceDate,
    dueDate, showTax, taxRate, paymentEnabled, paymentAmount, warrantyEnabled,
    invoiceDiscountEnabled, invoiceDiscountAmount, triggerAutosave]);

  // Sync full form state for cross-device
  useEffect(() => {
    if (editingId || items.length === 0) return;
    saveDraft({
      invoiceType, clientId: selectedClient?._id, items, exchangeItems, notes,
      showTax, taxRate, paymentEnabled, paymentAmount, paymentMethod,
      warrantyEnabled, warrantyDuration, warrantyDescription: warrantyText,
    });
  }, [editingId, saveDraft, invoiceType, selectedClient, items, exchangeItems, notes,
    showTax, taxRate, paymentEnabled, paymentAmount, paymentMethod,
    warrantyEnabled, warrantyDuration, warrantyText]);

  // ── Item helpers ──

  function addProduct(product: Product) {
    const hasVariants =
      product.variants && product.variants.filter((v) => !v.sold).length > 0;

    if (!hasVariants) {
      setItems((prev) => [
        ...prev,
        {
          key: `${product._id}_${Date.now()}`,
          type: "product",
          productId: product._id,
          description: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice ?? 0,
          purchasePrice: product.purchasePrice ?? 0,
          hasVariant: false,
          discountAmount: 0,
          discountReason: "",
          showDiscount: false,
        },
      ]);
      setShowProductPicker(false);
      setProductSearch("");
    }
    // If product has variants, they are shown inline and handled by addVariant
  }

  function addVariant(
    product: Product,
    variant: { _id: string; serialNumber?: string; price?: number | null },
  ) {
    setItems((prev) => [
      ...prev,
      {
        key: `${product._id}_${variant._id}_${Date.now()}`,
        type: "product",
        productId: product._id,
        variantId: variant._id,
        description: `${product.name} - ${variant.serialNumber}`,
        quantity: 1,
        unitPrice: variant.price ?? product.sellingPrice ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        hasVariant: true,
        discountAmount: 0,
        discountReason: "",
        showDiscount: false,
      },
    ]);
    setShowProductPicker(false);
    setProductSearch("");
  }

  function handleBarcodeScan(data: string) {
    setShowScanner(false);
    const q = data.toLowerCase();
    // Search across all products
    for (const product of products) {
      if (product.barcode?.toLowerCase() === q) { addProduct(product); return; }
      for (const v of (product.variants || [])) {
        if (!v.sold && (v.barcode?.toLowerCase() === q || v.serialNumber?.toLowerCase() === q)) {
          addVariant(product, v); return;
        }
      }
    }
    setProductSearch(data);
    setShowProductPicker(true);
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
        purchasePrice: 0,
        hasVariant: false,
        discountAmount: 0,
        discountReason: "",
        showDiscount: false,
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItemQty(key: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  }

  function updateItemPrice(key: string, price: string) {
    const num = parseFloat(price) || 0;
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, unitPrice: num } : i)),
    );
  }

  function updateItemDescription(key: string, desc: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, description: desc } : i)),
    );
  }

  function toggleItemDiscount(key: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, showDiscount: !i.showDiscount, discountAmount: !i.showDiscount ? i.discountAmount : 0, discountReason: !i.showDiscount ? i.discountReason : "" } : i)),
    );
  }

  function updateItemDiscount(key: string, amount: string) {
    const num = parseFloat(amount) || 0;
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, discountAmount: num } : i)),
    );
  }

  function updateItemDiscountReason(key: string, reason: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, discountReason: reason } : i)),
    );
  }

  // ── Exchange item helpers ──

  function addExchangeProduct(product: Product) {
    setExchangeItems((prev) => [
      ...prev,
      {
        key: `ex_${product._id}_${Date.now()}`,
        type: "product",
        productId: product._id,
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        hasVariant: false,
        discountAmount: 0, discountReason: "", showDiscount: false,
      },
    ]);
    setShowExchangeProductPicker(false);
    setExchangeProductSearch("");
  }

  function addExchangeVariant(
    product: Product,
    variant: { _id: string; serialNumber?: string; price?: number | null },
  ) {
    setExchangeItems((prev) => [
      ...prev,
      {
        key: `ex_${product._id}_${variant._id}_${Date.now()}`,
        type: "product",
        productId: product._id,
        variantId: variant._id,
        description: `${product.name} - ${variant.serialNumber}`,
        quantity: 1,
        unitPrice: variant.price ?? product.sellingPrice ?? 0,
        purchasePrice: product.purchasePrice ?? 0,
        hasVariant: true,
        discountAmount: 0, discountReason: "", showDiscount: false,
      },
    ]);
    setShowExchangeProductPicker(false);
    setExchangeProductSearch("");
  }

  function addExchangeManual() {
    setExchangeItems((prev) => [
      ...prev,
      {
        key: `ex_manual_${Date.now()}`,
        type: "product",
        description: "",
        quantity: 1,
        unitPrice: 0,
        purchasePrice: 0,
        hasVariant: false,
        discountAmount: 0, discountReason: "", showDiscount: false,
      },
    ]);
  }

  function removeExchangeItem(key: string) {
    setExchangeItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateExchangeItemDesc(key: string, desc: string) {
    setExchangeItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, description: desc } : i)),
    );
  }

  function updateExchangeItemPrice(key: string, price: string) {
    const num = parseFloat(price) || 0;
    setExchangeItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, unitPrice: num } : i)),
    );
  }

  // ── Filtered lists ──

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()),
      )
    : clients.slice(0, 10);

  const filteredProducts = useMemo(() => {
    const list = productSearch.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()),
        )
      : products.slice(0, 10);
    return list;
  }, [products, productSearch]);

  const filteredExchangeProducts = useMemo(() => {
    const list = exchangeProductSearch.trim()
      ? products.filter((p) =>
          p.name.toLowerCase().includes(exchangeProductSearch.toLowerCase()),
        )
      : products.slice(0, 10);
    return list;
  }, [products, exchangeProductSearch]);

  // ── Submit ──

  async function handleSubmit() {
    if (invoiceType !== "vente_flash" && !selectedClient) {
      showAlert("Client requis", "Veuillez selectionner un client.");
      return;
    }
    if (items.length === 0) {
      showAlert("Articles requis", "Ajoutez au moins un article.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: invoiceType,
        date: invoiceDate,
        dueDate: dueDate || undefined,
        items: items.map((i) => ({
          type: i.type,
          productId: i.productId,
          variantId: i.variantId,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          purchasePrice: i.purchasePrice,
          discountAmount: i.discountAmount || 0,
          discountReason: i.discountReason || "",
          total: i.unitPrice * i.quantity - (i.discountAmount || 0),
        })),
        subtotal,
        discountAmount: invoiceDiscount,
        discountReason: invoiceDiscountReason || "",
        showTax,
        taxRate: showTax ? parseFloat(taxRate) : 0,
        taxAmount,
        total,
        payment: {
          enabled: paymentEnabled,
          amount: paymentEnabled ? parseFloat(paymentAmount) : 0,
          method: paymentEnabled ? paymentMethod : undefined,
          date: paymentEnabled ? paymentDate : undefined,
        },
        warranty: {
          enabled: warrantyEnabled,
          duration: warrantyEnabled ? warrantyDuration : undefined,
          description: warrantyEnabled ? warrantyText : undefined,
        },
        notes: notes || undefined,
        lastEditedOn: "mobile",
        exchangeItems: invoiceType === "echange" ? exchangeItems.map((i) => ({
          description: i.description,
          productId: i.productId,
          variantId: i.variantId,
          price: i.unitPrice,
          quantity: i.quantity,
          addToStock: true,
        })) : undefined,
      };

      if (invoiceType !== "vente_flash" && selectedClient) {
        body.client = selectedClient._id;
      }

      // Use draftId if we have one from autosave, otherwise editingId
      const invoiceIdToUse = editingId || draftId;
      const url = invoiceIdToUse ? `/api/invoices/${invoiceIdToUse}` : "/api/invoices";
      const method = invoiceIdToUse ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        clearDraft();
        nav.goBack();
      } else {
        const err = await res.json().catch(() => null);
        showAlert("Erreur", err?.error || "Impossible de creer la facture");
      }
    } catch {
      showAlert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ──

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Chip helper ──

  function Chip({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? colors.primary : colors.card,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: selected ? colors.primaryForeground : colors.text },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Render ──

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ═══ Cross-device draft banner ═══ */}
      <DraftBanner drafts={otherDrafts} onResume={resumeFromOtherDevice} />

      {/* ═══ Draft autosave indicator ═══ */}
      {draftSavedAt && (
        <View style={styles.draftBanner}>
          <Text style={[styles.draftBannerText, { color: colors.textMuted }]}>
            Brouillon sauvegarde a {draftSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      )}

      {/* ═══ 1. Invoice Type ═══ */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Type de document
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
      >
        {INVOICE_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={invoiceType === t.value}
            onPress={() => setInvoiceType(t.value)}
          />
        ))}
      </ScrollView>

      {/* ═══ 2. Invoice Date ═══ */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Date de facture
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        value={invoiceDate}
        onChangeText={setInvoiceDate}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={colors.placeholder}
      />

      {/* ═══ 3. Client Selection ═══ */}
      {invoiceType !== "vente_flash" && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            Client
          </Text>
          {selectedClient ? (
            <View
              style={[
                styles.selectedClient,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <User size={18} color={colors.primary} />
              <Text
                style={[styles.selectedClientName, { color: colors.text }]}
              >
                {selectedClient.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedClient(null);
                  setShowClientPicker(true);
                }}
              >
                <Text style={[styles.changeLink, { color: colors.primary }]}>
                  Changer
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                  },
                ]}
              >
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
                  style={[
                    styles.pickerRow,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => {
                    setSelectedClient(c);
                    setShowClientPicker(false);
                  }}
                >
                  <Text style={[styles.pickerText, { color: colors.text }]}>
                    {c.name}
                  </Text>
                  {c.phone && (
                    <Text
                      style={[styles.pickerSub, { color: colors.textDimmed }]}
                    >
                      {c.phone}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* ═══ 4. Due Date ═══ */}
      <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.lg }]}>
        Echeance (optionnel)
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={colors.placeholder}
      />

      {/* ═══ 5. Articles Section ═══ */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Articles ({items.length})
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowProductPicker(true)}
          >
            <Plus size={14} color={colors.primaryForeground} />
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              Article
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={addService}
          >
            <Briefcase size={14} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              Service
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product search picker */}
      {showProductPicker && (
        <View
          style={[
            styles.pickerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Ajouter un article</Text>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={() => setShowScanner(true)}>
                <Barcode size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowProductPicker(false); setProductSearch(""); }}>
                <Trash2 size={16} color={colors.textDimmed} />
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
            ]}
          >
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
          {filteredProducts.map((p) => {
            const unsoldVariants = (p.variants || []).filter((v) => !v.sold);
            const hasVariants = unsoldVariants.length > 0;

            if (hasVariants) {
              // Show each unsold variant as a separate selectable row
              return unsoldVariants.map((v) => (
                <TouchableOpacity
                  key={`${p._id}_${v._id}`}
                  style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                  onPress={() => addVariant(p, v)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerText, { color: colors.text }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.pickerSub, { color: colors.textDimmed }]}>
                      {v.serialNumber}
                      {v.condition ? ` - ${v.condition}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.pickerPrice, { color: colors.primary }]}>
                    {(v.price ?? p.sellingPrice ?? 0).toLocaleString("fr-FR")} FCFA
                  </Text>
                </TouchableOpacity>
              ));
            }

            // Simple product without variants
            return (
              <TouchableOpacity
                key={p._id}
                style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                onPress={() => addProduct(p)}
              >
                <Text style={[styles.pickerText, { color: colors.text }]}>
                  {p.name}
                </Text>
                <Text style={[styles.pickerPrice, { color: colors.primary }]}>
                  {(p.sellingPrice ?? 0).toLocaleString("fr-FR")} FCFA
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Item rows */}
      {items.map((item) => (
        <View
          key={item.key}
          style={[
            styles.itemRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            {item.type === "service" ? (
              <TextInput
                style={[styles.serviceDescInput, { color: colors.text, borderColor: colors.inputBorder }]}
                value={item.description}
                onChangeText={(t) => updateItemDescription(item.key, t)}
                placeholder="Description du service"
                placeholderTextColor={colors.placeholder}
              />
            ) : (
              <Text
                style={[styles.itemName, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}

            {/* Editable unit price */}
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textDimmed }]}>
                Prix:
              </Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text, borderColor: colors.inputBorder }]}
                value={item.unitPrice.toString()}
                onChangeText={(t) => updateItemPrice(item.key, t)}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={[styles.priceCurrency, { color: colors.textDimmed }]}>
                FCFA
              </Text>
            </View>

            <Text style={[styles.itemTotal, { color: colors.textMuted }]}>
              Total: {(item.quantity * item.unitPrice - (item.discountAmount || 0)).toLocaleString("fr-FR")} FCFA
            </Text>

            {/* Discount toggle */}
            <TouchableOpacity
              onPress={() => toggleItemDiscount(item.key)}
              style={{ marginTop: spacing.xs }}
            >
              <Text style={{ color: colors.primary, fontSize: fontSize.xs }}>
                {item.showDiscount ? "- Masquer la reduction" : "+ Ajouter une reduction"}
              </Text>
            </TouchableOpacity>

            {/* Discount fields */}
            {item.showDiscount && (
              <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.warning }]}>Reduction:</Text>
                  <TextInput
                    style={[styles.priceInput, { color: colors.warning, borderColor: colors.warning }]}
                    value={item.discountAmount ? item.discountAmount.toString() : ""}
                    onChangeText={(t) => updateItemDiscount(item.key, t)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                  />
                  <Text style={[styles.priceCurrency, { color: colors.warning }]}>FCFA</Text>
                </View>
                <TextInput
                  style={{ color: colors.text, fontSize: fontSize.xs, borderBottomWidth: 1, borderColor: colors.inputBorder, paddingVertical: 2 }}
                  value={item.discountReason}
                  onChangeText={(t) => updateItemDiscountReason(item.key, t)}
                  placeholder="Motif de la reduction"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            )}
          </View>

          <View style={styles.itemActions}>
            {/* Quantity controls: locked to 1 for variants */}
            {item.hasVariant ? (
              <Text style={[styles.qtyText, { color: colors.text }]}>1</Text>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => updateItemQty(item.key, item.quantity - 1)}
                >
                  <Text style={[styles.qtyBtn, { color: colors.primary }]}>
                    -
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>
                  {item.quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => updateItemQty(item.key, item.quantity + 1)}
                >
                  <Text style={[styles.qtyBtn, { color: colors.primary }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => removeItem(item.key)}
              style={{ marginLeft: spacing.sm }}
            >
              <Trash2 size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* ═══ 5b. Exchange Items (only for "echange" type) ═══ */}
      {invoiceType === "echange" && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Produits echanges ({exchangeItems.length})
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowExchangeProductPicker(true)}
              >
                <Plus size={14} color={colors.primaryForeground} />
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                  Produit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                onPress={addExchangeManual}
              >
                <Plus size={14} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>
                  Manuel
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Exchange product picker */}
          {showExchangeProductPicker && (
            <View
              style={[
                styles.pickerCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Produit a echanger</Text>
                <TouchableOpacity onPress={() => { setShowExchangeProductPicker(false); setExchangeProductSearch(""); }}>
                  <Trash2 size={16} color={colors.textDimmed} />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                ]}
              >
                <Search size={16} color={colors.textDimmed} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  value={exchangeProductSearch}
                  onChangeText={setExchangeProductSearch}
                  placeholder="Rechercher un produit..."
                  placeholderTextColor={colors.placeholder}
                  autoFocus
                />
              </View>
              {filteredExchangeProducts.map((p) => {
                const variants = (p.variants || []);
                if (variants.length > 0) {
                  return variants.map((v) => (
                    <TouchableOpacity
                      key={`ex_${p._id}_${v._id}`}
                      style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                      onPress={() => addExchangeVariant(p, v)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerText, { color: colors.text }]}>{p.name}</Text>
                        <Text style={[styles.pickerSub, { color: colors.textDimmed }]}>{v.serialNumber}</Text>
                      </View>
                      <Text style={[styles.pickerPrice, { color: colors.primary }]}>
                        {(v.price ?? p.sellingPrice ?? 0).toLocaleString("fr-FR")} FCFA
                      </Text>
                    </TouchableOpacity>
                  ));
                }
                return (
                  <TouchableOpacity
                    key={`ex_${p._id}`}
                    style={[styles.pickerRow, { borderBottomColor: colors.border }]}
                    onPress={() => addExchangeProduct(p)}
                  >
                    <Text style={[styles.pickerText, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.pickerPrice, { color: colors.primary }]}>
                      {(p.sellingPrice ?? 0).toLocaleString("fr-FR")} FCFA
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Exchange item rows */}
          {exchangeItems.map((item) => (
            <View
              key={item.key}
              style={[
                styles.itemRow,
                { backgroundColor: colors.card, borderColor: colors.warning },
              ]}
            >
              <View style={{ flex: 1 }}>
                {item.productId ? (
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : (
                  <TextInput
                    style={[styles.serviceDescInput, { color: colors.text, borderColor: colors.inputBorder }]}
                    value={item.description}
                    onChangeText={(t) => updateExchangeItemDesc(item.key, t)}
                    placeholder="Description du produit echange"
                    placeholderTextColor={colors.placeholder}
                  />
                )}
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.textDimmed }]}>Valeur:</Text>
                  <TextInput
                    style={[styles.priceInput, { color: colors.text, borderColor: colors.inputBorder }]}
                    value={item.unitPrice.toString()}
                    onChangeText={(t) => updateExchangeItemPrice(item.key, t)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={[styles.priceCurrency, { color: colors.textDimmed }]}>FCFA</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeExchangeItem(item.key)}
                style={{ marginLeft: spacing.sm, paddingTop: spacing.sm }}
              >
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* ═══ 5c. Invoice-level Discount ═══ */}
      <View style={[styles.switchRow, { marginTop: spacing.xl }]}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>
          Reduction sur la facture
        </Text>
        <Switch
          value={invoiceDiscountEnabled}
          onValueChange={setInvoiceDiscountEnabled}
          trackColor={{ false: colors.border, true: colors.warning }}
          thumbColor={invoiceDiscountEnabled ? "#fff" : colors.card}
        />
      </View>
      {invoiceDiscountEnabled && (
        <View style={styles.indented}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Montant de la reduction (FCFA)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, width: 160 }]}
            value={invoiceDiscountAmount}
            onChangeText={setInvoiceDiscountAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Motif
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            value={invoiceDiscountReason}
            onChangeText={setInvoiceDiscountReason}
            placeholder="Motif de la reduction"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      )}

      {/* ═══ 6. Tax Section ═══ */}
      <View style={[styles.switchRow, { marginTop: spacing.xl }]}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>
          Appliquer la TVA
        </Text>
        <Switch
          value={showTax}
          onValueChange={setShowTax}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={showTax ? colors.primaryForeground : colors.card}
        />
      </View>
      {showTax && (
        <View style={styles.indented}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Taux TVA (%)
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, width: 100 }]}
            value={taxRate}
            onChangeText={setTaxRate}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
      )}

      {/* ═══ 7. Payment Section ═══ */}
      <View style={[styles.switchRow, { marginTop: spacing.lg }]}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>
          Enregistrer un paiement
        </Text>
        <Switch
          value={paymentEnabled}
          onValueChange={setPaymentEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={paymentEnabled ? colors.primaryForeground : colors.card}
        />
      </View>
      {paymentEnabled && (
        <View style={styles.indented}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Montant
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            placeholder={total.toString()}
            placeholderTextColor={colors.placeholder}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Mode de paiement
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {PAYMENT_METHODS.map((m) => (
              <Chip
                key={m.value}
                label={m.label}
                selected={paymentMethod === m.value}
                onPress={() => setPaymentMethod(m.value)}
              />
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Date du paiement
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
            value={paymentDate}
            onChangeText={setPaymentDate}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      )}

      {/* ═══ 8. Warranty Section ═══ */}
      <View style={[styles.switchRow, { marginTop: spacing.lg }]}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>
          Garantie
        </Text>
        <Switch
          value={warrantyEnabled}
          onValueChange={setWarrantyEnabled}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={warrantyEnabled ? colors.primaryForeground : colors.card}
        />
      </View>
      {warrantyEnabled && (
        <View style={styles.indented}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Duree
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {WARRANTY_DURATIONS.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={warrantyDuration === d}
                onPress={() => setWarrantyDuration(d)}
              />
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Conditions
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
            ]}
            value={warrantyText}
            onChangeText={setWarrantyText}
            placeholder="Conditions de garantie..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
          />
        </View>
      )}

      {/* ═══ 9. Notes ═══ */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Notes
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.multilineInput,
          { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes ou commentaires..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={3}
      />

      {/* ═══ 10. Totals Card ═══ */}
      {items.length > 0 && (
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.card, borderColor: colors.primary },
          ]}
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Sous-total
            </Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>
              {subtotal.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
          {totalItemDiscounts > 0 && (
            <View style={[styles.totalRow, { marginTop: spacing.xs }]}>
              <Text style={[styles.totalLabel, { color: colors.warning }]}>
                Reductions articles
              </Text>
              <Text style={[styles.totalValue, { color: colors.warning }]}>
                -{totalItemDiscounts.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          )}
          {invoiceDiscount > 0 && (
            <View style={[styles.totalRow, { marginTop: spacing.xs }]}>
              <Text style={[styles.totalLabel, { color: colors.warning }]}>
                Reduction facture
              </Text>
              <Text style={[styles.totalValue, { color: colors.warning }]}>
                -{invoiceDiscount.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          )}
          {showTax && (
            <View style={[styles.totalRow, { marginTop: spacing.xs }]}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>
                TVA ({taxRate}%)
              </Text>
              <Text style={[styles.totalValue, { color: colors.textMuted }]}>
                {taxAmount.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          )}
          <View
            style={[
              styles.totalRow,
              {
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.totalLabel,
                { color: colors.primary, fontWeight: "700", fontSize: fontSize.lg },
              ]}
            >
              Total
            </Text>
            <Text
              style={[
                styles.totalValue,
                { color: colors.primary, fontWeight: "700", fontSize: fontSize.lg },
              ]}
            >
              {total.toLocaleString("fr-FR")} FCFA
            </Text>
          </View>
        </View>
      )}

      {/* ═══ 11. Submit ═══ */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: colors.primary },
          saving && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <Text
            style={[styles.submitText, { color: colors.primaryForeground }]}
          >
            {editingId ? "Modifier la facture" : "Creer la facture"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>

    <BarcodeScanner
      visible={showScanner}
      onClose={() => setShowScanner(false)}
      onScanned={handleBarcodeScan}
      title="Scanner un produit"
    />
    </View>
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full ?? 999,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  chipText: {
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
  pickerCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickerTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
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
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  serviceDescInput: {
    fontSize: fontSize.sm,
    borderBottomWidth: 1,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  priceLabel: {
    fontSize: fontSize.xs,
  },
  priceInput: {
    fontSize: fontSize.sm,
    borderBottomWidth: 1,
    paddingVertical: 2,
    minWidth: 60,
    textAlign: "right",
  },
  priceCurrency: {
    fontSize: fontSize.xs,
  },
  itemTotal: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginLeft: spacing.sm,
    paddingTop: spacing.sm,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  indented: {
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
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
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: fontSize.md,
    fontWeight: "600",
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
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  draftBannerText: {
    fontSize: fontSize.xs,
    fontStyle: "italic",
  },
});
