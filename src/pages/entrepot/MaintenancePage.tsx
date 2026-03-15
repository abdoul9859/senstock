import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  Wrench,
  Loader2,
  Eye,
  Trash2,
  Plus,
  ChevronRight,
  Package,
  Phone,
  User,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Printer,
  X,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Part {
  _id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Ticket {
  _id: string;
  number: string;
  product: {
    _id: string;
    name: string;
    brand: string;
    model: string;
    image: string;
  } | null;
  variant: string | null;
  deviceName: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  client: { name: string; phone: string; email: string };
  issueDescription: string;
  conditionAtReception: string;
  accessories: string;
  diagnostic: string;
  diagnosticDate: string | null;
  repairNotes: string;
  partsUsed: Part[];
  laborCost: number;
  estimatedCost: number;
  finalCost: number;
  status: string;
  priority: string;
  receivedDate: string;
  estimatedReturnDate: string | null;
  completedDate: string | null;
  returnedDate: string | null;
  paymentStatus: string;
  amountPaid: number;
  notes: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  variants: { _id: string; serialNumber: string; condition: string }[];
  category: { hasVariants: boolean } | null;
}

const statusLabels: Record<string, string> = {
  recu: "Reçu",
  diagnostic: "Diagnostic",
  en_reparation: "En réparation",
  pret: "Prêt",
  rendu: "Rendu",
  annule: "Annulé",
};

const statusColors: Record<string, string> = {
  recu: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  diagnostic: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  en_reparation: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  pret: "bg-green-500/15 text-green-600 dark:text-green-400",
  rendu: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  annule: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const statusFlow: Record<string, string[]> = {
  recu: ["diagnostic", "annule"],
  diagnostic: ["en_reparation", "annule"],
  en_reparation: ["pret", "annule"],
  pret: ["rendu"],
  rendu: [],
  annule: [],
};

const conditionLabels: Record<string, string> = {
  bon: "Bon état",
  moyen: "Moyen",
  mauvais: "Mauvais état",
  critique: "Critique",
};

const conditionColors: Record<string, string> = {
  bon: "bg-green-500/15 text-green-600 dark:text-green-400",
  moyen: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  mauvais: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  critique: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const priorityLabels: Record<string, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

const priorityColors: Record<string, string> = {
  basse: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  normale: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  haute: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  urgente: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const paymentStatusLabels: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payé",
  partielle: "Partiel",
};

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Create form
  const [form, setForm] = useState({
    source: "stock" as "stock" | "externe",
    product: "",
    variant: "",
    deviceName: "",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    issueDescription: "",
    conditionAtReception: "moyen",
    accessories: "",
    priority: "normale",
    estimatedCost: 0,
    estimatedReturnDate: "",
    notes: "",
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`/api/maintenance`, { headers });
      if (res.ok) setTickets(await res.json());
    } catch {}
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/products`, { headers });
      if (res.ok) setProducts(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([fetchTickets(), fetchProducts()]).then(() => setLoading(false));
  }, []);

  // Stats
  const stats = {
    recu: tickets.filter((t) => t.status === "recu").length,
    diagnostic: tickets.filter((t) => t.status === "diagnostic").length,
    en_reparation: tickets.filter((t) => t.status === "en_reparation").length,
    pret: tickets.filter((t) => t.status === "pret").length,
  };

  // Filter
  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.number.toLowerCase().includes(q) ||
        t.client.name.toLowerCase().includes(q) ||
        t.client.phone.includes(q) ||
        (t.product?.name || "").toLowerCase().includes(q) ||
        (t.deviceName || "").toLowerCase().includes(q) ||
        (t.deviceBrand || "").toLowerCase().includes(q) ||
        t.serialNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Create ticket
  const handleCreate = async () => {
    if (form.source === "stock" && !form.product) {
      toast.error("Sélectionnez un produit du stock");
      return;
    }
    if (form.source === "externe" && !form.deviceName.trim()) {
      toast.error("Nom de l'appareil requis");
      return;
    }
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.issueDescription.trim()) {
      toast.error("Client (nom + téléphone) et description du problème requis");
      return;
    }
    try {
      const res = await fetch(`/api/maintenance`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          product: form.source === "stock" ? form.product : null,
          variant: form.source === "stock" ? form.variant || null : null,
          deviceName: form.source === "externe" ? form.deviceName.trim() : "",
          deviceBrand: form.source === "externe" ? form.deviceBrand.trim() : "",
          deviceModel: form.source === "externe" ? form.deviceModel.trim() : "",
          serialNumber: form.serialNumber,
          client: {
            name: form.clientName.trim(),
            phone: form.clientPhone.trim(),
            email: form.clientEmail.trim(),
          },
          issueDescription: form.issueDescription.trim(),
          conditionAtReception: form.conditionAtReception,
          accessories: form.accessories,
          priority: form.priority,
          estimatedCost: form.estimatedCost,
          estimatedReturnDate: form.estimatedReturnDate || null,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Ticket créé");
      setCreateOpen(false);
      resetForm();
      fetchTickets();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const resetForm = () =>
    setForm({
      source: "stock",
      product: "",
      variant: "",
      deviceName: "",
      deviceBrand: "",
      deviceModel: "",
      serialNumber: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      issueDescription: "",
      conditionAtReception: "moyen",
      accessories: "",
      priority: "normale",
      estimatedCost: 0,
      estimatedReturnDate: "",
      notes: "",
    });

  // Change status
  const changeStatus = async (ticket: Ticket, newStatus: string) => {
    try {
      const res = await fetch(`/api/maintenance/${ticket._id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(`Statut → ${statusLabels[newStatus]}`);
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      if (selected?._id === updated._id) setSelected(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update diagnostic/repair info
  const updateTicket = async (id: string, data: Partial<Ticket>) => {
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Mis à jour");
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      if (selected?._id === updated._id) setSelected(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete
  const deleteTicket = async (id: string) => {
    if (!confirm("Supprimer ce ticket ?")) return;
    try {
      await fetch(`/api/maintenance/${id}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Supprimé");
      setTickets((prev) => prev.filter((t) => t._id !== id));
      if (selected?._id === id) {
        setSelected(null);
        setDetailOpen(false);
      }
    } catch {
      toast.error("Erreur");
    }
  };

  // Selected product for create form
  const selectedProduct = products.find((p) => p._id === form.product);
  const hasVariants = selectedProduct?.category?.hasVariants;

  // Parts cost total
  const partsCost = (t: Ticket) =>
    t.partsUsed.reduce((s, p) => s + p.quantity * p.unitPrice, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">Gestion des tickets de réparation</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Reçus", value: stats.recu, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Diagnostic", value: stats.diagnostic, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "En réparation", value: stats.en_reparation, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
          { label: "Prêts", value: stats.pret, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher ticket, client, produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun ticket</h3>
          <p className="text-muted-foreground">
            {tickets.length === 0
              ? "Créez votre premier ticket de maintenance"
              : "Aucun résultat pour ces filtres"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">N°</th>
                <th className="text-left p-3 font-medium">Produit</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Problème</th>
                <th className="text-left p-3 font-medium">Priorité</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{t.number}</td>
                  <td className="p-3">
                    <div className="font-medium truncate max-w-[160px]">
                      {t.product?.name || t.deviceName || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {t.product
                        ? t.product.brand || ""
                        : [t.deviceBrand, t.deviceModel].filter(Boolean).join(" — ")}
                      {!t.product && t.deviceName && (
                        <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-0 text-[10px] py-0">
                          Externe
                        </Badge>
                      )}
                    </div>
                    {t.serialNumber && (
                      <div className="text-xs text-muted-foreground">
                        S/N: {t.serialNumber}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{t.client.name}</div>
                    <div className="text-xs text-muted-foreground">{t.client.phone}</div>
                  </td>
                  <td className="p-3">
                    <div className="truncate max-w-[200px]">{t.issueDescription}</div>
                  </td>
                  <td className="p-3">
                    <Badge className={`${priorityColors[t.priority]} border-0 text-xs`}>
                      {priorityLabels[t.priority]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={`${statusColors[t.status]} border-0 text-xs`}>
                      {statusLabels[t.status]}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {fmtDate(t.receivedDate)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelected(t);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => deleteTicket(t._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========== CREATE DIALOG =========== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau ticket de maintenance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source toggle */}
            <div>
              <Label className="mb-1.5 block">Source du produit</Label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      source: "stock",
                      deviceName: "",
                      deviceBrand: "",
                      deviceModel: "",
                    }))
                  }
                  className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    form.source === "stock"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <Package className="h-4 w-4 mb-1" />
                  <div>Produit du stock</div>
                </button>
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      source: "externe",
                      product: "",
                      variant: "",
                    }))
                  }
                  className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    form.source === "externe"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <Wrench className="h-4 w-4 mb-1" />
                  <div>Appareil externe</div>
                </button>
              </div>
            </div>

            {/* Product from stock */}
            {form.source === "stock" && (
              <>
                <div>
                  <Label>Produit *</Label>
                  <Select
                    value={form.product}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, product: v, variant: "", serialNumber: "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name} {p.brand && `— ${p.brand}`} {p.model && `(${p.model})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variant / Serial */}
                {hasVariants && selectedProduct && (
                  <div>
                    <Label>Variante / N° de série</Label>
                    <Select
                      value={form.variant}
                      onValueChange={(v) => {
                        const variant = selectedProduct.variants.find((vr) => vr._id === v);
                        setForm((f) => ({
                          ...f,
                          variant: v,
                          serialNumber: variant?.serialNumber || "",
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une variante..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.variants.map((v) => (
                          <SelectItem key={v._id} value={v._id}>
                            {v.serialNumber} — {v.condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!hasVariants && form.product && (
                  <div>
                    <Label>N° de série (optionnel)</Label>
                    <Input
                      value={form.serialNumber}
                      onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                      placeholder="Numéro de série"
                    />
                  </div>
                )}
              </>
            )}

            {/* External device */}
            {form.source === "externe" && (
              <>
                <div>
                  <Label>Nom de l'appareil *</Label>
                  <Input
                    value={form.deviceName}
                    onChange={(e) => setForm((f) => ({ ...f, deviceName: e.target.value }))}
                    placeholder="Ex: iPhone 13, Samsung Galaxy S22..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Marque</Label>
                    <Input
                      value={form.deviceBrand}
                      onChange={(e) => setForm((f) => ({ ...f, deviceBrand: e.target.value }))}
                      placeholder="Apple, Samsung..."
                    />
                  </div>
                  <div>
                    <Label>Modèle</Label>
                    <Input
                      value={form.deviceModel}
                      onChange={(e) => setForm((f) => ({ ...f, deviceModel: e.target.value }))}
                      placeholder="A2482, SM-S901B..."
                    />
                  </div>
                </div>
                <div>
                  <Label>N° de série (optionnel)</Label>
                  <Input
                    value={form.serialNumber}
                    onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                    placeholder="Numéro de série ou IMEI"
                  />
                </div>
              </>
            )}

            {/* Client info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom client *</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
            <div>
              <Label>Email (optionnel)</Label>
              <Input
                value={form.clientEmail}
                onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                placeholder="email@exemple.com"
              />
            </div>

            {/* Issue */}
            <div>
              <Label>Description du problème *</Label>
              <Textarea
                value={form.issueDescription}
                onChange={(e) => setForm((f) => ({ ...f, issueDescription: e.target.value }))}
                placeholder="Décrivez le problème signalé..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>État à la réception</Label>
                <Select
                  value={form.conditionAtReception}
                  onValueChange={(v) => setForm((f) => ({ ...f, conditionAtReception: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(conditionLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Accessoires remis</Label>
              <Input
                value={form.accessories}
                onChange={(e) => setForm((f) => ({ ...f, accessories: e.target.value }))}
                placeholder="Chargeur, câble, housse..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Coût estimé</Label>
                <Input
                  type="number"
                  value={form.estimatedCost || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, estimatedCost: Number(e.target.value) || 0 }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Date retour estimée</Label>
                <Input
                  type="date"
                  value={form.estimatedReturnDate}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedReturnDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes internes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========== DETAIL DIALOG =========== */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono">{selected.number}</span>
                <Badge className={`${statusColors[selected.status]} border-0`}>
                  {statusLabels[selected.status]}
                </Badge>
                <Badge className={`${priorityColors[selected.priority]} border-0`}>
                  {priorityLabels[selected.priority]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Product & Client */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produit
                    {!selected.product && selected.deviceName && (
                      <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-0 text-xs">
                        Externe
                      </Badge>
                    )}
                  </h3>
                  <div className="text-sm">
                    <div className="font-medium">
                      {selected.product?.name || selected.deviceName || "—"}
                    </div>
                    {selected.product ? (
                      selected.product.brand && (
                        <div className="text-muted-foreground">
                          {selected.product.brand}
                          {selected.product.model && ` — ${selected.product.model}`}
                        </div>
                      )
                    ) : (
                      (selected.deviceBrand || selected.deviceModel) && (
                        <div className="text-muted-foreground">
                          {[selected.deviceBrand, selected.deviceModel]
                            .filter(Boolean)
                            .join(" — ")}
                        </div>
                      )
                    )}
                    {selected.serialNumber && (
                      <div className="text-muted-foreground">
                        S/N: {selected.serialNumber}
                      </div>
                    )}
                  </div>
                  <div className="pt-1">
                    <Badge className={`${conditionColors[selected.conditionAtReception]} border-0 text-xs`}>
                      {conditionLabels[selected.conditionAtReception]}
                    </Badge>
                  </div>
                  {selected.accessories && (
                    <div className="text-xs text-muted-foreground">
                      Accessoires: {selected.accessories}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client
                  </h3>
                  <div className="text-sm space-y-1">
                    <div className="font-medium">{selected.client.name}</div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {selected.client.phone}
                    </div>
                    {selected.client.email && (
                      <div className="text-muted-foreground">{selected.client.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Issue */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Problème signalé
                </h3>
                <p className="text-sm whitespace-pre-line">{selected.issueDescription}</p>
              </div>

              {/* Diagnostic */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4" />
                  Diagnostic
                </h3>
                {selected.status === "recu" ? (
                  <p className="text-sm text-muted-foreground italic">
                    En attente de diagnostic
                  </p>
                ) : (
                  <>
                    <Textarea
                      defaultValue={selected.diagnostic}
                      placeholder="Résultat du diagnostic..."
                      rows={3}
                      onBlur={(e) => {
                        if (e.target.value !== selected.diagnostic) {
                          updateTicket(selected._id, { diagnostic: e.target.value });
                        }
                      }}
                    />
                    {selected.diagnosticDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Diagnostiqué le {fmtDate(selected.diagnosticDate)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Repair notes & parts */}
              {["en_reparation", "pret", "rendu"].includes(selected.status) && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Réparation
                  </h3>
                  <div>
                    <Label className="text-xs">Notes de réparation</Label>
                    <Textarea
                      defaultValue={selected.repairNotes}
                      placeholder="Travaux effectués..."
                      rows={2}
                      onBlur={(e) => {
                        if (e.target.value !== selected.repairNotes) {
                          updateTicket(selected._id, { repairNotes: e.target.value });
                        }
                      }}
                    />
                  </div>

                  {/* Parts */}
                  <div>
                    <Label className="text-xs">Pièces utilisées</Label>
                    <div className="space-y-2 mt-1">
                      {selected.partsUsed.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">{p.name}</span>
                          <span className="text-muted-foreground">x{p.quantity}</span>
                          <span>{fmtMoney(p.unitPrice)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => {
                              const newParts = selected.partsUsed.filter((_, j) => j !== i);
                              updateTicket(selected._id, { partsUsed: newParts } as any);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Pièce</Label>
                        <Input id="part-name" placeholder="Nom de la pièce" className="h-8 text-xs" />
                      </div>
                      <div className="w-16">
                        <Label className="text-xs">Qté</Label>
                        <Input id="part-qty" type="number" defaultValue="1" min="1" className="h-8 text-xs" />
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Prix unit.</Label>
                        <Input id="part-price" type="number" defaultValue="0" min="0" className="h-8 text-xs" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          const nameEl = document.getElementById("part-name") as HTMLInputElement;
                          const qtyEl = document.getElementById("part-qty") as HTMLInputElement;
                          const priceEl = document.getElementById("part-price") as HTMLInputElement;
                          const name = nameEl?.value?.trim();
                          if (!name) { toast.error("Nom de la pièce requis"); return; }
                          const qty = Number(qtyEl?.value) || 1;
                          const price = Number(priceEl?.value) || 0;
                          const newParts = [
                            ...selected.partsUsed,
                            { name, quantity: qty, unitPrice: price },
                          ];
                          updateTicket(selected._id, { partsUsed: newParts } as any);
                          if (nameEl) nameEl.value = "";
                          if (qtyEl) qtyEl.value = "1";
                          if (priceEl) priceEl.value = "0";
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <Label className="text-xs">Main d'œuvre</Label>
                      <Input
                        type="number"
                        defaultValue={selected.laborCost || ""}
                        placeholder="0"
                        onBlur={(e) => {
                          const v = Number(e.target.value) || 0;
                          if (v !== selected.laborCost) {
                            updateTicket(selected._id, { laborCost: v });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Coût final</Label>
                      <Input
                        type="number"
                        defaultValue={selected.finalCost || ""}
                        placeholder="0"
                        onBlur={(e) => {
                          const v = Number(e.target.value) || 0;
                          if (v !== selected.finalCost) {
                            updateTicket(selected._id, { finalCost: v });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pièces: {fmtMoney(partsCost(selected))} · Main d'œuvre:{" "}
                    {fmtMoney(selected.laborCost)} · Total estimé:{" "}
                    {fmtMoney(partsCost(selected) + selected.laborCost)}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Dates
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Réception</span>
                    <span>{fmtDate(selected.receivedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retour estimé</span>
                    <span>{fmtDate(selected.estimatedReturnDate)}</span>
                  </div>
                  {selected.completedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Terminé</span>
                      <span>{fmtDate(selected.completedDate)}</span>
                    </div>
                  )}
                  {selected.returnedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rendu</span>
                      <span>{fmtDate(selected.returnedDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  Paiement
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Coût estimé: </span>
                    <span className="font-medium">{fmtMoney(selected.estimatedCost)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coût final: </span>
                    <span className="font-bold">{fmtMoney(selected.finalCost)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payé: </span>
                    <span className="font-medium">{fmtMoney(selected.amountPaid)}</span>
                  </div>
                  <Select
                    value={selected.paymentStatus}
                    onValueChange={(v) =>
                      updateTicket(selected._id, { paymentStatus: v } as any)
                    }
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selected.paymentStatus !== "payee" && selected.finalCost > 0 && (
                  <div className="mt-2">
                    <Label className="text-xs">Montant reçu</Label>
                    <Input
                      type="number"
                      defaultValue={selected.amountPaid || ""}
                      className="w-40"
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== selected.amountPaid) {
                          updateTicket(selected._id, { amountPaid: v } as any);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <strong>Notes:</strong> {selected.notes}
                </div>
              )}

              {/* Status workflow buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {(statusFlow[selected.status] || []).map((next) => (
                  <Button
                    key={next}
                    variant={next === "annule" ? "outline" : "default"}
                    size="sm"
                    className={next === "annule" ? "text-red-500 border-red-200" : ""}
                    onClick={() => changeStatus(selected, next)}
                  >
                    <ChevronRight className="h-4 w-4 mr-1" />
                    {statusLabels[next]}
                  </Button>
                ))}

                <div className="flex-1" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const token = localStorage.getItem("senstock_token");
                    window.open(`/api/print/maintenance/${selected._id || selected.id}?type=full&token=${token}`, "_blank");
                  }}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========== RECEIPT DIALOG =========== */}
      {selected && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Reçu de maintenance</DialogTitle>
            </DialogHeader>
            <div id="maintenance-receipt" className="space-y-4 text-sm">
              <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold">REÇU DE MAINTENANCE</h2>
                <div className="font-mono text-lg">{selected.number}</div>
                <div className="text-muted-foreground">{fmtDate(selected.receivedDate)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold mb-1">Client</div>
                  <div>{selected.client.name}</div>
                  <div>{selected.client.phone}</div>
                  {selected.client.email && <div>{selected.client.email}</div>}
                </div>
                <div>
                  <div className="font-semibold mb-1">Produit</div>
                  <div>{selected.product?.name || selected.deviceName}</div>
                  {selected.product ? (
                    selected.product.brand && <div>{selected.product.brand}</div>
                  ) : (
                    [selected.deviceBrand, selected.deviceModel].filter(Boolean).length > 0 && (
                      <div>{[selected.deviceBrand, selected.deviceModel].filter(Boolean).join(" — ")}</div>
                    )
                  )}
                  {selected.serialNumber && <div>S/N: {selected.serialNumber}</div>}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="font-semibold mb-1">Problème signalé</div>
                <div className="whitespace-pre-line">{selected.issueDescription}</div>
              </div>

              <div className="border-t pt-3">
                <div className="font-semibold mb-1">État à la réception</div>
                <div>{conditionLabels[selected.conditionAtReception]}</div>
                {selected.accessories && (
                  <div>Accessoires: {selected.accessories}</div>
                )}
              </div>

              {selected.diagnostic && (
                <div className="border-t pt-3">
                  <div className="font-semibold mb-1">Diagnostic</div>
                  <div className="whitespace-pre-line">{selected.diagnostic}</div>
                </div>
              )}

              {selected.partsUsed.length > 0 && (
                <div className="border-t pt-3">
                  <div className="font-semibold mb-1">Pièces utilisées</div>
                  {selected.partsUsed.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {p.name} x{p.quantity}
                      </span>
                      <span>{fmtMoney(p.quantity * p.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 space-y-1">
                {selected.estimatedCost > 0 && (
                  <div className="flex justify-between">
                    <span>Coût estimé</span>
                    <span>{fmtMoney(selected.estimatedCost)}</span>
                  </div>
                )}
                {selected.finalCost > 0 && (
                  <div className="flex justify-between font-bold text-base">
                    <span>Coût final</span>
                    <span>{fmtMoney(selected.finalCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Statut</span>
                  <span>{statusLabels[selected.status]}</span>
                </div>
                {selected.estimatedReturnDate && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Retour estimé</span>
                    <span>{fmtDate(selected.estimatedReturnDate)}</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptOpen(false)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  const el = document.getElementById("maintenance-receipt");
                  if (!el) return;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(`
                    <html>
                    <head>
                      <title>Reçu ${selected.number}</title>
                      <style>
                        body { font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; font-size: 13px; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .font-mono { font-family: monospace; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                        .border-t { border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; }
                        .border-b { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 8px; }
                        .flex { display: flex; justify-content: space-between; }
                        .text-muted { color: #888; }
                        .mb-1 { margin-bottom: 4px; }
                        .text-lg { font-size: 16px; }
                        @media print { body { margin: 0; } }
                      </style>
                    </head>
                    <body>${el.innerHTML}</body>
                    </html>
                  `);
                  win.document.close();
                  win.print();
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
