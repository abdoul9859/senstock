import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon, ChevronsUpDown, Check, Plus, Trash2, Search,
  X, Upload, Package, FileText, StickyNote, PenTool, Users, ArrowLeft, RotateCcw, GripVertical,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  category: { _id: string; name: string; hasVariants: boolean } | null;
  sellingPrice?: number;
  quantity: number;
  archived: boolean;
}

interface QuoteItemForm {
  id: string;
  type: "product" | "service" | "section";
  productId: string;
  productName: string;
  description: string;
  quantity: string;
  unitPrice: string;
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

function getLineTotal(item: QuoteItemForm): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  return qty * price;
}

// ---- Component ----

const NouveauDevisPage = () => {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const [editLoaded, setEditLoaded] = useState(false);

  // ---- Form state ----
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState<Date>(new Date());
  const [validUntil, setValidUntil] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<QuoteItemForm[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showTax, setShowTax] = useState(false);
  const [taxRate, setTaxRate] = useState("18");
  const [showItemPrices, setShowItemPrices] = useState(true);
  const [showSectionTotals, setShowSectionTotals] = useState(false);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");

  // ---- Data ----
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // ---- UI state ----
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [clientSaving, setClientSaving] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [validUntilPopoverOpen, setValidUntilPopoverOpen] = useState(false);

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

  const fetchNextNumber = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes/next-number", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setQuoteNumber(data.number);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    if (!isEditMode) fetchNextNumber();
  }, [fetchClients, fetchProducts, fetchNextNumber, isEditMode]);

  // ---- Load existing quote for edit mode ----
  useEffect(() => {
    if (!editId || editLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/quotes/${editId}`, { headers: getHeaders() });
        if (!res.ok) { toast.error("Devis introuvable"); navigate("/commerce/devis"); return; }
        const q = await res.json();
        setQuoteNumber(q.number || "");
        setQuoteDate(new Date(q.date));
        setValidUntil(q.validUntil ? new Date(q.validUntil) : undefined);
        setClientId(q.client?._id || "");
        setShowTax(q.showTax ?? false);
        setTaxRate(String(q.taxRate ?? 18));
        setShowItemPrices(q.showItemPrices ?? true);
        setShowSectionTotals(q.showSectionTotals ?? false);
        setNotes(q.notes || "");
        setSignature(q.signature || "");
        const mappedItems: QuoteItemForm[] = (q.items || []).map((it: any) => ({
          id: crypto.randomUUID(),
          type: it.type || "product",
          productId: it.productId?._id || it.productId || "",
          productName: it.productId
            ? [it.productId.name, it.productId.brand, it.productId.model].filter(Boolean).join(" ")
            : "",
          description: it.description || "",
          quantity: String(it.quantity ?? 1),
          unitPrice: String(it.unitPrice ?? 0),
        }));
        setItems(mappedItems);
        setEditLoaded(true);
      } catch {
        toast.error("Erreur de chargement");
      }
    })();
  }, [editId, editLoaded, navigate]);

  // ---- Totals ----

  const subtotal = useMemo(() => {
    return items.filter((i) => i.type !== "section").reduce((sum, i) => sum + getLineTotal(i), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return showTax ? subtotal * (parseFloat(taxRate) || 0) / 100 : 0;
  }, [subtotal, showTax, taxRate]);

  const total = subtotal + taxAmount;

  // ---- Item management ----

  function addProduct(product: Product) {
    const newItem: QuoteItemForm = {
      id: crypto.randomUUID(),
      type: "product",
      productId: product._id,
      productName: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      description: "",
      quantity: "1",
      unitPrice: String(product.sellingPrice || 0),
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`${product.name} ajoute`);
  }

  function addServiceLine() {
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "service",
      productId: "",
      productName: "",
      description: "",
      quantity: "1",
      unitPrice: "0",
    }]);
  }

  function addSection() {
    setItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: "section",
      productId: "",
      productName: "",
      description: "",
      quantity: "0",
      unitPrice: "0",
    }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, patch: Partial<QuoteItemForm>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  // ---- Drag and drop ----
  function handleDragStart(e: React.DragEvent, index: number) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") { e.preventDefault(); return; }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.4";
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1";
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
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
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
      return false;
    });
  }, [products, productSearchQuery]);

  // ---- Client quick-create ----

  async function handleCreateClient() {
    if (!clientForm.name.trim()) return;
    setClientSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST", headers: getHeaders(), body: JSON.stringify(clientForm),
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
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
    ctx.lineTo(x, y); ctx.stroke();
  }

  function startDrawingTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getTouchCoords(e);
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true);
  }

  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getTouchCoords(e);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
    ctx.lineTo(x, y); ctx.stroke();
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

  // ---- Save ----

  async function handleSave() {
    const realItems = items.filter((i) => i.type !== "section");
    if (realItems.length === 0) { setError("Ajoutez au moins un article ou service"); return; }

    setSaving(true);
    setError("");
    try {
      const body = {
        client: clientId || undefined,
        date: quoteDate.toISOString(),
        validUntil: validUntil?.toISOString(),
        items: items.map((i) => ({
          type: i.type,
          productId: i.productId || undefined,
          description: i.type === "product" ? i.productName : i.description,
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          total: getLineTotal(i),
        })),
        subtotal,
        showTax,
        taxRate: parseFloat(taxRate) || 18,
        taxAmount,
        total,
        showItemPrices,
        showSectionTotals,
        notes,
        signature,
      };

      const url = isEditMode ? `/api/quotes/${editId}` : "/api/quotes";
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur lors de la sauvegarde"); return; }
      toast.success(isEditMode ? `Devis ${data.number} modifie` : `Devis ${data.number} cree`);
      navigate("/commerce/devis");
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
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/commerce/devis")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{isEditMode ? "Modifier le devis" : "Nouveau Devis"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? `Modification de ${quoteNumber}` : "Creer un devis ou proposition commerciale"}
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
                <Label>Numero</Label>
                <Input value={quoteNumber} disabled className="font-mono bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Date du devis</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(quoteDate, "dd MMMM yyyy", { locale: fr })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={quoteDate} onSelect={(d) => { if (d) setQuoteDate(d); setDatePopoverOpen(false); }} locale={fr} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Valide jusqu'au</Label>
                <Popover open={validUntilPopoverOpen} onOpenChange={setValidUntilPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "dd MMMM yyyy", { locale: fr }) : "Aucune"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={validUntil} onSelect={(d) => { setValidUntil(d); setValidUntilPopoverOpen(false); }} locale={fr} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-normal text-foreground">
                    {[selectedClient.phone, selectedClient.email].filter(Boolean).join(" · ") || "Aucune info"}
                  </span>
                  <button onClick={() => setClientId("")} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                Aucun article. Ajoutez un produit ou un service.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[32px]" />
                      <TableHead className="w-[280px]">Produit / Description</TableHead>
                      <TableHead className="w-[70px] text-center">Qte</TableHead>
                      <TableHead className="w-[120px] text-right">Prix unitaire</TableHead>
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
                          <TableCell colSpan={5} className="py-1.5">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Titre de la section..."
                              className="border-0 bg-transparent font-semibold text-sm h-8 p-0 focus-visible:ring-0 shadow-none"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow
                          key={item.id}
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
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                              className="h-8 w-16 text-center text-sm mx-auto"
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
                          <TableCell className="text-right font-medium text-sm">
                            {formatFCFA(getLineTotal(item))}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
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
              <div className="w-full md:w-80 space-y-3 md:border-l md:border-border md:pl-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatFCFA(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={showTax} onCheckedChange={setShowTax} />
                    <Label className="text-sm">TVA</Label>
                    {showTax && (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-7 w-14 text-xs text-center" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>
                  {showTax && <span className="text-sm font-medium">{formatFCFA(taxAmount)}</span>}
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

        {/* Card 5: Notes */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Notes</h3>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conditions, remarques, delais de livraison..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Card 6: Signature */}
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
                <button onClick={() => setSignature("")} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-2">
                    <canvas
                      ref={canvasRef} width={400} height={150}
                      className="border border-border rounded-md cursor-crosshair bg-white w-full max-w-[400px]"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawingTouch} onTouchMove={drawTouch} onTouchEnd={stopDrawing}
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
          <Button variant="outline" onClick={() => navigate("/commerce/devis")}>Annuler</Button>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <div className="text-sm text-muted-foreground mr-2">
              Total: <span className="font-bold text-foreground">{formatFCFA(total)}</span>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : isEditMode ? "Sauvegarder" : "Enregistrer le devis"}
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
              <Input value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom du client" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+221..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={clientForm.email} onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={clientForm.address} onChange={(e) => setClientForm((f) => ({ ...f, address: e.target.value }))} placeholder="Adresse" />
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

      {/* Dialog: Product search — simplified, no variants */}
      <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Ajouter un article</DialogTitle>
            <DialogDescription>Recherchez un produit par nom ou modele</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, marque, modele..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 max-h-[50vh]">
            {filteredProducts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucun produit trouve</div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product._id} className="rounded-md border border-border p-3 flex items-center gap-3">
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { addProduct(product); setProductSearchOpen(false); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NouveauDevisPage;
