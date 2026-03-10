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
  ShoppingBag,
  Loader2,
  Eye,
  Trash2,
  Plus,
  Pencil,
  X,
  Printer,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface PurchaseItem {
  _id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Purchase {
  _id: string;
  number: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  notes: string;
  paymentMethod: string;
  category: string;
  supplier: string;
  createdAt: string;
}

interface Stats {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  todayCount: number;
}

const paymentLabels: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  carte: "Carte",
};

const defaultCategories = [
  "general",
  "fournitures",
  "nourriture",
  "transport",
  "services",
  "materiel",
  "autre",
];

const categoryLabels: Record<string, string> = {
  general: "Général",
  fournitures: "Fournitures",
  nourriture: "Nourriture",
  transport: "Transport",
  services: "Services",
  materiel: "Matériel",
  autre: "Autre",
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

export default function AchatsQuotidiensPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "general",
    supplier: "",
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
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/daily-purchases`, { headers }),
        fetch(`/api/daily-purchases/stats`, { headers }),
      ]);
      if (pRes.ok) setPurchases(await pRes.json());
      if (sRes.ok) setStats(await sRes.json());
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

  // Filter
  const filtered = purchases.filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.number.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.items.some((i) => i.description.toLowerCase().includes(q)) ||
        p.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Purchase[]>>((acc, p) => {
    const key = new Date(p.date).toLocaleDateString("fr-FR");
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      category: "general",
      supplier: "",
      paymentMethod: "especes",
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (p: Purchase) => {
    setEditId(p._id);
    setForm({
      date: new Date(p.date).toISOString().split("T")[0],
      category: p.category,
      supplier: p.supplier,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
      items: p.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
    setFormOpen(true);
  };

  // Add item row
  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }],
    }));
  };

  // Remove item row
  const removeItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));
  };

  // Update item field
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

  // Save (create or update)
  const handleSave = async () => {
    const validItems = form.items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins un article");
      return;
    }
    try {
      const url = editId
        ? `/api/daily-purchases/${editId}`
        : `/api/daily-purchases`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          date: form.date,
          category: form.category,
          supplier: form.supplier.trim(),
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
          items: validItems,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(editId ? "Achat modifié" : "Achat enregistré");
      setFormOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete
  const deletePurchase = async (id: string) => {
    if (!confirm("Supprimer cet achat ?")) return;
    try {
      await fetch(`/api/daily-purchases/${id}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Supprimé");
      setPurchases((prev) => prev.filter((p) => p._id !== id));
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
          <h1 className="text-2xl font-bold">Achats quotidiens</h1>
          <p className="text-muted-foreground">
            Suivi des dépenses et achats du quotidien
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel achat
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 bg-blue-500/10">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.todayCount}
            </div>
            <div className="text-sm text-muted-foreground">
              Achats aujourd'hui
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-amber-500/10">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {fmtMoney(stats.todayTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              Dépenses du jour
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-purple-500/10">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {fmtMoney(stats.weekTotal)}
            </div>
            <div className="text-sm text-muted-foreground">Cette semaine</div>
          </div>
          <div className="rounded-lg border p-4 bg-green-500/10">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {fmtMoney(stats.monthTotal)}
            </div>
            <div className="text-sm text-muted-foreground">Ce mois</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un achat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {defaultCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabels[c] || c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Purchase list grouped by date */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun achat</h3>
          <p className="text-muted-foreground">
            {purchases.length === 0
              ? "Enregistrez votre premier achat quotidien"
              : "Aucun résultat pour ces filtres"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, dayPurchases]) => {
            const dayTotal = dayPurchases.reduce(
              (s, p) => s + p.subtotal,
              0
            );
            return (
              <div key={dateStr}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    {dateStr}
                  </h3>
                  <span className="text-sm font-medium">
                    {fmtMoney(dayTotal)}
                  </span>
                </div>
                <div className="rounded-lg border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {dayPurchases.map((p) => (
                        <tr
                          key={p._id}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="p-3 font-mono text-xs w-28">
                            {p.number}
                          </td>
                          <td className="p-3">
                            <div className="font-medium">
                              {p.items.length === 1
                                ? p.items[0].description
                                : `${p.items.length} articles`}
                            </div>
                            {p.supplier && (
                              <div className="text-xs text-muted-foreground">
                                {p.supplier}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-0 text-xs">
                              {categoryLabels[p.category] || p.category}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {paymentLabels[p.paymentMethod] || p.paymentMethod}
                          </td>
                          <td className="p-3 text-right font-bold">
                            {fmtMoney(p.subtotal)}
                          </td>
                          <td className="p-3 text-right w-28">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelected(p);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(p)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => deletePurchase(p._id)}
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
              </div>
            );
          })}
        </div>
      )}

      {/* =========== CREATE / EDIT DIALOG =========== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Modifier l'achat" : "Nouvel achat"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabels[c] || c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fournisseur / Lieu</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplier: e.target.value }))
                  }
                  placeholder="Nom du vendeur ou lieu..."
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
                      placeholder="Qté"
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

            <div className="flex justify-end border-t pt-3">
              <div className="text-lg font-bold">
                Total : {fmtMoney(formSubtotal)}
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
              {editId ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========== DETAIL DIALOG =========== */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono">{selected.number}</span>
                <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-0">
                  {categoryLabels[selected.category] || selected.category}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <div className="font-medium">{fmtDate(selected.date)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Paiement</span>
                  <div className="font-medium">
                    {paymentLabels[selected.paymentMethod] ||
                      selected.paymentMethod}
                  </div>
                </div>
                {selected.supplier && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">
                      Fournisseur / Lieu
                    </span>
                    <div className="font-medium">{selected.supplier}</div>
                  </div>
                )}
              </div>

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
                        {fmtMoney(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{fmtMoney(selected.subtotal)}</span>
              </div>

              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-3 text-muted-foreground">
                  {selected.notes}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(selected);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const win = window.open("", "_blank");
                  if (!win) return;
                  const itemsHtml = selected.items
                    .map(
                      (it) =>
                        `<div style="display:flex;justify-content:space-between"><span>${it.description}${it.quantity > 1 ? ` x${it.quantity}` : ""}</span><span>${fmtMoney(it.total)}</span></div>`
                    )
                    .join("");
                  win.document.write(`<html><head><title>${selected.number}</title>
                    <style>body{font-family:Arial,sans-serif;max-width:400px;margin:20px auto;font-size:13px}
                    .title{text-align:center;font-size:16px;font-weight:bold;margin-bottom:4px}
                    .mono{font-family:monospace;text-align:center;font-size:14px}
                    .meta{color:#888;text-align:center;margin-bottom:12px}
                    .sep{border-top:1px solid #ddd;padding-top:8px;margin-top:8px}
                    .total{font-weight:bold;font-size:15px;display:flex;justify-content:space-between}
                    @media print{body{margin:0}}</style></head>
                    <body>
                    <div class="title">ACHAT</div>
                    <div class="mono">${selected.number}</div>
                    <div class="meta">${fmtDate(selected.date)}${selected.supplier ? ` — ${selected.supplier}` : ""}</div>
                    <div class="sep">${itemsHtml}</div>
                    <div class="sep total"><span>Total</span><span>${fmtMoney(selected.subtotal)}</span></div>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
