import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Package, Plus, Trash2, AlertTriangle, CircleX, ChevronDown, ChevronUp, Upload, ImageIcon, RotateCcw, LayoutGrid, List, Pencil, Eye, Dices, Search, X, Archive, ArchiveRestore, Truck, ChevronsUpDown, Check, Coins, Copy, Boxes, ExternalLink } from "lucide-react";
import { useDraftSync } from "@/hooks/useDraftSync";
import { DraftBanner } from "@/components/DraftBanner";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Pagination } from "@/components/Pagination";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

// ---- Types ----

interface Attribute {
  name: string;
  type: "text" | "number" | "select";
  options: string[];
  required: boolean;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  hasVariants: boolean;
  attributes: Attribute[];
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface Variant {
  _id?: string;
  serialNumber: string;
  barcode: string;
  condition: "neuf" | "venant" | "occasion";
  sold: boolean;
  soldInvoiceId?: string;
  soldInvoiceNumber?: string;
  price?: number;
  supplier?: Supplier | null;
  labelId?: string;
  label?: ProductLabel | null;
  attributes?: Record<string, unknown>;
}

interface ProductLabel {
  id: string;
  name: string;
  color: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  category: Category | null;
  brand: string;
  model: string;
  purchasePrice?: number;
  costPrice?: number;
  sellingPrice?: number;
  supplier?: Supplier | null;
  notes: string;
  image: string;
  quantity: number;
  archived: boolean;
  attributes: Record<string, unknown>;
  variants: Variant[];
  labels?: { label: ProductLabel }[];
}

// ---- Helpers ----

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getStock(product: Product): number {
  if (product.category?.hasVariants) {
    return product.variants.filter((v) => !v.sold).length;
  }
  return product.quantity;
}

const _settings = getEntrepotSettings();

function getStockStatus(product: Product): "active" | "warning" | "inactive" {
  const stock = getStock(product);
  if (stock === 0) return "inactive";
  if (product.category?.hasVariants) {
    return stock < _settings.lowStockThresholdVariants ? "warning" : "active";
  }
  return stock < _settings.lowStockThresholdSimple ? "warning" : "active";
}

function formatPrice(n?: number): string {
  if (n == null) return "";
  return n.toLocaleString("fr-FR") + _settings.currency;
}

function getVariantCounts(product: Product) {
  const available = product.variants.filter((v) => !v.sold);
  return {
    neuf: available.filter((v) => v.condition === "neuf").length,
    venant: available.filter((v) => v.condition === "venant").length,
    occasion: available.filter((v) => v.condition === "occasion").length,
    sold: product.variants.filter((v) => v.sold).length,
  };
}

// ---- Form types ----

interface VariantForm {
  serialNumber: string;
  barcode: string;
  condition: "neuf" | "venant" | "occasion";
  sold: boolean;
  price: string;
  supplierId: string;
  labelId: string;
  attributes: Record<string, string>;
  showAttributes: boolean;
}

interface ProductForm {
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  model: string;
  purchasePrice: string;
  costPrice: string;
  sellingPrice: string;
  supplierId: string;
  notes: string;
  image: string;
  quantity: string;
  attributes: Record<string, string>;
  variants: VariantForm[];
}

function generateBarcode(): string {
  // Generate EAN-13 barcode: 12 random digits + 1 check digit
  const digits: number[] = [];
  for (let i = 0; i < 12; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  // EAN-13 check digit calculation
  const sum = digits.reduce(
    (acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3),
    0
  );
  const check = (10 - (sum % 10)) % 10;
  digits.push(check);
  return digits.join("");
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  categoryId: "",
  brand: "",
  model: "",
  purchasePrice: "",
  costPrice: "",
  sellingPrice: "",
  supplierId: "",
  notes: "",
  image: "",
  quantity: "0",
  attributes: {},
  variants: [],
};

// ---- Component ----

const InventairePage = () => {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierTarget, setSupplierTarget] = useState<"product" | number>("product");
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [variantSupplierPopoverOpen, setVariantSupplierPopoverOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateVariantIndices, setDuplicateVariantIndices] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("senstock_view") as "grid" | "list") || _settings.defaultView;
  });
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStock, setFilterStock] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [filterVariants, setFilterVariants] = useState(false);
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterBarcode, setFilterBarcode] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStockOnly, setFilterStockOnly] = useState(false);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<ProductLabel[]>([]);
  const [formLabels, setFormLabels] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [variantSearch, setVariantSearch] = useState("");
  const [variantFilterCondition, setVariantFilterCondition] = useState("all");
  const [variantFilterStatus, setVariantFilterStatus] = useState("all");
  const [variantAddCount, setVariantAddCount] = useState("1");
  // Bulk import
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCondition, setBulkCondition] = useState<"neuf" | "venant" | "occasion">("neuf");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [bulkAutoBarcode, setBulkAutoBarcode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFormRef = useRef<string>("");

  // Draft sync for product creation — with live auto-sync
  const applyRemoteData = useCallback((data: Record<string, unknown>) => {
    if (!dialogOpen || editingId) return; // Only auto-sync when creating (not editing)
    setForm({
      name: (data.name as string) || "",
      description: (data.description as string) || "",
      category: (data.category as string) || (data.categoryId as string) || "",
      brand: (data.brand as string) || "",
      model: (data.model as string) || "",
      purchasePrice: data.purchasePrice != null ? String(data.purchasePrice) : "",
      costPrice: data.costPrice != null ? String(data.costPrice) : "",
      sellingPrice: data.sellingPrice != null ? String(data.sellingPrice) : "",
      supplier: (data.supplier as string) || (data.supplierId as string) || "",
      notes: (data.notes as string) || "",
      image: (data.image as string) || (data.imageUrl as string) || "",
      quantity: data.quantity != null ? String(data.quantity) : "0",
      attributes: (data.attributes as Record<string, string>) || {},
      variants: Array.isArray(data.variants) ? data.variants as any[] : [],
    });
    if (data.labelIds) setFormLabels(data.labelIds as string[]);
    else if (data.productLabelIds) setFormLabels(data.productLabelIds as string[]);
  }, [dialogOpen, editingId]);

  const { otherDrafts, saveDraft, clearDraft, loadOtherDraft } = useDraftSync({
    type: "product",
    enabled: true,
    onRemoteUpdate: applyRemoteData,
  });

  // Auto-save draft when product form is open and data changes
  useEffect(() => {
    if (!dialogOpen || deleteConfirm || editingId) return;
    const { name, brand, model, description, categoryId, purchasePrice, costPrice, sellingPrice, supplierId, notes, quantity, image, attributes, variants } = form;
    // Only save if at least the name has content
    if (!name.trim()) return;
    saveDraft({ name, brand, model, description, categoryId, purchasePrice, costPrice, sellingPrice, supplierId, notes, quantity, image, attributes, variants, labelIds: formLabels });
  }, [dialogOpen, deleteConfirm, editingId, form, formLabels, saveDraft]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await fetch("/api/product-labels", { headers: getHeaders() });
      if (res.ok) setAvailableLabels(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
    fetchLabels();
  }, [fetchProducts, fetchCategories, fetchSuppliers, fetchLabels]);

  // Auto-open product view from ?product= query param (e.g. from invoice detail)
  useEffect(() => {
    const productId = searchParams.get("product");
    if (productId && products.length > 0 && !loading) {
      const found = products.find((p) => p._id === productId);
      if (found) {
        setViewProduct(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [products, loading, searchParams, setSearchParams]);

  // ---- Selected category in form ----
  const selectedCategory = categories.find((c) => c._id === form.categoryId) || null;

  // ---- Stat computations (exclude archived) ----
  const activeProducts = products.filter((p) => !p.archived);
  const totalModels = activeProducts.length;
  const totalQuantity = activeProducts.reduce((sum, p) => sum + getStock(p), 0);
  const lowStock = activeProducts.filter((p) => {
    const stock = getStock(p);
    if (stock === 0) return false;
    if (p.category?.hasVariants) return stock < _settings.lowStockThresholdVariants;
    return stock < _settings.lowStockThresholdSimple;
  }).length;
  const outOfStock = activeProducts.filter((p) => getStock(p) === 0).length;
  const archivedCount = products.filter((p) => p.archived).length;
  const stockValue = activeProducts.reduce((sum, p) => {
    const price = p.sellingPrice ?? 0;
    return sum + price * getStock(p);
  }, 0);

  // ---- Filtering ----
  const filteredProducts = products.filter((p) => {
    // Archived filter: by default hide archived
    if (!showArchived && p.archived) return false;
    // If showArchived is on, show ONLY archived
    if (showArchived && !p.archived) return false;

    // Search: match product name, brand, model, or variant serialNumber/barcode
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProduct =
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q);
      const matchVariant = p.variants.some(
        (v) =>
          v.serialNumber.toLowerCase().includes(q) ||
          v.barcode?.toLowerCase().includes(q)
      );
      if (!matchProduct && !matchVariant) return false;
    }
    // Category filter
    if (filterCategory !== "all" && p.category?._id !== filterCategory) return false;
    // Stock status filter
    if (filterStock !== "all") {
      const status = getStockStatus(p);
      if (filterStock === "in_stock" && status !== "active") return false;
      if (filterStock === "low" && status !== "warning") return false;
      if (filterStock === "out" && status !== "inactive") return false;
    }
    // Condition filter (only applies to products with variants)
    if (filterCondition !== "all" && p.category?.hasVariants) {
      const hasCondition = p.variants.some(
        (v) => !v.sold && v.condition === filterCondition
      );
      if (!hasCondition) return false;
    }
    // Variants only filter
    if (filterVariants && !p.category?.hasVariants) return false;
    // Price range filters (on sellingPrice)
    if (filterPriceMin) {
      const min = parseFloat(filterPriceMin);
      if (!isNaN(min) && (p.sellingPrice == null || p.sellingPrice < min)) return false;
    }
    if (filterPriceMax) {
      const max = parseFloat(filterPriceMax);
      if (!isNaN(max) && (p.sellingPrice == null || p.sellingPrice > max)) return false;
    }
    // Supplier filter
    if (filterSupplier !== "all") {
      const matchSupplier = p.supplier?._id === filterSupplier ||
        p.variants?.some((v: any) => v.supplier?._id === filterSupplier);
      if (!matchSupplier) return false;
    }
    // Brand filter
    if (filterBrand.trim()) {
      if (!p.brand?.toLowerCase().includes(filterBrand.toLowerCase())) return false;
    }
    // Model filter
    if (filterModel.trim()) {
      if (!p.model?.toLowerCase().includes(filterModel.toLowerCase())) return false;
    }
    // Barcode filter
    if (filterBarcode !== "all") {
      if (filterBarcode === "with") {
        const hasBarcode = p.category?.hasVariants
          ? p.variants.some((v) => v.barcode && v.barcode.trim())
          : false;
        if (!hasBarcode) return false;
      }
      if (filterBarcode === "without") {
        if (p.category?.hasVariants) {
          const allHaveBarcode = p.variants.every((v) => v.barcode && v.barcode.trim());
          if (allHaveBarcode) return false;
        }
      }
    }
    // Stock only filter
    if (filterStockOnly) {
      const stock = getStock(p);
      if (stock === 0) return false;
    }
    // Labels filter
    if (filterLabels.length > 0) {
      const productLabelIds = (p.labels || []).map((l) => l.label.id);
      const hasMatch = filterLabels.some((lid) => productLabelIds.includes(lid));
      if (!hasMatch) return false;
    }
    return true;
  });

  const hasActiveFilters = search || filterCategory !== "all" || filterStock !== "all" || filterCondition !== "all" || filterVariants || filterPriceMin || filterPriceMax || filterBrand || filterModel || filterBarcode !== "all" || filterSupplier !== "all" || filterStockOnly || showArchived || filterLabels.length > 0;

  function clearFilters() {
    setSearch("");
    setFilterCategory("all");
    setFilterStock("all");
    setFilterCondition("all");
    setFilterVariants(false);
    setFilterPriceMin("");
    setFilterPriceMax("");
    setFilterBrand("");
    setFilterModel("");
    setFilterBarcode("all");
    setFilterSupplier("all");
    setFilterStockOnly(false);
    setShowArchived(false);
    setFilterLabels([]);
    setPage(1);
  }

  // ---- Archive actions ----
  async function toggleArchive(productId: string) {
    try {
      const res = await fetch(`/api/products/${productId}/archive`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch {
      /* silently fail */
    }
  }

  async function archiveSold() {
    setArchiving(true);
    try {
      const res = await fetch("/api/products/archive-sold", {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch {
      /* silently fail */
    } finally {
      setArchiving(false);
    }
  }

  // ---- Dialog open helpers ----
  function resetVariantFilters() {
    setVariantSearch("");
    setVariantFilterCondition("all");
    setVariantFilterStatus("all");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormLabels([]);
    initialFormRef.current = JSON.stringify(emptyForm);
    setError("");
    setDuplicateVariantIndices(new Set());
    setDeleteConfirm(false);
    resetVariantFilters();
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product._id);
    const attrs: Record<string, string> = {};
    if (product.attributes) {
      const attrObj =
        product.attributes instanceof Map
          ? Object.fromEntries(product.attributes)
          : product.attributes;
      for (const [key, val] of Object.entries(attrObj)) {
        attrs[key] = String(val ?? "");
      }
    }
    const editForm: ProductForm = {
      name: product.name,
      description: product.description || "",
      categoryId: product.category?._id || "",
      brand: product.brand || "",
      model: product.model || "",
      purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : "",
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      sellingPrice: product.sellingPrice != null ? String(product.sellingPrice) : "",
      supplierId: product.supplier?._id || "",
      notes: product.notes || "",
      image: product.image || "",
      quantity: String(product.quantity || 0),
      attributes: attrs,
      variants: product.variants.map((v) => {
        const vAttrs: Record<string, string> = {};
        if (v.attributes) {
          const vAttrObj =
            v.attributes instanceof Map
              ? Object.fromEntries(v.attributes as Map<string, unknown>)
              : v.attributes;
          for (const [key, val] of Object.entries(vAttrObj)) {
            vAttrs[key] = String(val ?? "");
          }
        }
        return {
          serialNumber: v.serialNumber,
          barcode: v.barcode || "",
          condition: v.condition || "neuf",
          sold: v.sold || false,
          price: v.price != null ? String(v.price) : "",
          supplierId: v.supplier?._id || "",
          labelId: v.labelId || "",
          attributes: vAttrs,
          showAttributes: false,
        };
      }),
    };
    setForm(editForm);
    setFormLabels((product.labels || []).map((l) => l.label.id));
    initialFormRef.current = JSON.stringify(editForm);
    setError("");
    setDuplicateVariantIndices(new Set());
    setDeleteConfirm(false);
    resetVariantFilters();
    setDialogOpen(true);
  }

  function openDuplicate(product: Product) {
    setEditingId(null);
    const attrs: Record<string, string> = {};
    if (product.attributes) {
      const attrObj =
        product.attributes instanceof Map
          ? Object.fromEntries(product.attributes)
          : product.attributes;
      for (const [key, val] of Object.entries(attrObj)) {
        attrs[key] = String(val ?? "");
      }
    }
    const dupeForm: ProductForm = {
      name: `${product.name} (copie)`,
      description: product.description || "",
      categoryId: product.category?._id || "",
      brand: product.brand || "",
      model: product.model || "",
      purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : "",
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      sellingPrice: product.sellingPrice != null ? String(product.sellingPrice) : "",
      supplierId: product.supplier?._id || "",
      notes: product.notes || "",
      image: product.image || "",
      quantity: product.category?.hasVariants ? "0" : String(product.quantity || 0),
      attributes: attrs,
      variants: [],
    };
    setForm(dupeForm);
    initialFormRef.current = JSON.stringify(dupeForm);
    setError("");
    setDuplicateVariantIndices(new Set());
    setDeleteConfirm(false);
    resetVariantFilters();
    setDialogOpen(true);
  }

  // ---- Unsaved changes detection ----
  function hasFormChanged(): boolean {
    const strip = (_key: string, val: unknown) => _key === "showAttributes" ? undefined : val;
    const current = JSON.stringify(form, strip);
    const initial = JSON.stringify(JSON.parse(initialFormRef.current || "{}"), strip);
    return current !== initial;
  }

  function tryCloseDialog() {
    if (hasFormChanged()) {
      setConfirmCloseOpen(true);
    } else {
      clearDraft();
      setDialogOpen(false);
    }
  }

  function forceCloseDialog() {
    clearDraft();
    setConfirmCloseOpen(false);
    setDialogOpen(false);
  }

  // ---- Filtered form variants (keeps original index for updates) ----
  const filteredFormVariants = form.variants
    .map((variant, originalIndex) => ({ variant, originalIndex }))
    .filter(({ variant }) => {
      if (variantSearch.trim()) {
        const q = variantSearch.toLowerCase();
        if (
          !variant.serialNumber.toLowerCase().includes(q) &&
          !variant.barcode.toLowerCase().includes(q)
        )
          return false;
      }
      if (variantFilterCondition !== "all" && variant.condition !== variantFilterCondition)
        return false;
      if (variantFilterStatus === "available" && variant.sold) return false;
      if (variantFilterStatus === "sold" && !variant.sold) return false;
      return true;
    });

  const hasActiveVariantFilters =
    variantSearch || variantFilterCondition !== "all" || variantFilterStatus !== "all";

  // ---- Image upload ----
  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, image: data.url }));
      } else {
        setError("Erreur lors de l'upload de l'image");
      }
    } catch {
      setError("Impossible d'uploader l'image");
    } finally {
      setUploading(false);
    }
  }

  // ---- CRUD ----
  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom est requis");
      return;
    }
    if (!form.categoryId) {
      setError("La categorie est requise");
      return;
    }

    // Validate required attributes
    if (selectedCategory) {
      for (const attr of selectedCategory.attributes) {
        if (attr.required) {
          const val = form.attributes[attr.name];
          if (!val || !String(val).trim()) {
            setError(`L'attribut "${attr.name}" est requis`);
            return;
          }
        }
      }
    }

    // Validate variants serial numbers
    if (selectedCategory?.hasVariants) {
      for (let i = 0; i < form.variants.length; i++) {
        if (!form.variants[i].serialNumber.trim()) {
          setError(`Le numero de serie de la variante ${i + 1} est requis`);
          return;
        }
      }
      // Check for duplicate serial numbers, barcodes, or cross-field matches
      const allValues = new Map<string, number[]>();
      form.variants.forEach((v, i) => {
        const sn = v.serialNumber.trim().toLowerCase();
        if (sn) {
          if (!allValues.has(sn)) allValues.set(sn, []);
          allValues.get(sn)!.push(i);
        }
        const bc = v.barcode.trim().toLowerCase();
        if (bc) {
          if (!allValues.has(bc)) allValues.set(bc, []);
          if (!allValues.get(bc)!.includes(i)) allValues.get(bc)!.push(i);
        }
      });
      const dupes = new Set<number>();
      for (const indices of allValues.values()) {
        if (indices.length > 1) indices.forEach((i) => dupes.add(i));
      }
      if (dupes.size > 0) {
        setDuplicateVariantIndices(dupes);
        setError("Des variantes ont des numeros de serie ou codes-barres en doublon");
        return;
      }
    }
    setDuplicateVariantIndices(new Set());

    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description,
        category: form.categoryId,
        brand: form.brand,
        model: form.model,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : null,
        supplier: form.supplierId || null,
        notes: form.notes,
        image: form.image,
        attributes: form.attributes,
        labelIds: formLabels,
      };

      if (selectedCategory?.hasVariants) {
        body.variants = form.variants.map((v) => {
          // Only send non-empty overridden attributes
          const overrides: Record<string, string> = {};
          for (const [k, val] of Object.entries(v.attributes)) {
            if (val && String(val).trim()) overrides[k] = String(val);
          }
          return {
            serialNumber: v.serialNumber,
            barcode: v.barcode || "",
            condition: v.condition,
            sold: v.sold,
            price: v.price ? parseFloat(v.price) : undefined,
            supplier: v.supplierId || undefined,
            labelId: v.labelId || undefined,
            attributes: Object.keys(overrides).length > 0 ? overrides : undefined,
          };
        });
        body.quantity = 0;
      } else {
        body.quantity = parseInt(form.quantity) || 0;
        body.variants = [];
      }

      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";
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
      clearDraft();
      setDialogOpen(false);
      fetchProducts();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${editingId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchProducts();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de la suppression");
      }
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // ---- Supplier quick-add ----
  function openAddSupplier(target: "product" | number) {
    setSupplierTarget(target);
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setSupplierDialogOpen(true);
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name.trim()) return;
    setSavingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(supplierForm),
      });
      if (res.ok) {
        const newSupplier = await res.json();
        await fetchSuppliers();
        // Auto-select the new supplier in the target field
        if (supplierTarget === "product") {
          setForm((f) => ({ ...f, supplierId: newSupplier._id }));
        } else {
          updateVariant(supplierTarget, { supplierId: newSupplier._id });
        }
        setSupplierDialogOpen(false);
        toast.success("Fournisseur ajouté");
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Erreur lors de la création du fournisseur");
      }
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setSavingSupplier(false);
    }
  }

  // ---- Variant helpers ----
  function addVariants(count = 1) {
    const newVariants = Array.from({ length: count }, () => ({
      serialNumber: "", barcode: "", condition: "neuf" as const, sold: false, price: "", supplierId: "", labelId: "", attributes: {} as Record<string, string>, showAttributes: false,
    }));
    setForm((f) => ({
      ...f,
      variants: [...f.variants, ...newVariants],
    }));
  }

  function updateVariant(index: number, updates: Partial<VariantForm>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...updates } : v)),
    }));
    if (("serialNumber" in updates || "barcode" in updates) && duplicateVariantIndices.size > 0) {
      setDuplicateVariantIndices(new Set());
    }
  }

  function removeVariant(index: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }));
    if (duplicateVariantIndices.size > 0) {
      setDuplicateVariantIndices(new Set());
    }
  }

  function updateVariantAttribute(variantIndex: number, attrName: string, value: string) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) =>
        i === variantIndex ? { ...v, attributes: { ...v.attributes, [attrName]: value } } : v
      ),
    }));
  }

  // ---- Bulk import ----
  function parseBulkSerials(text: string): string[] {
    return text.split(/[\n,;\t]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  }

  const bulkParsedCount = parseBulkSerials(bulkText).length;

  function handleBulkImport() {
    const serials = parseBulkSerials(bulkText);
    if (serials.length === 0) { toast.error("Aucun numero de serie detecte"); return; }

    const existing = new Set(form.variants.map((v) => v.serialNumber.trim().toLowerCase()));
    const unique: string[] = [];
    const dupeCount = serials.reduce((count, s) => {
      if (existing.has(s.toLowerCase())) return count + 1;
      unique.push(s);
      return count;
    }, 0);

    if (dupeCount > 0) toast.warning(`${dupeCount} doublon(s) ignore(s)`);
    if (unique.length === 0) { toast.error("Tous les numeros existent deja"); return; }

    const newVariants: VariantForm[] = unique.map((sn) => ({
      serialNumber: sn,
      barcode: bulkAutoBarcode ? generateBarcode() : "",
      condition: bulkCondition,
      sold: false,
      price: bulkPrice,
      supplierId: bulkSupplierId,
      attributes: {} as Record<string, string>,
      showAttributes: false,
    }));

    setForm((f) => ({ ...f, variants: [...f.variants, ...newVariants] }));
    toast.success(`${newVariants.length} variante(s) importee(s)`);
    setBulkImportOpen(false);
    setBulkText("");
    setBulkPrice("");
    setBulkSupplierId("");
    setBulkCondition("neuf");
    setBulkAutoBarcode(true);
  }

  // ---- Render attribute fields (reusable for product and variant) ----
  // inheritedValues: if provided, shows inherited value as placeholder + reset button
  function renderAttributeFields(
    attrs: Record<string, string>,
    onChange: (name: string, value: string) => void,
    prefix: string,
    inheritedValues?: Record<string, string>
  ) {
    if (!selectedCategory || selectedCategory.attributes.length === 0) return null;
    return selectedCategory.attributes.map((attr) => {
      const inherited = inheritedValues?.[attr.name] || "";
      const current = attrs[attr.name] || "";
      const isOverridden = !!inheritedValues && current !== "" && current !== inherited;
      const placeholderText = inherited
        ? `${inherited} (herite)`
        : attr.name;

      return (
        <div key={`${prefix}-${attr.name}`} className="space-y-1">
          <div className="flex items-center gap-1">
            <Label className="text-xs">
              {attr.name}
              {!inheritedValues && attr.required && " *"}
            </Label>
            {isOverridden && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                title="Reinitialiser (heriter du general)"
                onClick={() => onChange(attr.name, "")}
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
          {attr.type === "select" ? (
            <Select
              value={current}
              onValueChange={(v) => onChange(attr.name, v)}
            >
              <SelectTrigger className={isOverridden ? "border-primary/50" : ""}>
                <SelectValue placeholder={inherited ? `${inherited} (herite)` : `Selectionner ${attr.name}`} />
              </SelectTrigger>
              <SelectContent>
                {inheritedValues && (
                  <SelectItem value="__inherit__">
                    {inherited ? `${inherited} (heriter)` : "(heriter du general)"}
                  </SelectItem>
                )}
                {attr.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={attr.type === "number" ? "number" : "text"}
              placeholder={placeholderText}
              className={isOverridden ? "border-primary/50" : ""}
              value={current}
              onChange={(e) => onChange(attr.name, e.target.value)}
            />
          )}
        </div>
      );
    });
  }

  // ---- Render ----
  return (
    <div>
      {/* Cross-device draft notification */}
      <DraftBanner
        drafts={otherDrafts}
        className="mb-4"
        onResume={() => {
          const data = loadOtherDraft();
          if (!data) return;
          setForm({
            name: (data.name as string) || "",
            description: (data.description as string) || "",
            category: (data.category as string) || (data.categoryId as string) || "",
            brand: (data.brand as string) || "",
            model: (data.model as string) || "",
            purchasePrice: data.purchasePrice != null ? String(data.purchasePrice) : "",
            costPrice: data.costPrice != null ? String(data.costPrice) : "",
            sellingPrice: data.sellingPrice != null ? String(data.sellingPrice) : "",
            supplier: (data.supplier as string) || (data.supplierId as string) || "",
            notes: (data.notes as string) || "",
            image: (data.image as string) || (data.imageUrl as string) || "",
            quantity: data.quantity != null ? String(data.quantity) : "0",
            attributes: (data.attributes as Record<string, string>) || {},
            variants: Array.isArray(data.variants) ? data.variants as any[] : [],
          });
          if (data.labelIds) setFormLabels(data.labelIds as string[]);
          else if (data.productLabelIds) setFormLabels(data.productLabelIds as string[]);
          setEditingId(null);
          setDialogOpen(true);
          toast.success("Brouillon repris depuis l'autre appareil");
        }}
      />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Inventaire</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => { setViewMode("grid"); localStorage.setItem("senstock_view", "grid"); }}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => { setViewMode("list"); localStorage.setItem("senstock_view", "list"); }}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Nombre de modeles" value={totalModels} icon={Package} />
        <StatCard label="Quantite totale" value={totalQuantity} icon={Boxes} />
        {hasPermission("confidentialite.valeur_stock") && <StatCard label="Valeur du stock" value={formatPrice(stockValue)} icon={Coins} />}
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Stock faible" value={lowStock} icon={AlertTriangle} />
        <StatCard label="En rupture" value={outOfStock} icon={CircleX} />
        <StatCard label="Archives" value={archivedCount} icon={Archive} />
      </div>

      {/* Search & Filters */}
      {!loading && products.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
          {/* Search bar — full width top section */}
          <div className="border-b border-border px-5 py-4" role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, marque, modele, IMEI ou code-barres..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 h-10 bg-muted/30 border-0 focus-visible:ring-1"
                aria-label="Rechercher des produits"
              />
            </div>
          </div>

          {/* Filters grid */}
          <div className="px-5 py-4 space-y-4">
            {/* Row 1: Dropdowns */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Categorie</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Etat du stock</Label>
                <Select value={filterStock} onValueChange={setFilterStock}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les etats</SelectItem>
                    <SelectItem value="in_stock">En stock</SelectItem>
                    <SelectItem value="low">Stock faible</SelectItem>
                    <SelectItem value="out">En rupture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Condition</Label>
                <Select value={filterCondition} onValueChange={setFilterCondition}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="neuf">Neuf</SelectItem>
                    <SelectItem value="venant">Venant</SelectItem>
                    <SelectItem value="occasion">Occasion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Code-barres</Label>
                <Select value={filterBarcode} onValueChange={setFilterBarcode}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="with">Avec</SelectItem>
                    <SelectItem value="without">Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Marque</Label>
                <Input
                  placeholder="Ex: Samsung"
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Row 2: Text inputs + Prix */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fournisseur</Label>
                <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {availableLabels.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Étiquettes</Label>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {availableLabels.map((lbl) => {
                      const active = filterLabels.includes(lbl.id);
                      return (
                        <button
                          key={lbl.id}
                          type="button"
                          onClick={() => setFilterLabels((prev) =>
                            active ? prev.filter((id) => id !== lbl.id) : [...prev, lbl.id]
                          )}
                          className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all"
                          style={{
                            backgroundColor: active ? lbl.color : "transparent",
                            borderColor: lbl.color,
                            color: active ? "#fff" : lbl.color,
                          }}
                        >
                          {lbl.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Modele</Label>
                <Input
                  placeholder="Ex: Galaxy A12"
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Prix min</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Prix max</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              {/* Checkboxes grouped */}
              <div className="col-span-2 flex items-end gap-5 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterVariants}
                    onChange={(e) => setFilterVariants(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Avec variantes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterStockOnly}
                    onChange={(e) => setFilterStockOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">En stock uniquement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Afficher les archives</span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? "s" : ""} trouve{filteredProducts.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={archiveSold}
                disabled={archiving}
              >
                <Archive className="h-3.5 w-3.5" />
                {archiving ? "Archivage..." : "Archiver vendus"}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reinitialiser
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product display */}
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit"
          description="Commencez par ajouter votre premier produit"
          action={{ label: "Ajouter un produit", onClick: openCreate }}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <Search className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun produit ne correspond aux filtres</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
            Effacer les filtres
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => {
            const stock = getStock(p);
            const stockStatus = getStockStatus(p);
            const counts = p.category?.hasVariants ? getVariantCounts(p) : null;
            return (
              <div
                key={p._id + '-' + page}
                onClick={() => setViewProduct(p)}
                className={`group cursor-pointer rounded-lg border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in animate-card overflow-hidden ${p.archived ? "border-amber-500/30 opacity-70" : "border-border"}`}
              >
                {/* Image banner */}
                <div className="relative w-full bg-muted/20">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt=""
                      className="w-full object-contain max-h-48 cursor-zoom-in"
                      onClick={(e) => { e.stopPropagation(); setLightboxImage(p.image); }}
                    />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Badges overlay */}
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {p.archived && (
                      <Badge className="bg-amber-600/90 text-white border-transparent text-[11px] font-medium">
                        Archive
                      </Badge>
                    )}
                    <Badge
                      className={`text-[11px] font-medium ${
                        stockStatus === "inactive"
                          ? "bg-destructive/90 text-white border-transparent"
                          : stockStatus === "warning"
                            ? "bg-amber-500/90 text-white border-transparent"
                            : "bg-emerald-500/90 text-white border-transparent"
                      }`}
                    >
                      {stock} en stock
                    </Badge>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-2.5">
                  {/* Name + category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-card-foreground truncate">{p.name}</h3>
                      {p.brand && (
                        <p className="text-xs text-muted-foreground truncate">
                          {p.brand}{p.model ? ` · ${p.model}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px] font-normal">
                      {p.category?.name || "Sans cat."}
                    </Badge>
                  </div>

                  {/* Price */}
                  {p.sellingPrice != null && (
                    <p className="text-base font-bold text-card-foreground">
                      {formatPrice(p.sellingPrice)}
                    </p>
                  )}

                  {/* Variant condition badges */}
                  {counts && (
                    <div className="flex flex-wrap gap-1">
                      {counts.neuf > 0 && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                          {counts.neuf} neuf
                        </Badge>
                      )}
                      {counts.venant > 0 && (
                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 text-[10px] px-1.5 py-0">
                          {counts.venant} venant
                        </Badge>
                      )}
                      {counts.occasion > 0 && (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                          {counts.occasion} occasion
                        </Badge>
                      )}
                      {counts.sold > 0 && (
                        <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-[10px] px-1.5 py-0">
                          {counts.sold} vendu{counts.sold > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Description truncated */}
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}

                  {/* Quick actions */}
                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(p); }} title="Modifier" aria-label="Modifier le produit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openDuplicate(p); }} title="Dupliquer" aria-label="Dupliquer le produit">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewProduct(p); }} title="Voir" aria-label="Voir le produit">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={(e) => { e.stopPropagation(); toggleArchive(p._id); }} title={p.archived ? "Desarchiver" : "Archiver"} aria-label={p.archived ? "Desarchiver le produit" : "Archiver le produit"}>
                      {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setEditingId(p._id); setDeleteConfirm(true); setDialogOpen(true); }} title="Supprimer" aria-label="Supprimer le produit">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={page} totalPages={Math.ceil(filteredProducts.length / PAGE_SIZE)} onPageChange={setPage} />
        </>
      ) : (
        <>
        <div className="rounded-lg border border-border" aria-live="polite">
          <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 hidden md:table-cell">Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Categorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="hidden md:table-cell">Code-barres</TableHead>
                <TableHead className="hidden md:table-cell">Fournisseur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => {
                const stock = getStock(p);
                const counts = p.category?.hasVariants ? getVariantCounts(p) : null;
                const stockStatus = getStockStatus(p);
                return (
                  <TableRow key={p._id + '-' + page} className="animate-row">
                    <TableCell className="w-16 p-2 hidden md:table-cell">
                      {p.image ? (
                        <img src={p.image} alt="" className="h-14 w-14 rounded border border-border object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setLightboxImage(p.image); }} />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-border">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">{p.name}</span>
                        {p.archived && (
                          <Badge className="bg-amber-600/15 text-amber-600 border-amber-600/20 text-[10px] px-1.5 py-0">
                            Archive
                          </Badge>
                        )}
                        {counts && counts.neuf > 0 && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                            {counts.neuf} neuf
                          </Badge>
                        )}
                        {counts && counts.venant > 0 && (
                          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 text-[10px] px-1.5 py-0">
                            {counts.venant} venant
                          </Badge>
                        )}
                        {counts && counts.occasion > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                            {counts.occasion} occasion
                          </Badge>
                        )}
                        {counts && counts.sold > 0 && (
                          <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-[10px] px-1.5 py-0">
                            {counts.sold} vendu{counts.sold > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      {p.labels && p.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.labels.map((li) => (
                            <span
                              key={li.label.id}
                              className="rounded-full px-1.5 py-0 text-[10px] font-medium text-white leading-5"
                              style={{ backgroundColor: li.label.color }}
                            >
                              {li.label.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.brand && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.brand}{p.model ? ` · ${p.model}` : ""}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {p.category?.name || "Sans categorie"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {p.sellingPrice != null ? formatPrice(p.sellingPrice) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`text-xs font-medium ${
                          stockStatus === "inactive"
                            ? "bg-destructive/15 text-destructive border-destructive/20"
                            : stockStatus === "warning"
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {stock} unite{stock !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.category?.hasVariants
                        ? p.variants.length > 0
                          ? `${p.variants.length} variante${p.variants.length > 1 ? "s" : ""}`
                          : "Aucun"
                        : "Aucun"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.supplier?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} title="Modifier" aria-label="Modifier le produit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDuplicate(p)} title="Dupliquer" aria-label="Dupliquer le produit">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewProduct(p)} title="Voir" aria-label="Voir le produit">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => toggleArchive(p._id)} title={p.archived ? "Desarchiver" : "Archiver"} aria-label={p.archived ? "Desarchiver le produit" : "Archiver le produit"}>
                          {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setEditingId(p._id); setDeleteConfirm(true); setDialogOpen(true); }} title="Supprimer" aria-label="Supprimer le produit">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
        <Pagination page={page} totalPages={Math.ceil(filteredProducts.length / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) tryCloseDialog(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl" onPointerDownOutside={(e) => { if (hasFormChanged()) { e.preventDefault(); tryCloseDialog(); } }}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifiez les informations du produit."
                : "Remplissez les informations pour creer un produit."}
            </DialogDescription>
          </DialogHeader>

          {!editingId && (
            <DraftBanner drafts={otherDrafts} className="mt-2" onResume={() => {
              const draft = loadOtherDraft();
              if (!draft) return;
              setForm((f) => ({
                ...f,
                name: (draft.name as string) || f.name,
                description: (draft.description as string) || f.description,
                categoryId: (draft.categoryId as string) || f.categoryId,
                brand: (draft.brand as string) || f.brand,
                model: (draft.model as string) || f.model,
                purchasePrice: (draft.purchasePrice as string) || f.purchasePrice,
                costPrice: (draft.costPrice as string) || f.costPrice,
                sellingPrice: (draft.sellingPrice as string) || f.sellingPrice,
                supplierId: (draft.supplierId as string) || f.supplierId,
                notes: (draft.notes as string) || f.notes,
                image: (draft.image as string) || (draft.imageUrl as string) || f.image,
                quantity: (draft.quantity as string) || f.quantity,
                attributes: (draft.attributes as Record<string, string>) || f.attributes,
                variants: (draft.variants as VariantForm[]) || f.variants,
              }));
              const draftLabels = draft.labelIds || draft.productLabelIds;
              if (Array.isArray(draftLabels)) {
                setFormLabels(draftLabels as string[]);
              }
            }} />
          )}

          <div className="space-y-4 py-2">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Image */}
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-start gap-4">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="Preview"
                    className="h-20 w-20 rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    placeholder="URL de l'image"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3 w-3" />
                    {uploading ? "Upload..." : "Uploader un fichier"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="prod-name">Nom *</Label>
              <Input
                id="prod-name"
                placeholder="Ex: iPhone 15 Pro"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-brand">Marque</Label>
                <Input
                  id="prod-brand"
                  placeholder="Ex: Apple"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-model">Modele</Label>
                <Input
                  id="prod-model"
                  placeholder="Ex: A2848"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Input
                id="prod-desc"
                placeholder="Description optionnelle"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v, attributes: {}, variants: [] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une categorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prices row */}
            <div className={`grid gap-3 ${hasPermission("confidentialite.prix_achat") ? "grid-cols-3" : "grid-cols-1"}`}>
              {hasPermission("confidentialite.prix_achat") && (
                <div className="space-y-2">
                  <Label htmlFor="prod-purchase-price">Prix d'achat</Label>
                  <Input
                    id="prod-purchase-price"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.purchasePrice}
                    onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  />
                </div>
              )}
              {hasPermission("confidentialite.prix_achat") && (
                <div className="space-y-2">
                  <Label htmlFor="prod-cost-price">Prix de revient</Label>
                  <Input
                    id="prod-cost-price"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.costPrice}
                    onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="prod-selling-price">Prix de vente</Label>
                <Input
                  id="prod-selling-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.sellingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, sellingPrice: e.target.value }))}
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <div className="flex items-center gap-2">
                <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={supplierPopoverOpen} className="flex-1 justify-between font-normal">
                      {form.supplierId
                        ? (() => { const s = suppliers.find((s) => s._id === form.supplierId); return s ? `${s.name}${s.phone ? ` — ${s.phone}` : ""}` : "Sélectionner..."; })()
                        : "Aucun fournisseur"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher par nom ou téléphone..." />
                      <CommandList>
                        <CommandEmpty>Aucun fournisseur trouvé</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__aucun__"
                            onSelect={() => { setForm((f) => ({ ...f, supplierId: "" })); setSupplierPopoverOpen(false); }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${!form.supplierId ? "opacity-100" : "opacity-0"}`} />
                            Aucun fournisseur
                          </CommandItem>
                          {suppliers.map((s) => (
                            <CommandItem
                              key={s._id}
                              value={`${s.name} ${s.phone}`}
                              onSelect={() => { setForm((f) => ({ ...f, supplierId: s._id })); setSupplierPopoverOpen(false); }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${form.supplierId === s._id ? "opacity-100" : "opacity-0"}`} />
                              {s.name}{s.phone ? ` — ${s.phone}` : ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => openAddSupplier("product")} title="Ajouter un fournisseur">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Dynamic general attributes from selected category */}
            {selectedCategory && selectedCategory.attributes.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Attributs generaux</Label>
                {renderAttributeFields(
                  form.attributes,
                  (name, value) =>
                    setForm((f) => ({
                      ...f,
                      attributes: { ...f.attributes, [name]: value },
                    })),
                  "general"
                )}
              </div>
            )}

            {/* Quantity (only if category has no variants) */}
            {selectedCategory && !selectedCategory.hasVariants && (
              <div className="space-y-2">
                <Label htmlFor="prod-qty">Quantite en stock</Label>
                <Input
                  id="prod-qty"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
            )}

            {/* Variants (only if category has variants) */}
            {selectedCategory && selectedCategory.hasVariants && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Variantes ({form.variants.length})</Label>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setBulkImportOpen(true)}>
                      <Upload className="h-3 w-3" />
                      Importer
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={variantAddCount}
                      onChange={(e) => setVariantAddCount(e.target.value)}
                      className="h-8 w-16 text-xs text-center"
                    />
                    <Button variant="outline" size="sm" onClick={() => addVariants(Math.max(1, parseInt(variantAddCount) || 1))}>
                      <Plus className="h-3 w-3" />
                      Ajouter
                    </Button>
                  </div>
                </div>

                {/* Variant search & filters */}
                {form.variants.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[150px]">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher IMEI, code-barres..."
                        value={variantSearch}
                        onChange={(e) => setVariantSearch(e.target.value)}
                        className="h-8 pl-7 text-xs"
                      />
                    </div>
                    <Select value={variantFilterCondition} onValueChange={setVariantFilterCondition}>
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="neuf">Neuf</SelectItem>
                        <SelectItem value="venant">Venant</SelectItem>
                        <SelectItem value="occasion">Occasion</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={variantFilterStatus} onValueChange={setVariantFilterStatus}>
                      <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tout</SelectItem>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="sold">Vendu</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasActiveVariantFilters && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground px-2" onClick={resetVariantFilters}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    {hasActiveVariantFilters && (
                      <span className="text-xs text-muted-foreground">
                        {filteredFormVariants.length}/{form.variants.length}
                      </span>
                    )}
                  </div>
                )}

                {form.variants.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune variante. Ajoutez des variantes avec leur numero de serie.
                  </p>
                )}

                {form.variants.length > 0 && filteredFormVariants.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Aucune variante ne correspond aux filtres.
                  </p>
                )}

                {filteredFormVariants.map(({ variant, originalIndex: vi }) => (
                  <div
                    key={vi}
                    className={`space-y-2 rounded-md border p-3 transition-colors ${duplicateVariantIndices.has(vi) ? "border-destructive bg-destructive/5 ring-1 ring-destructive/30" : variant.sold ? "border-border/50 bg-muted/30 opacity-60" : "border-border"}`}
                  >
                    {variant.sold && (
                      <p className="text-xs font-medium text-muted-foreground">Vendu — non modifiable</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="IMEI / N° de serie"
                          value={variant.serialNumber}
                          disabled={variant.sold}
                          onChange={(e) =>
                            updateVariant(vi, { serialNumber: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-1">
                          <Input
                            placeholder="Code-barres"
                            value={variant.barcode}
                            disabled={variant.sold}
                            onChange={(e) =>
                              updateVariant(vi, { barcode: e.target.value })
                            }
                          />
                          {!variant.sold && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              title="Generer un code-barres"
                              onClick={() =>
                                updateVariant(vi, { barcode: generateBarcode() })
                              }
                            >
                              <Dices className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="w-32">
                        <Select
                          value={variant.condition}
                          disabled={variant.sold}
                          onValueChange={(v) =>
                            updateVariant(vi, {
                              condition: v as Variant["condition"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="neuf">Neuf</SelectItem>
                            <SelectItem value="venant">Venant</SelectItem>
                            <SelectItem value="occasion">Occasion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Prix"
                          value={variant.price}
                          disabled={variant.sold}
                          onChange={(e) =>
                            updateVariant(vi, { price: e.target.value })
                          }
                        />
                      </div>
                      <div className="w-48 flex items-center gap-1">
                        <Popover open={variantSupplierPopoverOpen === vi} onOpenChange={(open) => setVariantSupplierPopoverOpen(open ? vi : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" disabled={variant.sold} className="flex-1 justify-between font-normal text-xs h-9 px-2">
                              {variant.supplierId
                                ? (suppliers.find((s) => s._id === variant.supplierId)?.name || "Sélectionner...")
                                : "Fournisseur"}
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Rechercher..." />
                              <CommandList>
                                <CommandEmpty>Aucun fournisseur trouvé</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="__aucun__"
                                    onSelect={() => { updateVariant(vi, { supplierId: "" }); setVariantSupplierPopoverOpen(null); }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${!variant.supplierId ? "opacity-100" : "opacity-0"}`} />
                                    Aucun
                                  </CommandItem>
                                  {suppliers.map((s) => (
                                    <CommandItem
                                      key={s._id}
                                      value={`${s.name} ${s.phone}`}
                                      onSelect={() => { updateVariant(vi, { supplierId: s._id }); setVariantSupplierPopoverOpen(null); }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${variant.supplierId === s._id ? "opacity-100" : "opacity-0"}`} />
                                      {s.name}{s.phone ? ` — ${s.phone}` : ""}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {!variant.sold && (
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => openAddSupplier(vi)} title="Ajouter fournisseur">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {availableLabels.length > 0 && (
                        <div className="w-40">
                          <select
                            value={variant.labelId || ""}
                            disabled={variant.sold}
                            onChange={(e) => updateVariant(vi, { labelId: e.target.value })}
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                          >
                            <option value="">— Étiquette —</option>
                            {availableLabels.map((lbl) => (
                              <option key={lbl.id} value={lbl.id}>{lbl.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {selectedCategory.attributes.length > 0 && !variant.sold && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() =>
                            updateVariant(vi, { showAttributes: !variant.showAttributes })
                          }
                          title="Attributs specifiques"
                        >
                          {variant.showAttributes ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!variant.sold && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeVariant(vi)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Variant-specific attributes — inherit from general */}
                    {variant.showAttributes && !variant.sold && selectedCategory.attributes.length > 0 && (
                      <div className="ml-1 space-y-2 border-l-2 border-primary/30 pl-3 pt-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Attributs specifiques
                          <span className="ml-1 font-normal italic">
                            — vide = herite du general
                          </span>
                        </p>
                        {renderAttributeFields(
                          variant.attributes,
                          (name, value) => {
                            updateVariantAttribute(vi, name, value === "__inherit__" ? "" : value);
                          },
                          `variant-${vi}`,
                          form.attributes
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Bottom add variant button */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={variantAddCount}
                    onChange={(e) => setVariantAddCount(e.target.value)}
                    className="h-8 w-16 text-xs text-center"
                  />
                  <Button variant="outline" size="sm" onClick={() => addVariants(Math.max(1, parseInt(variantAddCount) || 1))}>
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="prod-notes">Notes</Label>
              <Textarea
                id="prod-notes"
                placeholder="Notes internes, remarques..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Étiquettes */}
            {availableLabels.length > 0 && (
              <div className="space-y-2">
                <Label>Étiquettes</Label>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((lbl) => {
                    const active = formLabels.includes(lbl.id);
                    return (
                      <button
                        key={lbl.id}
                        type="button"
                        onClick={() => setFormLabels((prev) =>
                          active ? prev.filter((id) => id !== lbl.id) : [...prev, lbl.id]
                        )}
                        className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
                        style={{
                          backgroundColor: active ? lbl.color : "transparent",
                          borderColor: lbl.color,
                          color: active ? "#fff" : lbl.color,
                        }}
                      >
                        {lbl.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {editingId && (
              <div>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Confirmer ?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={saving}
                      onClick={handleDelete}
                    >
                      Supprimer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                onClick={tryCloseDialog}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm close without saving */}
      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifications non enregistrees</DialogTitle>
            <DialogDescription>
              Vous avez des modifications non enregistrees. Voulez-vous vraiment quitter sans enregistrer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmCloseOpen(false)}>
              Continuer l'edition
            </Button>
            <Button variant="destructive" onClick={forceCloseDialog}>
              Quitter sans enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-add Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau fournisseur</DialogTitle>
            <DialogDescription>Ajoutez rapidement un fournisseur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                placeholder="Nom du fournisseur"
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telephone</Label>
                <Input
                  placeholder="Ex: 77 123 45 67"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Ex: contact@fournisseur.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input
                placeholder="Adresse du fournisseur"
                value={supplierForm.address}
                onChange={(e) => setSupplierForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveSupplier} disabled={savingSupplier || !supplierForm.name.trim()}>
              {savingSupplier ? "Enregistrement..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Detail Dialog */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => { if (!open) setViewProduct(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {viewProduct?.image && (
                <img src={viewProduct.image} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
              )}
              {viewProduct?.name}
            </DialogTitle>
            <DialogDescription>
              {viewProduct?.brand && `${viewProduct.brand}`}{viewProduct?.model ? ` · ${viewProduct.model}` : ""}
              {!viewProduct?.brand && !viewProduct?.model && "Details du produit"}
            </DialogDescription>
          </DialogHeader>

          {viewProduct && (
            <div className="space-y-5 py-2">
              {/* General info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Categorie</span>
                  <p className="font-medium">{viewProduct.category?.name || "Sans categorie"}</p>
                </div>
                {viewProduct.brand && (
                  <div>
                    <span className="text-muted-foreground">Marque</span>
                    <p className="font-medium">{viewProduct.brand}</p>
                  </div>
                )}
                {viewProduct.model && (
                  <div>
                    <span className="text-muted-foreground">Modele</span>
                    <p className="font-medium">{viewProduct.model}</p>
                  </div>
                )}
                {hasPermission("confidentialite.prix_achat") && viewProduct.purchasePrice != null && (
                  <div>
                    <span className="text-muted-foreground">Prix d'achat</span>
                    <p className="font-medium">{formatPrice(viewProduct.purchasePrice)}</p>
                  </div>
                )}
                {hasPermission("confidentialite.prix_achat") && viewProduct.costPrice != null && (
                  <div>
                    <span className="text-muted-foreground">Prix de revient</span>
                    <p className="font-medium">{formatPrice(viewProduct.costPrice)}</p>
                  </div>
                )}
                {viewProduct.sellingPrice != null && (
                  <div>
                    <span className="text-muted-foreground">Prix de vente</span>
                    <p className="font-medium">{formatPrice(viewProduct.sellingPrice)}</p>
                  </div>
                )}
                {!viewProduct.category?.hasVariants && (
                  <div>
                    <span className="text-muted-foreground">Quantite en stock</span>
                    <p className="font-medium">{viewProduct.quantity}</p>
                  </div>
                )}
              </div>

              {viewProduct.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <p>{viewProduct.description}</p>
                </div>
              )}

              {/* General attributes */}
              {viewProduct.attributes && Object.keys(
                viewProduct.attributes instanceof Map
                  ? Object.fromEntries(viewProduct.attributes)
                  : viewProduct.attributes
              ).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attributs generaux</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {Object.entries(
                      viewProduct.attributes instanceof Map
                        ? Object.fromEntries(viewProduct.attributes)
                        : viewProduct.attributes
                    ).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}</span>
                        <p className="font-medium">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants table */}
              {viewProduct.category?.hasVariants && viewProduct.variants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Variantes ({viewProduct.variants.filter((v) => !v.sold).length} disponible{viewProduct.variants.filter((v) => !v.sold).length !== 1 ? "s" : ""} / {viewProduct.variants.length} total)
                  </p>
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">IMEI / N° serie</TableHead>
                          <TableHead className="text-xs">Code-barres</TableHead>
                          <TableHead className="text-xs">Condition</TableHead>
                          <TableHead className="text-xs">Prix</TableHead>
                          <TableHead className="text-xs">Étiquette</TableHead>
                          <TableHead className="text-xs">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewProduct.variants.map((v, i) => (
                          <TableRow key={v._id || i} className={v.sold ? "opacity-50" : ""}>
                            <TableCell className="text-sm font-mono">{v.serialNumber}</TableCell>
                            <TableCell>
                              <BarcodeDisplay value={v.barcode || ""} label={`${viewProduct.name} - ${v.serialNumber}`} />
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                v.condition === "neuf"
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                                  : v.condition === "venant"
                                    ? "bg-blue-500/15 text-blue-600 border-blue-500/20"
                                    : "bg-amber-500/15 text-amber-600 border-amber-500/20"
                              }`}>
                                {v.condition === "neuf" ? "Neuf" : v.condition === "venant" ? "Venant" : "Occasion"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {v.price != null ? formatPrice(v.price) : "—"}
                            </TableCell>
                            <TableCell>
                              {v.label ? (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                  style={{ backgroundColor: v.label.color }}
                                >
                                  {v.label.name}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {v.sold ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-[10px] px-1.5 py-0">
                                    Vendu
                                  </Badge>
                                  {v.soldInvoiceId && (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline font-medium"
                                      onClick={() => navigate(`/commerce/factures/${v.soldInvoiceId}?highlight=${v._id}`)}
                                    >
                                      {v.soldInvoiceNumber || "Facture"}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                                  Disponible
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {viewProduct.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{viewProduct.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewProduct(null)}>
              Fermer
            </Button>
            {viewProduct && (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => { toggleArchive(viewProduct._id); setViewProduct(null); }}
              >
                {viewProduct.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {viewProduct.archived ? "Desarchiver" : "Archiver"}
              </Button>
            )}
            <Button variant="outline" onClick={() => { if (viewProduct) { openDuplicate(viewProduct); setViewProduct(null); } }}>
              <Copy className="h-4 w-4" />
              Dupliquer
            </Button>
            <Button onClick={() => { if (viewProduct) { openEdit(viewProduct); setViewProduct(null); } }}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des variantes</DialogTitle>
            <DialogDescription>
              Collez une liste de numeros de serie / IMEI (un par ligne, ou separes par virgules)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Numeros de serie / IMEI</Label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"353121212121212\n353121212121213\n353121212121214\n..."}
                className="min-h-[150px] font-mono text-sm"
              />
              {bulkText && (
                <p className="text-xs text-muted-foreground">
                  {bulkParsedCount} numero{bulkParsedCount > 1 ? "s" : ""} de serie detecte{bulkParsedCount > 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select value={bulkCondition} onValueChange={(v) => setBulkCondition(v as "neuf" | "venant" | "occasion")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neuf">Neuf</SelectItem>
                    <SelectItem value="venant">Venant</SelectItem>
                    <SelectItem value="occasion">Occasion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prix unitaire</Label>
                <Input
                  type="number"
                  min="0"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  placeholder="Optionnel"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fournisseur</Label>
                <Select value={bulkSupplierId || "__none__"} onValueChange={(v) => setBulkSupplierId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Code-barres auto</Label>
                <div className="flex items-center gap-2 h-9">
                  <Switch checked={bulkAutoBarcode} onCheckedChange={setBulkAutoBarcode} />
                  <span className="text-xs text-muted-foreground">{bulkAutoBarcode ? "Generer" : "Vide"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>Annuler</Button>
            <Button onClick={handleBulkImport} disabled={bulkParsedCount === 0}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Importer {bulkParsedCount > 0 ? `(${bulkParsedCount})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => { if (!open) setLightboxImage(null); }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Image</DialogTitle>
            <DialogDescription>Apercu de l'image du produit</DialogDescription>
          </DialogHeader>
          {lightboxImage && (
            <img src={lightboxImage} alt="" className="max-w-full max-h-[85vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventairePage;
