import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Landmark, Clock, CheckCircle, AlertTriangle, Plus, Pencil, Trash2,
  Eye, ArrowUpDown, ArrowUp, ArrowDown, Search, X, Banknote, FileText,
} from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { SendWhatsAppButton } from "@/components/SendWhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatFCFA(n?: number): string {
  if (n == null) return "0 F";
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

interface Payment {
  _id: string;
  amount: number;
  method: string;
  date: string;
  notes: string;
}

interface Creance {
  _id: string;
  number: string;
  status: string;
  client?: { _id: string; name: string; phone: string };
  invoiceId?: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  amountPaid: number;
  dueDate?: string;
  payments: Payment[];
  notes: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  partielle: { label: "Partielle", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  soldee: { label: "Soldee", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  annulee: { label: "Annulee", color: "bg-muted text-muted-foreground line-through" },
};

const methodLabels: Record<string, string> = {
  especes: "Especes",
  mobile_money: "Mobile Money",
  virement: "Virement",
  cheque: "Cheque",
  carte: "Carte",
  autre: "Autre",
};

type SortField = "number" | "client" | "amount" | "remaining" | "dueDate" | "status";
type SortDir = "asc" | "desc";

const CreancesPage = () => {
  const navigate = useNavigate();
  const [creances, setCreances] = useState<Creance[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Creance | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    dueDate: "",
    notes: "",
  });

  // Detail/payment dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCreance, setDetailCreance] = useState<Creance | null>(null);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Sync créances from invoices with remaining balance
      await fetch("/api/creances/sync-invoices", { method: "POST", headers: getHeaders() });
      const [cRes, clRes] = await Promise.all([
        fetch("/api/creances", { headers: getHeaders() }),
        fetch("/api/clients", { headers: getHeaders() }),
      ]);
      if (cRes.ok) setCreances(await cRes.json());
      if (clRes.ok) setClients(await clRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "amount" || field === "remaining" ? "desc" : "asc"); }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const hasActiveFilters = search || filterStatus !== "all";

  const filtered = creances.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.number.toLowerCase().includes(q) ||
        (c.client?.name || "").toLowerCase().includes(q) ||
        c.invoiceNumber.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "number": return dir * a.number.localeCompare(b.number);
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "amount": return dir * (a.amount - b.amount);
      case "remaining": return dir * ((a.amount - a.amountPaid) - (b.amount - b.amountPaid));
      case "dueDate": return dir * ((a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0));
      case "status": return dir * a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  function openNew() {
    setEditing(null);
    setForm({ clientId: "", description: "", amount: "", dueDate: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(c: Creance) {
    setEditing(c);
    setForm({
      clientId: c.client?._id || "",
      description: c.description,
      amount: String(c.amount),
      dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split("T")[0] : "",
      notes: c.notes,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { toast.error("Montant invalide"); return; }
    setSaving(true);
    try {
      const body = {
        client: form.clientId || undefined,
        description: form.description,
        amount: amt,
        dueDate: form.dueDate || undefined,
        notes: form.notes,
      };
      if (editing) {
        const res = await fetch(`/api/creances/${editing._id}`, {
          method: "PUT", headers: getHeaders(), body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setCreances((prev) => prev.map((c) => c._id === updated._id ? updated : c));
          toast.success("Creance modifiee");
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      } else {
        const res = await fetch("/api/creances", {
          method: "POST", headers: getHeaders(), body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setCreances((prev) => [created, ...prev]);
          toast.success(`Creance ${created.number} creee`);
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  }

  function openDetail(c: Creance) {
    setDetailCreance(c);
    setPaymentAmount(String(Math.max(0, c.amount - c.amountPaid)));
    setPaymentMethod("especes");
    setPaymentNotes("");
    setDetailOpen(true);
  }

  async function handleAddPayment() {
    if (!detailCreance) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { toast.error("Montant invalide"); return; }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/creances/${detailCreance._id}/payment`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ amount: amt, method: paymentMethod, notes: paymentNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCreances((prev) => prev.map((c) => c._id === updated._id ? updated : c));
        setDetailCreance(updated);
        toast.success("Paiement enregistre");
        setPaymentAmount(String(Math.max(0, updated.amount - updated.amountPaid)));
        setPaymentNotes("");
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
    setPaymentSaving(false);
  }

  async function handleDeletePayment(paymentId: string) {
    if (!detailCreance || !confirm("Supprimer ce paiement ?")) return;
    try {
      const res = await fetch(`/api/creances/${detailCreance._id}/payment/${paymentId}`, {
        method: "DELETE", headers: getHeaders(),
      });
      if (res.ok) {
        const updated = await res.json();
        setCreances((prev) => prev.map((c) => c._id === updated._id ? updated : c));
        setDetailCreance(updated);
        toast.success("Paiement supprime");
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDelete(c: Creance) {
    if (!confirm(`Supprimer la creance ${c.number} ?`)) return;
    setDeleting(c._id);
    try {
      const res = await fetch(`/api/creances/${c._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        setCreances((prev) => prev.filter((i) => i._id !== c._id));
        toast.success("Creance supprimee");
        if (detailCreance?._id === c._id) setDetailOpen(false);
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
    setDeleting(null);
  }

  // Stats
  const activeCreances = creances.filter((c) => c.status !== "annulee" && c.status !== "soldee");
  const totalOwed = activeCreances.reduce((s, c) => s + Math.max(0, c.amount - c.amountPaid), 0);
  const overdueCount = activeCreances.filter((c) => c.dueDate && new Date(c.dueDate) < new Date()).length;
  const soldeeCount = creances.filter((c) => c.status === "soldee").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Creances</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Suivi des creances et encaissements clients</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle creance
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Creances actives" value={String(activeCreances.length)} icon={Landmark} />
        <StatCard label="Montant total du" value={formatFCFA(totalOwed)} icon={AlertTriangle} />
        <StatCard label="En retard" value={String(overdueCount)} icon={Clock} />
        <StatCard label="Soldees" value={String(soldeeCount)} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher n°, client, facture..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="partielle">Partielle</SelectItem>
            <SelectItem value="soldee">Soldee</SelectItem>
            <SelectItem value="annulee">Annulee</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">{filtered.length} / {creances.length}</span>
        )}
      </div>

      {loading ? (
        <StockLoader />
      ) : creances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Landmark className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm mb-3">Aucune creance</p>
          <Button variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter une creance
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm mb-2">Aucun resultat</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer les filtres
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <button onClick={() => toggleSort("number")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    N° {getSortIcon("number")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("client")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Client {getSortIcon("client")}
                  </button>
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider">Facture</TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("amount")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors justify-end w-full">
                    Montant {getSortIcon("amount")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("remaining")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors justify-end w-full">
                    Reste {getSortIcon("remaining")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("dueDate")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Echeance {getSortIcon("dueDate")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("status")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Statut {getSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c) => {
                const sc = statusConfig[c.status] || statusConfig.en_cours;
                const remaining = Math.max(0, c.amount - c.amountPaid);
                const isOverdue = c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "soldee" && c.status !== "annulee";
                return (
                  <TableRow key={c._id} className="hover:bg-accent/50 transition-colors animate-row">
                    <TableCell className="font-mono text-xs font-medium text-foreground">{c.number}</TableCell>
                    <TableCell className="font-medium text-sm">{c.client?.name || "—"}</TableCell>
                    <TableCell>
                      {c.invoiceId ? (
                        <button onClick={() => navigate(`/commerce/factures/${c.invoiceId}`)}
                          className="font-mono text-xs text-primary hover:underline">
                          {c.invoiceNumber}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatFCFA(c.amount)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-medium ${remaining > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {formatFCFA(remaining)}
                    </TableCell>
                    <TableCell className={`text-sm ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      {formatDate(c.dueDate)}
                      {isOverdue && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {c.invoiceId ? (
                          <button title={`Voir facture ${c.invoiceNumber}`} onClick={() => navigate(`/commerce/factures/${c.invoiceId}`)}
                            className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button title="Voir details" onClick={() => openDetail(c)}
                            className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {c.status !== "soldee" && c.status !== "annulee" && (
                          <button title="Enregistrer un paiement" onClick={() => openDetail(c)}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                            <Banknote className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {c.status !== "soldee" && c.status !== "annulee" && c.client?.phone && (
                          <SendWhatsAppButton
                            type="debt-reminder"
                            id={c._id}
                            clientPhone={c.client.phone}
                            label="Relance"
                            size="sm"
                            variant="ghost"
                          />
                        )}
                        {!c.invoiceId && (
                          <button title="Modifier" onClick={() => openEdit(c)}
                            className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title="Supprimer" onClick={() => handleDelete(c)} disabled={deleting === c._id}
                          className="p-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la creance" : "Nouvelle creance"}</DialogTitle>
            <DialogDescription>{editing ? `Modification de ${editing.number}` : "Ajouter une creance manuelle"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Montant de la creance" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description de la creance" />
            </div>
            <div className="space-y-2">
              <Label>Echeance</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.amount}>
              {saving ? "Enregistrement..." : editing ? "Sauvegarder" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Payment Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Creance {detailCreance?.number}</DialogTitle>
            <DialogDescription>
              {detailCreance?.client?.name || "Sans client"}
              {detailCreance?.invoiceNumber ? ` — Facture ${detailCreance.invoiceNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailCreance && (() => {
            const remaining = Math.max(0, detailCreance.amount - detailCreance.amountPaid);
            const pct = detailCreance.amount > 0 ? Math.min(100, Math.round((detailCreance.amountPaid / detailCreance.amount) * 100)) : 0;
            return (
              <div className="space-y-4 py-2">
                {/* Progress */}
                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono font-medium">{formatFCFA(detailCreance.amount)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-500">Paye : {formatFCFA(detailCreance.amountPaid)}</span>
                    <span className={remaining > 0 ? "text-red-500" : "text-emerald-500"}>Reste : {formatFCFA(remaining)}</span>
                  </div>
                </div>

                {detailCreance.description && (
                  <p className="text-sm text-muted-foreground">{detailCreance.description}</p>
                )}

                {detailCreance.dueDate && (
                  <p className="text-sm text-muted-foreground">
                    Echeance : <span className={new Date(detailCreance.dueDate) < new Date() && remaining > 0 ? "text-red-500 font-medium" : ""}>{formatDate(detailCreance.dueDate)}</span>
                  </p>
                )}

                {/* Payment history */}
                {detailCreance.payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Historique des paiements</h4>
                    <div className="rounded-md border border-border divide-y divide-border">
                      {detailCreance.payments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <span className="text-sm font-mono font-medium text-emerald-500">{formatFCFA(p.amount)}</span>
                            <span className="text-xs text-muted-foreground ml-2">{methodLabels[p.method] || p.method}</span>
                            {p.notes && <span className="text-xs text-muted-foreground ml-2">— {p.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                            <button onClick={() => handleDeletePayment(p._id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add payment */}
                {remaining > 0 && detailCreance.status !== "annulee" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Nouveau paiement</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Montant</Label>
                        <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Methode</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="especes">Especes</SelectItem>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="virement">Virement</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="carte">Carte</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Input placeholder="Notes (optionnel)" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
                    <Button onClick={handleAddPayment} disabled={paymentSaving} className="w-full">
                      <Banknote className="h-4 w-4 mr-1" />
                      {paymentSaving ? "Enregistrement..." : "Enregistrer le paiement"}
                    </Button>
                  </div>
                )}

                {detailCreance.notes && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes :</p>
                    <p className="text-sm">{detailCreance.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreancesPage;
