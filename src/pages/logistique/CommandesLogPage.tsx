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
  ShoppingCart,
  Loader2,
  Eye,
  Trash2,
  Plus,
  X,
  Printer,
  FileText,
  Truck,
  CheckCircle,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface OrderItem {
  _id?: string;
  product?: { _id: string; name: string } | string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface PurchaseOrder {
  _id: string;
  number: string;
  supplier: Supplier | string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  expectedDeliveryDate: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}

interface Stats {
  total: number;
  brouillon: number;
  envoyee: number;
  confirmee: number;
  en_transit: number;
  livree: number;
  totalValue: number;
  pendingValue: number;
}

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyee",
  confirmee: "Confirmee",
  en_transit: "En transit",
  livree: "Livree",
  annulee: "Annulee",
};

const statusColors: Record<string, string> = {
  brouillon: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  envoyee: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  confirmee: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  en_transit: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  livree: "bg-green-500/15 text-green-600 dark:text-green-400",
  annulee: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const statusFlow: Record<string, string[]> = {
  brouillon: ["envoyee", "annulee"],
  envoyee: ["confirmee", "annulee"],
  confirmee: ["en_transit", "annulee"],
  en_transit: ["livree", "annulee"],
  livree: [],
  annulee: [],
};

const paymentLabels: Record<string, string> = {
  especes: "Especes",
  mobile_money: "Mobile Money",
  virement: "Virement",
  carte: "Carte",
  cheque: "Cheque",
};

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function getSupplierName(supplier: Supplier | string): string {
  if (typeof supplier === "string") return supplier;
  return supplier?.name || "—";
}

function getSupplierId(supplier: Supplier | string): string {
  if (typeof supplier === "string") return supplier;
  return supplier?._id || "";
}

export default function CommandesLogPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  // Form
  const [form, setForm] = useState({
    supplier: "",
    shipping: 0,
    expectedDeliveryDate: "",
    paymentMethod: "especes",
    notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }] as {
      description: string;
      quantity: number;
      unitPrice: number;
    }[],
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const [oRes, sRes, stRes] = await Promise.all([
        fetch(`/api/purchase-orders`, { headers }),
        fetch(`/api/suppliers`, { headers }),
        fetch(`/api/purchase-orders/stats`, { headers }),
      ]);
      if (oRes.ok) setOrders(await oRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (stRes.ok) setStats(await stRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const formSubtotal = form.items.reduce(
    (s, i) => s + (i.quantity || 1) * (i.unitPrice || 0),
    0
  );
  const formTotal = formSubtotal + (form.shipping || 0);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (supplierFilter !== "all" && getSupplierId(o.supplier) !== supplierFilter)
      return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.number.toLowerCase().includes(q) ||
        getSupplierName(o.supplier).toLowerCase().includes(q) ||
        o.items.some((i) => i.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const resetForm = () => {
    setForm({
      supplier: "",
      shipping: 0,
      expectedDeliveryDate: "",
      paymentMethod: "especes",
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    });
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (
    idx: number,
    field: string,
    value: string | number
  ) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSave = async () => {
    if (!form.supplier) {
      toast.error("Selectionnez un fournisseur");
      return;
    }
    const validItems = form.items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }
    try {
      const res = await fetch(`/api/purchase-orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          supplier: form.supplier,
          items: validItems.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          shipping: form.shipping,
          expectedDeliveryDate: form.expectedDeliveryDate || undefined,
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Commande creee");
      setFormOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(`Statut mis a jour : ${statusLabels[status]}`);
      fetchData();
      if (selected?._id === id) {
        const updated = await res.json().catch(() => null);
        if (updated) setSelected(updated);
        else setDetailOpen(false);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Supprimer cette commande ?")) return;
    try {
      await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Commande supprimee");
      setOrders((prev) => prev.filter((o) => o._id !== id));
      if (selected?._id === id) {
        setSelected(null);
        setDetailOpen(false);
      }
    } catch {
      toast.error("Erreur");
    }
  };

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
          <h1 className="text-2xl font-bold">Commandes fournisseurs</h1>
          <p className="text-muted-foreground">
            Gestion des bons de commande
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle commande
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 bg-blue-500/10">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.brouillon}
            </div>
            <div className="text-sm text-muted-foreground">Brouillons</div>
          </div>
          <div className="rounded-lg border p-4 bg-amber-500/10">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {(stats.envoyee || 0) + (stats.confirmee || 0)}
            </div>
            <div className="text-sm text-muted-foreground">En cours</div>
          </div>
          <div className="rounded-lg border p-4 bg-purple-500/10">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.en_transit}
            </div>
            <div className="text-sm text-muted-foreground">En transit</div>
          </div>
          <div className="rounded-lg border p-4 bg-green-500/10">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.livree}
            </div>
            <div className="text-sm text-muted-foreground">Livrees</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
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
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fournisseurs</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s._id} value={s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucune commande</h3>
          <p className="text-muted-foreground">
            {orders.length === 0
              ? "Creez votre premiere commande fournisseur"
              : "Aucun resultat pour ces filtres"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  N°
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Fournisseur
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Articles
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Total
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Statut
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o._id}
                  className="border-t hover:bg-muted/30"
                >
                  <td className="p-3 font-mono text-xs">{o.number}</td>
                  <td className="p-3 font-medium">
                    {getSupplierName(o.supplier)}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {o.items.length} article{o.items.length > 1 ? "s" : ""}
                  </td>
                  <td className="p-3 font-bold">{fmtMoney(o.total)}</td>
                  <td className="p-3">
                    <Badge
                      className={`${statusColors[o.status] || "bg-slate-500/15 text-slate-600 dark:text-slate-400"} border-0 text-xs`}
                    >
                      {statusLabels[o.status] || o.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {fmtDate(o.createdAt)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelected(o);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => deleteOrder(o._id)}
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

      {/* Create Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fournisseur *</Label>
                <Select
                  value={form.supplier}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, supplier: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de livraison prevue</Label>
                <Input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expectedDeliveryDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <Label className="mb-2 block">Articles</Label>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="Description..."
                      value={item.description}
                      onChange={(e) =>
                        updateItem(idx, "description", e.target.value)
                      }
                    />
                    <Input
                      className="w-20"
                      type="number"
                      placeholder="Qte"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "quantity",
                          Number(e.target.value) || 0
                        )
                      }
                    />
                    <Input
                      className="w-28"
                      type="number"
                      placeholder="Prix"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "unitPrice",
                          Number(e.target.value) || 0
                        )
                      }
                    />
                    <div className="w-24 text-right text-sm font-medium shrink-0">
                      {fmtMoney((item.quantity || 1) * (item.unitPrice || 0))}
                    </div>
                    {form.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 shrink-0"
                        onClick={() => removeItem(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addItem}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un article
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frais de livraison</Label>
                <Input
                  type="number"
                  value={form.shipping || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      shipping: Number(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Mode de paiement</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, paymentMethod: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end border-t pt-3">
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">
                  Sous-total : {fmtMoney(formSubtotal)}
                </div>
                {form.shipping > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Livraison : {fmtMoney(form.shipping)}
                  </div>
                )}
                <div className="text-lg font-bold">
                  Total : {fmtMoney(formTotal)}
                </div>
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              <Plus className="h-4 w-4 mr-2" />
              Creer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono">{selected.number}</span>
                <Badge
                  className={`${statusColors[selected.status] || ""} border-0`}
                >
                  {statusLabels[selected.status] || selected.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Fournisseur</span>
                  <div className="font-medium">
                    {getSupplierName(selected.supplier)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <div className="font-medium">
                    {fmtDate(selected.createdAt)}
                  </div>
                </div>
                {selected.expectedDeliveryDate && (
                  <div>
                    <span className="text-muted-foreground">
                      Livraison prevue
                    </span>
                    <div className="font-medium">
                      {fmtDate(selected.expectedDeliveryDate)}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Paiement</span>
                  <div className="font-medium">
                    {paymentLabels[selected.paymentMethod] ||
                      selected.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-3">
                <div className="font-semibold mb-2">Articles</div>
                <div className="space-y-1.5">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>
                        {item.description}
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground">
                            {" "}
                            x{item.quantity}
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {fmtMoney(
                          item.total || item.quantity * item.unitPrice
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{fmtMoney(selected.subtotal)}</span>
                </div>
                {selected.shipping > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>{fmtMoney(selected.shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{fmtMoney(selected.total)}</span>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-3 text-muted-foreground">
                  {selected.notes}
                </div>
              )}

              {/* Status workflow buttons */}
              {statusFlow[selected.status] &&
                statusFlow[selected.status].length > 0 && (
                  <div className="border-t pt-3">
                    <div className="font-semibold mb-2">
                      Changer le statut
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statusFlow[selected.status].map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          variant={
                            nextStatus === "annulee"
                              ? "destructive"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            updateStatus(selected._id, nextStatus)
                          }
                        >
                          {nextStatus === "envoyee" && (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          {nextStatus === "confirmee" && (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          {nextStatus === "en_transit" && (
                            <Truck className="h-4 w-4 mr-1" />
                          )}
                          {nextStatus === "livree" && (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          {statusLabels[nextStatus]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const win = window.open("", "_blank");
                  if (!win) return;
                  const itemsHtml = selected.items
                    .map(
                      (it) =>
                        `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${it.description}${it.quantity > 1 ? ` x${it.quantity}` : ""}</span><span>${fmtMoney(it.total || it.quantity * it.unitPrice)}</span></div>`
                    )
                    .join("");
                  win.document.write(`<html><head><title>${selected.number}</title>
                    <style>body{font-family:Arial,sans-serif;max-width:500px;margin:20px auto;font-size:13px}
                    .title{text-align:center;font-size:16px;font-weight:bold;margin-bottom:4px}
                    .mono{font-family:monospace;text-align:center;font-size:14px}
                    .meta{color:#888;text-align:center;margin-bottom:12px}
                    .sep{border-top:1px solid #ddd;padding-top:8px;margin-top:8px}
                    .total{font-weight:bold;font-size:15px;display:flex;justify-content:space-between}
                    @media print{body{margin:0}}</style></head>
                    <body>
                    <div class="title">BON DE COMMANDE</div>
                    <div class="mono">${selected.number}</div>
                    <div class="meta">${fmtDate(selected.createdAt)} — ${getSupplierName(selected.supplier)}</div>
                    <div class="sep">${itemsHtml}</div>
                    <div class="sep total"><span>Total</span><span>${fmtMoney(selected.total)}</span></div>
                    <div class="meta" style="margin-top:8px">${paymentLabels[selected.paymentMethod] || selected.paymentMethod}</div>
                    ${selected.notes ? `<div class="sep" style="color:#888">${selected.notes}</div>` : ""}
                    </body></html>`);
                  win.document.close();
                  win.print();
                }}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500"
                onClick={() => {
                  setDetailOpen(false);
                  deleteOrder(selected._id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
