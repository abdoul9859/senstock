import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon, ChevronsUpDown, Check, Plus, Trash2, Search,
  Barcode, X, RotateCcw, Upload, Package, ShieldCheck, FileText,
  CreditCard, StickyNote, PenTool, Users, ArrowLeft, ArrowLeftRight, Zap, Info, GripVertical, Percent, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useDraftSync } from "@/hooks/useDraftSync";
import { DraftBanner } from "@/components/DraftBanner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";

// ---- Types ----

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Variant {
  _id: string;
  serialNumber: string;
  barcode: string;
  condition: string;
  sold: boolean;
  price?: number;
  labelId?: string;
  label?: { id: string; name: string; color: string } | null;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  category: { _id: string; name: string; hasVariants: boolean } | null;
  purchasePrice?: number;
  costPrice?: number;
  sellingPrice?: number;
  quantity: number;
  archived: boolean;
  variants: Variant[];
}

type InvoiceType = "facture" | "proforma" | "avoir" | "echange" | "vente_flash";

interface ExchangeItemForm {
  id: string;
  description: string;
  productId: string;
  variantId: string;
  variantLabel: string;
  price: string;
  quantity: string;
  notes: string;
  addToStock: boolean;
  labelId: string;
}

interface ProductLabel {
  id: string;
  name: string;
  color: string;
}
type PaymentMethod = "especes" | "mobile_money" | "virement" | "cheque" | "carte" | "autre";

interface InvoiceItemForm {
  id: string;
  type: "product" | "service" | "section";
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  description: string;
  quantity: string;
  unitPrice: string;
  externalPrice: string;
  purchasePrice: string;
  discountAmount: string;
  discountReason: string;
}

// ---- Helpers ----

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatFCFA(n?: number): string {
  if (n == null) return "";
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

function getLineTotal(item: InvoiceItemForm): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discountAmount) || 0;
  return Math.max(0, qty * price - discount);
}

function getProfit(item: InvoiceItemForm): number {
  const qty = parseFloat(item.quantity) || 0;
  const selling = parseFloat(item.unitPrice) || 0;
  const purchase = parseFloat(item.purchasePrice) || 0;
  return qty * (selling - purchase);
}

// ---- Component ----

const NouvelleFacturePage = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const [editLoaded, setEditLoaded] = useState(false);

  // ---- Draft sync ----
  const { otherDrafts, saveDraft, clearDraft, loadOtherDraft } = useDraftSync({
    type: "invoice",
    enabled: !isEditMode,
  });

  function resumeFromOtherDevice() {
    const data = loadOtherDraft();
    if (!data) return;
    if (data.invoiceType) setInvoiceType(data.invoiceType as InvoiceType);
    if (data.clientId) setClientId(data.clientId as string);
    if (data.items && Array.isArray(data.items)) setItems(data.items as InvoiceItemForm[]);
    if (data.exchangeItems && Array.isArray(data.exchangeItems)) setExchangeItems(data.exchangeItems as ExchangeItemForm[]);
    if (data.notes) setNotes(data.notes as string);
    if (data.showTax !== undefined) setShowTax(data.showTax as boolean);
    if (data.taxRate) setTaxRate(data.taxRate as string);
    if (data.paymentEnabled !== undefined) setPaymentEnabled(data.paymentEnabled as boolean);
    if (data.paymentAmount) setPaymentAmount(data.paymentAmount as string);
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod as PaymentMethod);
    if (data.warrantyEnabled !== undefined) setWarrantyEnabled(data.warrantyEnabled as boolean);
    if (data.warrantyDuration) setWarrantyDuration(data.warrantyDuration as string);
    if (data.warrantyDescription) setWarrantyDescription(data.warrantyDescription as string);
    if (data.globalDiscountAmount) setGlobalDiscountAmount(data.globalDiscountAmount as string);
    if (data.globalDiscountReason) setGlobalDiscountReason(data.globalDiscountReason as string);
    toast.success("Brouillon repris depuis l'autre appareil");
  }

  // ---- Form state ----
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("facture");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d;
  });
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<InvoiceItemForm[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItemForm[]>([]);
  const [showTax, setShowTax] = useState(false);
  const [taxRate, setTaxRate] = useState("18");
  const [showItemPrices, setShowItemPrices] = useState(true);
  const [showSectionTotals, setShowSectionTotals] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("especes");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [warrantyEnabled, setWarrantyEnabled] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyDescription, setWarrantyDescription] = useState("");
  const [globalDiscountAmount, setGlobalDiscountAmount] = useState("");
  const [globalDiscountReason, setGlobalDiscountReason] = useState("");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");

  // ---- Data ----
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableLabels, setAvailableLabels] = useState<ProductLabel[]>([]);

  // ---- UI state ----
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [clientSaving, setClientSaving] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [quickProductOpen, setQuickProductOpen] = useState(false);
  const [quickProductForm, setQuickProductForm] = useState({ name: "", categoryId: "", sellingPrice: "", purchasePrice: "", quantity: "1" });
  const [quickProductSaving, setQuickProductSaving] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string; hasVariants: boolean }[]>([]);
  const [exchangeSearchOpen, setExchangeSearchOpen] = useState(false);
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [dueDatePopoverOpen, setDueDatePopoverOpen] = useState(false);
  const [paymentDatePopoverOpen, setPaymentDatePopoverOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureFileRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // ---- Fetch data ----

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients", { headers: getHeaders() });
      if (res.ok) setClients(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { headers: getHeaders() });
      if (res.ok) setProducts(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchNextNumber = useCallback(async (type: InvoiceType) => {
    try {
      const res = await fetch(`/api/invoices/next-number?type=${type}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvoiceNumber(data.number);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    if (!isEditMode) fetchNextNumber("facture");
    fetch("/api/product-labels", { headers: getHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setAvailableLabels)
      .catch(() => {});
    fetch("/api/categories", { headers: getHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
      .catch(() => {});
  }, [fetchClients, fetchProducts, fetchNextNumber, isEditMode]);

  // ---- Load existing invoice for edit mode ----
  useEffect(() => {
    if (!editId || editLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${editId}`, { headers: getHeaders() });
        if (!res.ok) { toast.error("Facture introuvable"); navigate("/commerce/factures"); return; }
        const inv = await res.json();
        setInvoiceType(inv.type || "facture");
        setInvoiceNumber(inv.number || "");
        setInvoiceDate(new Date(inv.date));
        setDueDate(inv.dueDate ? new Date(inv.dueDate) : undefined);
        setClientId(inv.client?._id || "");
        setShowTax(inv.showTax ?? false);
        setTaxRate(String(inv.taxRate ?? 18));
        setShowItemPrices(inv.showItemPrices ?? true);
        setShowSectionTotals(inv.showSectionTotals ?? false);
        setGlobalDiscountAmount(inv.discountAmount ? String(inv.discountAmount) : "");
        setGlobalDiscountReason(inv.discountReason || "");
        setNotes(inv.notes || "");
        setSignature(inv.signature || "");
        if (inv.payment?.enabled) {
          setPaymentEnabled(true);
          setPaymentAmount(String(inv.payment.amount || ""));
          setPaymentMethod(inv.payment.method || "especes");
          if (inv.payment.date) setPaymentDate(new Date(inv.payment.date));
        }
        if (inv.warranty?.enabled) {
          setWarrantyEnabled(true);
          setWarrantyDuration(inv.warranty.duration || "");
          setWarrantyDescription(inv.warranty.description || "");
        }
        // Map items
        const mappedItems: InvoiceItemForm[] = (inv.items || []).map((it: any) => ({
          id: crypto.randomUUID(),
          type: it.type || "product",
          productId: it.productId?._id || it.productId || "",
          variantId: it.variantId || "",
          productName: it.productId
            ? [it.productId.name, it.productId.brand, it.productId.model].filter(Boolean).join(" ")
            : "",
          variantLabel: it.variantId || "",
          description: it.description || "",
          quantity: String(it.quantity ?? 1),
          unitPrice: String(it.unitPrice ?? 0),
          externalPrice: it.externalPrice != null ? String(it.externalPrice) : "",
          purchasePrice: String(it.purchasePrice ?? 0),
          discountAmount: it.discountAmount ? String(it.discountAmount) : "",
          discountReason: it.discountReason || "",
        }));
        setItems(mappedItems);
        // Map exchange items
        if (inv.exchangeItems?.length) {
          setExchangeItems(inv.exchangeItems.map((ei: any) => ({
            id: crypto.randomUUID(),
            description: ei.description || "",
            productId: ei.productId || "",
            variantId: ei.variantId || "",
            variantLabel: ei.variantLabel || "",
            price: String(ei.price ?? 0),
            quantity: String(ei.quantity ?? 1),
            notes: ei.notes || "",
            addToStock: ei.addToStock ?? false,
            labelId: ei.labelId || "",
          })));
        }
        setEditLoaded(true);
      } catch {
        toast.error("Erreur de chargement");
      }
    })();
  }, [editId, editLoaded, navigate]);

  function handleTypeChange(type: InvoiceType) {
    setInvoiceType(type);
    fetchNextNumber(type);
  }

  // ---- Totals ----

  const subtotal = useMemo(() => {
    return items
      .filter((i) => i.type !== "section")
      .reduce((sum, i) => sum + getLineTotal(i), 0);
  }, [items]);

  const globalDiscount = useMemo(() => parseFloat(globalDiscountAmount) || 0, [globalDiscountAmount]);

  const taxAmount = useMemo(() => {
    const taxableAmount = Math.max(0, subtotal - globalDiscount);
    return showTax ? taxableAmount * (parseFloat(taxRate) || 0) / 100 : 0;
  }, [subtotal, globalDiscount, showTax, taxRate]);

  const total = Math.max(0, subtotal - globalDiscount + taxAmount);

  // ---- Item management ----

  function addProductVariant(product: Product, variant: Variant) {
    // Check if already added
    if (items.some((i) => i.variantId === String(variant._id))) {
      toast.error("Cette variante est deja dans la facture");
      return;
    }
    const newItem: InvoiceItemForm = {
      id: crypto.randomUUID(),
      type: "product",
      productId: product._id,
      variantId: String(variant._id),
      productName: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      variantLabel: variant.serialNumber,
      description: "",
      quantity: "1",
      unitPrice: String(variant.price || product.sellingPrice || 0),
      externalPrice: "",
      purchasePrice: String(product.purchasePrice || 0),
      discountAmount: "",
      discountReason: "",
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`${variant.serialNumber} ajoute`);
  }

  function addSimpleProduct(product: Product) {
    const newItem: InvoiceItemForm = {
      id: crypto.randomUUID(),
      type: "product",
      productId: product._id,
      variantId: "",
      productName: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      variantLabel: "",
      description: "",
      quantity: "1",
      unitPrice: String(product.sellingPrice || 0),
      externalPrice: "",
      purchasePrice: String(product.purchasePrice || 0),
      discountAmount: "",
      discountReason: "",
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`${product.name} ajoute`);
  }

  function addServiceLine() {
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "service",
      productId: "",
      variantId: "",
      productName: "",
      variantLabel: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
      externalPrice: "",
      purchasePrice: "0",
      discountAmount: "",
      discountReason: "",
    }]);
  }

  function addSection() {
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "section",
      productId: "",
      variantId: "",
      productName: "",
      variantLabel: "",
      description: "",
      quantity: "0",
      unitPrice: "0",
      externalPrice: "",
      purchasePrice: "0",
      discountAmount: "",
      discountReason: "",
    }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, patch: Partial<InvoiceItemForm>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // ---- Drag and drop ----
  function handleDragStart(e: React.DragEvent, index: number) {
    // Don't start drag from input/textarea fields
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      e.preventDefault();
      return;
    }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // Make the drag ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // ---- Exchange item management ----

  function addExchangeProduct(product: Product, variant: Variant) {
    if (exchangeItems.some((i) => i.variantId === String(variant._id))) {
      toast.error("Cette variante est deja dans les echanges");
      return;
    }
    setExchangeItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      description: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      productId: product._id,
      variantId: String(variant._id),
      variantLabel: variant.serialNumber,
      price: String(variant.price || product.sellingPrice || 0),
      quantity: "1",
      notes: "",
      addToStock: true,
      labelId: variant.labelId || "",
    }]);
    toast.success(`Echange: ${variant.serialNumber} ajoute`);
  }

  function addExchangeManual() {
    setExchangeItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      description: "",
      productId: "",
      variantId: "",
      variantLabel: "",
      price: "0",
      quantity: "1",
      notes: "",
      addToStock: false,
      labelId: "",
    }]);
  }

  function removeExchangeItem(id: string) {
    setExchangeItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateExchangeItem(id: string, patch: Partial<ExchangeItemForm>) {
    setExchangeItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  const filteredExchangeProducts = useMemo(() => {
    if (!exchangeSearchQuery.trim()) return products.filter((p) => !p.archived);
    const q = exchangeSearchQuery.toLowerCase();
    return products.filter((p) => {
      if (p.archived) return false;
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.brand?.toLowerCase().includes(q)) return true;
      for (const v of p.variants) {
        if (v.serialNumber.toLowerCase().includes(q)) return true;
        if (v.barcode?.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [products, exchangeSearchQuery]);

  // ---- Barcode scan ----

  function handleBarcodeScan(barcode: string) {
    if (!barcode) return;
    const isAvoir = invoiceType === "avoir";
    for (const product of products) {
      for (const variant of product.variants) {
        const match = variant.barcode === barcode || variant.serialNumber === barcode;
        // For avoir: find sold variants (being returned). For others: find unsold variants.
        if (match && (isAvoir ? variant.sold : !variant.sold)) {
          addProductVariant(product, variant);
          setBarcodeInput("");
          return;
        }
      }
    }
    toast.error(isAvoir
      ? `Aucun produit vendu trouve pour "${barcode}"`
      : `Aucun produit disponible pour "${barcode}"`
    );
    setBarcodeInput("");
  }

  // ---- Product search filter ----

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products.filter((p) => !p.archived);
    const q = productSearchQuery.toLowerCase();
    return products.filter((p) => {
      if (p.archived) return false;
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.brand?.toLowerCase().includes(q)) return true;
      if (p.model?.toLowerCase().includes(q)) return true;
      for (const v of p.variants) {
        if (v.serialNumber.toLowerCase().includes(q)) return true;
        if (v.barcode?.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [products, productSearchQuery]);

  // ---- Client quick-create ----

  async function handleCreateClient() {
    if (!clientForm.name.trim()) return;
    setClientSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(clientForm),
      });
      if (res.ok) {
        const newClient = await res.json();
        setClients((prev) => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
        setClientId(newClient._id);
        setClientDialogOpen(false);
        setClientForm({ name: "", phone: "", email: "", address: "" });
        toast.success("Client cree");
      }
    } catch { /* ignore */ }
    setClientSaving(false);
  }

  // ---- Quick product creation ----

  async function handleQuickCreateProduct() {
    if (!quickProductForm.name.trim()) { toast.error("Le nom est requis"); return; }
    if (!quickProductForm.categoryId) { toast.error("La catégorie est requise"); return; }
    setQuickProductSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: quickProductForm.name.trim(),
          category: quickProductForm.categoryId,
          sellingPrice: parseFloat(quickProductForm.sellingPrice) || 0,
          purchasePrice: parseFloat(quickProductForm.purchasePrice) || 0,
          quantity: parseInt(quickProductForm.quantity) || 1,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erreur"); }
      const newProduct = await res.json();
      setProducts((prev) => [newProduct, ...prev]);
      // Auto-add to invoice
      addSimpleProduct(newProduct);
      setQuickProductOpen(false);
      setProductSearchOpen(false);
      setQuickProductForm({ name: "", categoryId: "", sellingPrice: "", purchasePrice: "", quantity: "1" });
      toast.success(`"${newProduct.name}" créé et ajouté`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la création");
    }
    setQuickProductSaving(false);
  }

  // ---- Signature canvas ----

  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function getTouchCoords(e: React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function startDrawingTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getTouchCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getTouchCoords(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() { setIsDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function saveSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignature(canvas.toDataURL("image/png"));
    toast.success("Signature enregistree");
  }

  function handleSignatureImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignature(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ---- Autosave draft ----

  const triggerAutosave = useCallback(() => {
    if (isEditMode) return; // Don't autosave when editing existing invoice
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (items.length === 0 && exchangeItems.length === 0) return;
      try {
        const payload = {
          type: invoiceType, client: clientId || undefined,
          date: invoiceDate?.toISOString(), dueDate: dueDate?.toISOString(),
          items: items.map((i, idx) => ({
            type: i.type, productId: i.productId || undefined, variantId: i.variantId || undefined,
            description: i.description, quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0, purchasePrice: parseFloat(i.purchasePrice) || 0,
            discountAmount: parseFloat(i.discountAmount) || 0, discountReason: i.discountReason,
            total: getLineTotal(i), sortOrder: idx,
          })),
          subtotal: 0, total: 0, notes, lastEditedOn: "web",
        };
        const url = draftId ? `/api/invoices/${draftId}` : "/api/invoices";
        const method = draftId ? "PUT" : "POST";
        if (!draftId) payload.number = invoiceNumber || `DRAFT-${Date.now()}`;
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
        if (res.ok) {
          const data = await res.json();
          if (!draftId) setDraftId(data._id || data.id);
          setDraftSavedAt(new Date());
        }
      } catch { /* silent */ }
    }, 2000);
  }, [isEditMode, items, exchangeItems, invoiceType, clientId, invoiceDate, dueDate, notes, draftId, invoiceNumber]);

  // Trigger autosave when relevant state changes
  useEffect(() => {
    triggerAutosave();
  }, [items, exchangeItems, clientId, invoiceType, notes, triggerAutosave]);

  // Sync full form state for cross-device
  useEffect(() => {
    if (isEditMode || items.length === 0) return;
    saveDraft({
      invoiceType, clientId, items, exchangeItems, notes,
      showTax, taxRate, paymentEnabled, paymentAmount, paymentMethod: paymentMethod,
      warrantyEnabled, warrantyDuration, warrantyDescription,
      globalDiscountAmount, globalDiscountReason,
    });
  }, [isEditMode, saveDraft, invoiceType, clientId, items, exchangeItems, notes,
    showTax, taxRate, paymentEnabled, paymentAmount, paymentMethod,
    warrantyEnabled, warrantyDuration, warrantyDescription,
    globalDiscountAmount, globalDiscountReason]);

  // ---- Save ----

  async function handleSave() {
    const productItems = items.filter((i) => i.type !== "section");
    if (productItems.length === 0) {
      setError("Ajoutez au moins un article ou service");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body = {
        type: invoiceType,
        client: clientId || undefined,
        date: invoiceDate.toISOString(),
        dueDate: dueDate?.toISOString(),
        items: items.map((i) => ({
          type: i.type,
          productId: i.productId || undefined,
          variantId: i.variantId || undefined,
          description: i.variantLabel || i.description,
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          externalPrice: i.externalPrice ? parseFloat(i.externalPrice) : undefined,
          purchasePrice: parseFloat(i.purchasePrice) || 0,
          discountAmount: parseFloat(i.discountAmount) || 0,
          discountReason: i.discountReason || "",
          total: getLineTotal(i),
        })),
        subtotal,
        discountAmount: globalDiscount,
        discountReason: globalDiscountReason,
        showTax,
        taxRate: parseFloat(taxRate) || 18,
        taxAmount,
        total,
        showItemPrices,
        showSectionTotals,
        payment: {
          enabled: paymentEnabled,
          amount: paymentEnabled ? (parseFloat(paymentAmount) || total) : 0,
          method: paymentMethod,
          date: paymentEnabled ? paymentDate.toISOString() : undefined,
        },
        warranty: {
          enabled: warrantyEnabled,
          duration: warrantyDuration,
          description: warrantyDescription,
        },
        notes,
        signature,
        exchangeItems: invoiceType === "echange" ? exchangeItems.map((ei) => ({
          description: ei.description,
          productId: ei.productId || undefined,
          variantId: ei.variantId || undefined,
          variantLabel: ei.variantLabel,
          price: parseFloat(ei.price) || 0,
          quantity: parseFloat(ei.quantity) || 1,
          notes: ei.notes,
          addToStock: ei.addToStock,
          labelId: ei.labelId || undefined,
        })) : [],
      };

      const url = isEditMode ? `/api/invoices/${editId}` : "/api/invoices";
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la sauvegarde");
        return;
      }
      toast.success(isEditMode ? `Facture ${data.number} modifiee` : `Facture ${data.number} creee`);
      clearDraft();
      navigate("/commerce/factures");
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ---- Selected client display ----
  const selectedClient = clients.find((c) => c._id === clientId);

  // ---- Render ----

  return (
    <div className="pb-24 animate-fade-in">
      {/* Draft sync banner */}
      <DraftBanner drafts={otherDrafts} onResume={resumeFromOtherDevice} className="mb-4" />

      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/factures")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{isEditMode ? "Modifier la facture" : "Nouvelle Facture"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? `Modification de ${invoiceNumber}` : "Creer une facture, un proforma ou un avoir"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4">

        {/* Card 1: En-tete */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              En-tete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type de facture</Label>
                <Select value={invoiceType} onValueChange={(v) => handleTypeChange(v as InvoiceType)} disabled={isEditMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facture">Facture normale</SelectItem>
                    <SelectItem value="proforma">Facture proforma</SelectItem>
                    <SelectItem value="echange">Facture d'echange</SelectItem>
                    <SelectItem value="vente_flash">Vente flash</SelectItem>
                    <SelectItem value="avoir">Avoir (credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Numero</Label>
                <Input value={invoiceNumber} disabled className="font-mono bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Date de facture</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(invoiceDate, "dd MMMM yyyy", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={invoiceDate} onSelect={(d) => { if (d) setInvoiceDate(d); setDatePopoverOpen(false); }} locale={fr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Client — hidden for vente_flash */}
        {invoiceType !== "vente_flash" ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <div className="flex items-center gap-2">
                    <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal h-9">
                          {selectedClient ? selectedClient.name : "Rechercher un client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Nom, telephone..." />
                          <CommandList>
                            <CommandEmpty>Aucun client trouve</CommandEmpty>
                            <CommandGroup>
                              {clients.map((c) => (
                                <CommandItem
                                  key={c._id}
                                  value={`${c.name} ${c.phone}`}
                                  onSelect={() => { setClientId(c._id); setClientPopoverOpen(false); }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", clientId === c._id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium">{c.name}</span>
                                    {c.phone && <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={() => setClientDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Nouveau
                    </Button>
                  </div>
                  {selectedClient && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {[selectedClient.phone, selectedClient.email].filter(Boolean).join(" · ") || "Aucune info"}
                      </Badge>
                      <button onClick={() => setClientId("")} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Date d'echeance</Label>
                  <Popover open={dueDatePopoverOpen} onOpenChange={setDueDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "dd MMMM yyyy", { locale: fr }) : "Aucune"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={(d) => { setDueDate(d); setDueDatePopoverOpen(false); }} locale={fr} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <div>
                  <h3 className="text-sm font-medium">Vente flash</h3>
                  <p className="text-xs text-muted-foreground">Vente rapide sans client — pas de suivi client requis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card: Produits echanges (only for type "echange") */}
        {invoiceType === "echange" && (
          <Card className="border-blue-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                  Produits echanges (recus du client)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setExchangeSearchQuery(""); setExchangeSearchOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Produit echange
                  </Button>
                  <Button variant="ghost" size="sm" onClick={addExchangeManual}>
                    <Plus className="h-4 w-4 mr-1" /> Ligne libre
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-blue-500/5 border border-blue-500/10 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Les produits que le client vous donne en echange. Si "Ajouter au stock" est active, le produit sera remis en stock.
                </p>
              </div>

              {exchangeItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucun produit echange. Ajoutez les produits recus du client.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[200px]">Produit</TableHead>
                        <TableHead className="w-[130px]">Variante/IMEI</TableHead>
                        <TableHead className="w-[100px] text-right">Prix</TableHead>
                        <TableHead className="w-[70px] text-center">Qte</TableHead>
                        <TableHead className="w-[150px]">Notes</TableHead>
                        <TableHead className="w-[120px]">Étiquette</TableHead>
                        <TableHead className="w-[100px] text-center">Au stock</TableHead>
                        <TableHead className="w-[44px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exchangeItems.map((ei) => (
                        <TableRow key={ei.id}>
                          <TableCell>
                            {ei.productId ? (
                              <span className="text-sm font-medium truncate block">{ei.description}</span>
                            ) : (
                              <Input
                                value={ei.description}
                                onChange={(e) => updateExchangeItem(ei.id, { description: e.target.value })}
                                placeholder="Description..."
                                className="h-8 text-sm"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {ei.variantLabel ? (
                              <span className="font-mono text-xs text-muted-foreground">{ei.variantLabel}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={ei.price}
                              onChange={(e) => updateExchangeItem(ei.id, { price: e.target.value })}
                              className="h-8 w-24 text-right text-sm ml-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={ei.quantity}
                              onChange={(e) => updateExchangeItem(ei.id, { quantity: e.target.value })}
                              className="h-8 w-14 text-center text-sm mx-auto"
                              disabled={!!ei.variantId}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={ei.notes}
                              onChange={(e) => updateExchangeItem(ei.id, { notes: e.target.value })}
                              placeholder="Note..."
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            {availableLabels.length > 0 && (
                              <select
                                value={ei.labelId}
                                onChange={(e) => updateExchangeItem(ei.id, { labelId: e.target.value })}
                                className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="">— Aucune —</option>
                                {availableLabels.map((lbl) => (
                                  <option key={lbl.id} value={lbl.id}>{lbl.name}</option>
                                ))}
                              </select>
                            )}
                            {availableLabels.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={ei.addToStock}
                              onCheckedChange={(v) => updateExchangeItem(ei.id, { addToStock: v })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExchangeItem(ei.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card 3: Articles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeInputRef}
                  placeholder="Scanner code-barres ou IMEI..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeScan(barcodeInput.trim()); }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => { setProductSearchQuery(""); setProductSearchOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Article
              </Button>
              <Button variant="outline" size="sm" onClick={addServiceLine}>
                <Plus className="h-4 w-4 mr-1" /> Service
              </Button>
              <Button variant="ghost" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" /> Section
              </Button>
            </div>

            {/* Line items */}
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Aucun article. Scannez un code-barres ou ajoutez un article.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[32px]" />
                      <TableHead className="w-[200px]">Produit</TableHead>
                      <TableHead className="w-[140px]">Variante/IMEI</TableHead>
                      <TableHead className="w-[70px] text-center">Qte</TableHead>
                      <TableHead className="w-[120px] text-right">Prix unitaire</TableHead>
                      <TableHead className="w-[110px] text-right">Benefice</TableHead>
                      <TableHead className="w-[110px] text-right">Total</TableHead>
                      <TableHead className="w-[44px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) =>
                      item.type === "section" ? (
                        <TableRow
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={cn(
                            "bg-muted/20 hover:bg-muted/30 animate-list-item",
                            dragOverIndex === idx && dragIndex !== idx && "border-t-2 border-t-primary"
                          )}
                        >
                          <TableCell className="w-[32px] px-1">
                            <div className="cursor-grab active:cursor-grabbing flex items-center justify-center">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </TableCell>
                          <TableCell colSpan={7} className="py-1.5">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Titre de la section..."
                              className="border-0 bg-transparent font-semibold text-sm h-8 p-0 focus-visible:ring-0 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        <React.Fragment key={item.id}>
                        <TableRow
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className={cn(
                            "animate-list-item",
                            dragOverIndex === idx && dragIndex !== idx && "border-t-2 border-t-primary"
                          )}
                        >
                          <TableCell className="w-[32px] px-1">
                            <div className="cursor-grab active:cursor-grabbing flex items-center justify-center">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.type === "product" ? (
                              <span className="text-sm font-medium truncate block">{item.productName}</span>
                            ) : (
                              <Input
                                value={item.description}
                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                placeholder="Description du service..."
                                className="h-8 text-sm"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {item.variantLabel ? (
                              <span className="font-mono text-xs text-muted-foreground">{item.variantLabel}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                              className="h-8 w-16 text-center text-sm mx-auto"
                              disabled={item.type === "product" && !!item.variantId}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, { unitPrice: e.target.value })}
                              className="h-8 w-28 text-right text-sm ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "text-sm font-mono",
                              getProfit(item) >= 0 ? "text-emerald-500" : "text-destructive"
                            )}>
                              {item.purchasePrice !== "0" ? formatFCFA(getProfit(item)) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatFCFA(getLineTotal(item))}
                            {(parseFloat(item.discountAmount) || 0) > 0 && (
                              <span className="block text-[10px] text-destructive">-{formatFCFA(parseFloat(item.discountAmount))}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", (parseFloat(item.discountAmount) || 0) > 0 && "text-destructive")}
                                onClick={() => updateItem(item.id, { discountAmount: item.discountAmount ? "" : "0", discountReason: item.discountReason })}
                                title="Reduction"
                              >
                                <Percent className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {item.discountAmount !== "" && (
                          <TableRow className="bg-destructive/5 border-0">
                            <TableCell />
                            <TableCell colSpan={4} className="py-1.5">
                              <div className="flex items-center gap-2">
                                <Percent className="h-3.5 w-3.5 text-destructive shrink-0" />
                                <Input
                                  value={item.discountReason}
                                  onChange={(e) => updateItem(item.id, { discountReason: e.target.value })}
                                  placeholder="Motif de la reduction..."
                                  className="h-7 text-xs flex-1"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-1.5">
                              <span className="text-xs text-muted-foreground">Reduction</span>
                            </TableCell>
                            <TableCell className="text-right py-1.5">
                              <Input
                                type="number"
                                min="0"
                                value={item.discountAmount}
                                onChange={(e) => updateItem(item.id, { discountAmount: e.target.value })}
                                placeholder="0"
                                className="h-7 w-24 text-right text-xs ml-auto text-destructive"
                              />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItem(item.id, { discountAmount: "", discountReason: "" })}>
                                <X className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                        </React.Fragment>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Resume & Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: display options */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-prices" className="text-sm cursor-pointer">Afficher prix par article</Label>
                  <Switch id="show-prices" checked={showItemPrices} onCheckedChange={setShowItemPrices} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-sections" className="text-sm cursor-pointer">Afficher total par section</Label>
                  <Switch id="show-sections" checked={showSectionTotals} onCheckedChange={setShowSectionTotals} />
                </div>
              </div>

              {/* Right: totals */}
              <div className="w-full md:w-80 space-y-3 md:border-l md:border-border md:pl-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatFCFA(subtotal)}</span>
                </div>

                {/* Reduction globale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setGlobalDiscountAmount(globalDiscountAmount ? "" : "0")}
                    >
                      <Percent className="h-3.5 w-3.5" />
                      <span>Reduction globale</span>
                    </button>
                    {globalDiscount > 0 && (
                      <span className="text-sm font-medium text-destructive">-{formatFCFA(globalDiscount)}</span>
                    )}
                  </div>
                  {globalDiscountAmount !== "" && (
                    <div className="space-y-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={globalDiscountAmount}
                          onChange={(e) => setGlobalDiscountAmount(e.target.value)}
                          placeholder="Montant"
                          className="h-7 w-28 text-right text-xs"
                        />
                        <span className="text-xs text-muted-foreground">{getEntrepotSettings().currency}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setGlobalDiscountAmount(""); setGlobalDiscountReason(""); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Input
                        value={globalDiscountReason}
                        onChange={(e) => setGlobalDiscountReason(e.target.value)}
                        placeholder="Motif de la reduction..."
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={showTax} onCheckedChange={setShowTax} />
                    <Label className="text-sm">TVA</Label>
                    {showTax && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          className="h-7 w-14 text-xs text-center"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>
                  {showTax && (
                    <span className="text-sm font-medium">{formatFCFA(taxAmount)}</span>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatFCFA(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Paiement */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium">Enregistrer un paiement</h3>
                  <p className="text-xs text-muted-foreground">Enregistrer un paiement lors de la creation</p>
                </div>
              </div>
              <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
            </div>
            {paymentEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={total.toLocaleString("fr-FR")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Methode</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Especes</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money (Wave/OM)</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="carte">Carte bancaire</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date du paiement</Label>
                  <Popover open={paymentDatePopoverOpen} onOpenChange={setPaymentDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(paymentDate, "dd/MM/yyyy", { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={paymentDate} onSelect={(d) => { if (d) setPaymentDate(d); setPaymentDatePopoverOpen(false); }} locale={fr} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 6: Garantie */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-medium">Garantie</h3>
                  <p className="text-xs text-muted-foreground">Inclure une garantie avec cette facture</p>
                </div>
              </div>
              <Switch checked={warrantyEnabled} onCheckedChange={setWarrantyEnabled} />
            </div>
            {warrantyEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>Duree</Label>
                  <Select value={warrantyDuration} onValueChange={setWarrantyDuration}>
                    <SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 mois">1 mois</SelectItem>
                      <SelectItem value="3 mois">3 mois</SelectItem>
                      <SelectItem value="6 mois">6 mois</SelectItem>
                      <SelectItem value="1 an">1 an</SelectItem>
                      <SelectItem value="2 ans">2 ans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conditions</Label>
                  <Textarea
                    value={warrantyDescription}
                    onChange={(e) => setWarrantyDescription(e.target.value)}
                    placeholder="Conditions de la garantie..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 7: Notes */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Notes</h3>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes supplementaires, conditions de paiement, remarques..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Card 8: Signature */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Signature</h3>
              <span className="text-xs text-muted-foreground ml-auto">PNG importe ou signature manuscrite</span>
            </div>
            {signature ? (
              <div className="relative inline-block">
                <img src={signature} alt="Signature" className="h-24 border border-border rounded-md p-2 bg-white" />
                <button
                  onClick={() => setSignature("")}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-2">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={150}
                      className="border border-border rounded-md cursor-crosshair bg-white w-full max-w-[400px]"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch}
                      onTouchMove={drawTouch}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={clearCanvas}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Effacer
                      </Button>
                      <Button variant="outline" size="sm" onClick={saveSignature}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Valider
                      </Button>
                      <Separator orientation="vertical" className="h-5" />
                      <Button variant="outline" size="sm" onClick={() => signatureFileRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Importer PNG
                      </Button>
                      <input ref={signatureFileRef} type="file" accept="image/png" className="hidden" onChange={handleSignatureImport} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/commerce/factures")}>
            Annuler
          </Button>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <div className="text-sm text-muted-foreground mr-2">
              Total: <span className="font-bold text-foreground">{formatFCFA(total)}</span>
            </div>
            {!isEditMode && draftSavedAt && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Brouillon sauvegardé {draftSavedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : isEditMode ? "Sauvegarder" : "Enregistrer la facture"}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog: Quick-create client */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Ajouter un client rapidement</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={clientForm.name}
                onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nom du client"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+221..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientForm.email}
                  onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input
                value={clientForm.address}
                onChange={(e) => setClientForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Adresse"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateClient} disabled={clientSaving || !clientForm.name.trim()}>
              {clientSaving ? "Enregistrement..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Quick product creation */}
      <Dialog open={quickProductOpen} onOpenChange={setQuickProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau produit rapide</DialogTitle>
            <DialogDescription>Créer un produit simple et l'ajouter à la facture</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input
                value={quickProductForm.name}
                onChange={(e) => setQuickProductForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nom du produit"
                autoFocus
              />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <select
                value={quickProductForm.categoryId}
                onChange={(e) => setQuickProductForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Choisir —</option>
                {categories.filter((c) => !c.hasVariants).map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix de vente</Label>
                <Input type="number" value={quickProductForm.sellingPrice}
                  onChange={(e) => setQuickProductForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label>Quantité</Label>
                <Input type="number" value={quickProductForm.quantity}
                  onChange={(e) => setQuickProductForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="1" min="1" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setQuickProductOpen(false)}>Annuler</Button>
            <Button onClick={handleQuickCreateProduct} disabled={quickProductSaving}>
              {quickProductSaving ? "Création..." : "Créer et ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Product search */}
      <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ajouter un article</DialogTitle>
            <DialogDescription>Recherchez un produit ou une variante</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, IMEI, code-barres..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 max-h-[50vh]">
            {filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucun produit trouve
              </div>
            ) : (
              filteredProducts.map((product) => {
                const hasVariants = product.category?.hasVariants;
                // For "avoir" (credit note), show SOLD variants (products being returned)
                // For normal invoices, show only available (unsold) variants
                const isAvoir = invoiceType === "avoir";
                const displayVariants = isAvoir
                  ? product.variants.filter((v) => v.sold)
                  : product.variants.filter((v) => !v.sold);
                const alreadyAddedIds = new Set(items.filter((i) => i.productId === product._id).map((i) => i.variantId));

                return (
                  <div key={product._id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[product.brand, product.model, product.category?.name].filter(Boolean).join(" · ")}
                          {product.sellingPrice != null && ` · ${formatFCFA(product.sellingPrice)}`}
                        </p>
                      </div>
                      {!hasVariants && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Qte: {product.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isAvoir && product.quantity <= 0}
                            onClick={() => { addSimpleProduct(product); setProductSearchOpen(false); }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> {isAvoir ? "Retour" : "Ajouter"}
                          </Button>
                        </div>
                      )}
                    </div>
                    {hasVariants && displayVariants.length > 0 && (
                      <div className="pl-12 space-y-1">
                        {displayVariants.map((v) => {
                          const added = alreadyAddedIds.has(String(v._id));
                          return (
                            <div key={v._id} className="flex items-center justify-between py-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{v.serialNumber}</span>
                                {v.barcode && <span className="text-muted-foreground">{v.barcode}</span>}
                                <Badge variant="secondary" className="text-[10px]">{v.condition}</Badge>
                                {isAvoir && v.sold && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">vendu</Badge>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{formatFCFA(v.price || product.sellingPrice)}</span>
                                <Button
                                  size="sm"
                                  variant={added ? "secondary" : "outline"}
                                  className="h-6 text-xs"
                                  disabled={added}
                                  onClick={() => addProductVariant(product, v)}
                                >
                                  {added ? "Ajoute" : isAvoir ? "Retour" : "Ajouter"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {hasVariants && displayVariants.length === 0 && (
                      <p className="pl-12 text-xs text-muted-foreground italic">
                        {isAvoir ? "Aucune variante vendue a retourner" : "Aucune variante disponible"}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-3 border-t mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => { setProductSearchOpen(false); setQuickProductOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" /> Créer un nouveau produit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Exchange product search */}
      <Dialog open={exchangeSearchOpen} onOpenChange={setExchangeSearchOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ajouter un produit echange</DialogTitle>
            <DialogDescription>Produit recu du client en echange</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, IMEI, code-barres..."
              value={exchangeSearchQuery}
              onChange={(e) => setExchangeSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 max-h-[50vh]">
            {filteredExchangeProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucun produit trouve</div>
            ) : (
              filteredExchangeProducts.map((product) => {
                const hasVariants = product.category?.hasVariants;
                // For exchange, we show ALL variants (including sold ones — client might be returning a previously sold item)
                const allVariants = product.variants;
                const alreadyIds = new Set(exchangeItems.filter((i) => i.productId === product._id).map((i) => i.variantId));

                return (
                  <div key={product._id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        <img src={product.image} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[product.brand, product.model, product.category?.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    {hasVariants && allVariants.length > 0 && (
                      <div className="pl-12 space-y-1">
                        {allVariants.map((v) => {
                          const added = alreadyIds.has(String(v._id));
                          return (
                            <div key={v._id} className="flex items-center justify-between py-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{v.serialNumber}</span>
                                <Badge variant="secondary" className="text-[10px]">{v.condition}</Badge>
                                {v.sold && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">vendu</Badge>}
                              </div>
                              <Button
                                size="sm"
                                variant={added ? "secondary" : "outline"}
                                className="h-6 text-xs"
                                disabled={added}
                                onClick={() => addExchangeProduct(product, v)}
                              >
                                {added ? "Ajoute" : "Ajouter"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NouvelleFacturePage;
