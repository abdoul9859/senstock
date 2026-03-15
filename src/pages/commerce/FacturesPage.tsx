import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDraftSync } from "@/hooks/useDraftSync";
import { DraftBanner } from "@/components/DraftBanner";
import {
  FileText, Clock, CheckCircle, AlertTriangle, Plus, Download,
  Eye, Pencil, Printer, Trash2, Send, Copy, XCircle, Undo2, Banknote,
  ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Zap, Search, X, Truck, CreditCard,
} from "lucide-react";
import { StatCard, StockCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { exportToCsv } from "@/lib/exportCsv";
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

interface Invoice {
  _id: string;
  number: string;
  type: string;
  status: string;
  client?: { _id: string; name: string; phone: string; email: string };
  date: string;
  dueDate?: string;
  total: number;
  payment?: { enabled: boolean; amount: number; method: string; date: string };
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  envoyee: { label: "Envoyee", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  payee: { label: "Payee", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  partielle: { label: "Partielle", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  en_retard: { label: "En retard", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  annulee: { label: "Annulee", color: "bg-muted text-muted-foreground line-through" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  facture: { label: "Facture", color: "bg-primary/10 text-primary" },
  proforma: { label: "Proforma", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  avoir: { label: "Avoir", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  echange: { label: "Echange", color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  vente_flash: { label: "Vente flash", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

type SortField = "number" | "type" | "client" | "date" | "dueDate" | "total" | "status";
type SortDir = "asc" | "desc";

const FacturesPage = () => {
  const navigate = useNavigate();
  const { otherDrafts } = useDraftSync({ type: "invoice" });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchInvoices = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm?.trim()) params.set("search", searchTerm.trim());
      const url = "/api/invoices" + (params.toString() ? `?${params}` : "");
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) setInvoices(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Debounced search for IMEI/barcode
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchInvoices]);

  // Sort
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "total" ? "desc" : "asc");
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const hasActiveFilters = search || filterType !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo;

  const filtered = invoices.filter((inv) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        inv.number.toLowerCase().includes(q) ||
        (inv.client?.name || "").toLowerCase().includes(q) ||
        (inv.client?.phone || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterType !== "all" && inv.type !== filterType) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterDateFrom && new Date(inv.date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(inv.date) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "number": return dir * a.number.localeCompare(b.number);
      case "type": return dir * a.type.localeCompare(b.type);
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "date": return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case "dueDate": return dir * ((a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0));
      case "total": return dir * ((a.total || 0) - (b.total || 0));
      case "status": return dir * a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  // Delete
  async function handleDelete(inv: Invoice) {
    if (!confirm(`Supprimer la facture ${inv.number} ?`)) return;
    setDeleting(inv._id);
    try {
      const res = await fetch(`/api/invoices/${inv._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        toast.success("Facture supprimee");
        setInvoices((prev) => prev.filter((i) => i._id !== inv._id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setDeleting(null);
  }

  // Validate (brouillon → envoyee)
  async function handleValidate(inv: Invoice) {
    try {
      const res = await fetch(`/api/invoices/${inv._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: "envoyee" }),
      });
      if (res.ok) {
        toast.success(`Facture ${inv.number} validée`);
        setInvoices((prev) => prev.map((i) => i._id === inv._id ? { ...i, status: "envoyee" } : i));
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  // Generate delivery note
  async function handleGenerateBL(inv: Invoice) {
    try {
      const res = await fetch(`/api/delivery-notes/from-invoice/${inv._id}`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify({}),
      });
      if (res.ok) {
        const bl = await res.json();
        toast.success(`BL ${bl.number} cree`);
        navigate(`/commerce/bons-livraison/${bl._id}`);
      } else {
        const data = await res.json();
        if (data.existingId) {
          toast.error("Un BL existe deja");
          navigate(`/commerce/bons-livraison/${data.existingId}`);
        } else {
          toast.error(data.error || "Erreur");
        }
      }
    } catch { toast.error("Erreur de connexion"); }
  }

  // Duplicate
  async function handleDuplicate(inv: Invoice) {
    try {
      const detail = await fetch(`/api/invoices/${inv._id}`, { headers: getHeaders() });
      if (!detail.ok) { toast.error("Impossible de charger la facture"); return; }
      const src = await detail.json();
      const body = {
        type: src.type,
        client: src.client?._id || src.client,
        items: (src.items || []).map((it: any) => ({
          type: it.type, productId: it.productId?._id || it.productId,
          variantId: it.variantId, description: it.description,
          quantity: it.quantity, unitPrice: it.unitPrice,
          purchasePrice: it.purchasePrice, total: it.total,
        })),
        subtotal: src.subtotal, showTax: src.showTax, taxRate: src.taxRate,
        taxAmount: src.taxAmount, total: src.total,
        showItemPrices: src.showItemPrices, showSectionTotals: src.showSectionTotals,
        notes: src.notes || "",
      };
      const res = await fetch("/api/invoices", {
        method: "POST", headers: getHeaders(), body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success(`Facture dupliquée : ${created.number}`);
        setInvoices((prev) => [created, ...prev]);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  // Revert to brouillon
  async function handleRevertBrouillon(inv: Invoice) {
    if (!confirm(`Remettre la facture ${inv.number} en brouillon ?`)) return;
    try {
      const res = await fetch(`/api/invoices/${inv._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status: "brouillon", payment: { enabled: false, amount: 0, method: "especes" } }),
      });
      if (res.ok) {
        toast.success(`${inv.number} remise en brouillon`);
        setInvoices((prev) => prev.map((i) => i._id === inv._id ? { ...i, status: "brouillon" } : i));
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  // Cancel payment
  async function handleCancelPayment(inv: Invoice) {
    if (!confirm(`Annuler le paiement de la facture ${inv.number} ?`)) return;
    try {
      const res = await fetch(`/api/invoices/${inv._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ payment: { enabled: false, amount: 0, method: "especes" } }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success(`Paiement annule pour ${inv.number}`);
        setInvoices((prev) => prev.map((i) => i._id === inv._id ? { ...i, status: updated.status } : i));
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  // Open payment dialog
  function openPaymentDialog(inv: Invoice) {
    setPaymentTarget(inv);
    const remaining = inv.payment?.enabled ? Math.max(0, (inv.total || 0) - (inv.payment.amount || 0)) : (inv.total || 0);
    setPaymentAmount(String(remaining));
    setPaymentMethod("especes");
    setPaymentDialogOpen(true);
  }

  // Submit payment
  async function handleSubmitPayment() {
    if (!paymentTarget) return;
    const newAmount = parseFloat(paymentAmount) || 0;
    if (newAmount <= 0) { toast.error("Montant invalide"); return; }
    // Cumulate with existing payment
    const previousAmount = paymentTarget.payment?.enabled ? (paymentTarget.payment.amount || 0) : 0;
    const totalPaid = previousAmount + newAmount;
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/invoices/${paymentTarget._id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          payment: {
            enabled: true,
            amount: totalPaid,
            method: paymentMethod,
            date: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success(`Paiement enregistre pour ${paymentTarget.number}`);
        setInvoices((prev) => prev.map((i) => i._id === paymentTarget._id ? { ...i, status: updated.status, payment: updated.payment } : i));
        setPaymentDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setPaymentSaving(false);
  }

  // Stats
  const totalInvoices = invoices.length;
  const pendingCount = invoices.filter((i) => i.status === "brouillon" || i.status === "envoyee").length;
  const paidCount = invoices.filter((i) => i.status === "payee").length;
  const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);

  // Payment stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidInvoices = invoices.filter((i) => (i.status === "payee" || i.status === "partielle") && i.payment?.enabled);
  const paidThisMonth = paidInvoices.filter((i) => i.payment?.date && new Date(i.payment.date) >= monthStart);
  const paidThisMonthAmount = paidThisMonth.reduce((s, i) => s + (i.payment?.amount || 0), 0);
  const awaitingInvoices = invoices.filter((i) => i.status === "envoyee" || i.status === "partielle");
  const awaitingAmount = awaitingInvoices.reduce((s, i) => {
    const paid = i.payment?.enabled ? (i.payment.amount || 0) : 0;
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "en_retard");
  const overdueAmount = overdueInvoices.reduce((s, i) => {
    const paid = i.payment?.enabled ? (i.payment.amount || 0) : 0;
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);

  return (
    <div>
      <DraftBanner
        drafts={otherDrafts}
        className="mb-4"
        onResume={() => navigate("/commerce/factures/nouveau")}
      />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Factures</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des factures, proformas, avoirs et echanges</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToCsv("factures", sorted, [
            { header: "Numero", accessor: (i) => i.number },
            { header: "Type", accessor: (i) => typeConfig[i.type]?.label || i.type },
            { header: "Client", accessor: (i) => i.client?.name || "" },
            { header: "Date", accessor: (i) => formatDate(i.date) },
            { header: "Echeance", accessor: (i) => formatDate(i.dueDate) },
            { header: "Total", accessor: (i) => i.total || 0 },
            { header: "Statut", accessor: (i) => statusConfig[i.status]?.label || i.status },
          ])}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button onClick={() => navigate("/commerce/factures/nouvelle")}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle facture
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total factures" value={String(totalInvoices)} icon={FileText} />
        <StatCard label="En attente" value={String(pendingCount)} icon={Clock} />
        <StatCard label="Payees" value={String(paidCount)} icon={CheckCircle} />
        <StatCard label="Montant total" value={formatFCFA(totalAmount)} icon={AlertTriangle} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StockCard title="Paiements recus" subtitle={`${paidThisMonth.length} ce mois — ${formatFCFA(paidThisMonthAmount)}`} icon={CreditCard} status="active" />
        <StockCard title="En attente" subtitle={`${awaitingInvoices.length} paiement${awaitingInvoices.length > 1 ? "s" : ""} — ${formatFCFA(awaitingAmount)}`} icon={CreditCard} status="warning" />
        <StockCard title="En retard" subtitle={`${overdueInvoices.length} paiement${overdueInvoices.length > 1 ? "s" : ""} — ${formatFCFA(overdueAmount)}`} icon={CreditCard} status="inactive" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3" role="search">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher n°, client, IMEI, code-barres..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
            aria-label="Rechercher des factures"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="facture">Facture</SelectItem>
            <SelectItem value="proforma">Proforma</SelectItem>
            <SelectItem value="avoir">Avoir</SelectItem>
            <SelectItem value="echange">Echange</SelectItem>
            <SelectItem value="vente_flash">Vente flash</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoyee">Envoyee</SelectItem>
            <SelectItem value="payee">Payee</SelectItem>
            <SelectItem value="partielle">Partielle</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
            <SelectItem value="annulee">Annulee</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDateFrom}
          onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
          className="w-[140px] h-9"
          title="Date debut"
          aria-label="Date debut"
        />
        <Input
          type="date"
          value={filterDateTo}
          onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
          className="w-[140px] h-9"
          title="Date fin"
          aria-label="Date fin"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); setPage(1); }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} / {invoices.length} facture{invoices.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune facture"
          description="Creez votre premiere facture pour commencer"
          action={{ label: "Creer votre premiere facture", onClick: () => navigate("/commerce/factures/nouvelle") }}
        />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm mb-2">Aucune facture ne correspond aux filtres</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Effacer les filtres
          </Button>
        </div>
      ) : (
        <>
        <div className="rounded-lg border border-border overflow-hidden" aria-live="polite">
          <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <button onClick={() => toggleSort("number")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Numero {getSortIcon("number")}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("type")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Type {getSortIcon("type")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("client")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Client {getSortIcon("client")}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("date")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Date {getSortIcon("date")}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("dueDate")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Echeance {getSortIcon("dueDate")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("total")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors justify-end w-full">
                    Montant {getSortIcon("total")}
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
              {sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inv) => {
                const sc = statusConfig[inv.status] || statusConfig.brouillon;
                const tc = typeConfig[inv.type] || typeConfig.facture;
                const isDeleting = deleting === inv._id;
                return (
                  <TableRow key={inv._id + '-' + page} className="hover:bg-accent/50 transition-colors group animate-row">
                    <TableCell className="font-mono text-xs font-medium text-foreground">{inv.number}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tc.color}`}>
                        {inv.type === "echange" && <RefreshCw className="h-3 w-3" />}
                        {inv.type === "vente_flash" && <Zap className="h-3 w-3" />}
                        {tc.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {inv.client?.name || (inv.type === "vente_flash" ? <span className="text-muted-foreground italic">Vente flash</span> : "—")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(inv.date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      <div>{formatFCFA(inv.total)}</div>
                      {inv.status === "partielle" && inv.payment?.enabled && (
                        <>
                          <div className="text-[11px] text-amber-500 font-normal mt-0.5">
                            Paye : {formatFCFA(inv.payment.amount)}
                          </div>
                          <div className="text-[11px] text-red-500 font-normal">
                            Reste : {formatFCFA(inv.total - inv.payment.amount)}
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}${inv.status === "en_retard" ? " badge-pulse" : ""}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Voir"
                          aria-label="Voir la facture"
                          onClick={() => navigate(`/commerce/factures/${inv._id}`)}
                          className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Modifier"
                          aria-label="Modifier la facture"
                          onClick={() => navigate(`/commerce/factures/modifier/${inv._id}`)}
                          className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {inv.status === "brouillon" && (
                          <button
                            title="Valider et envoyer"
                            onClick={() => handleValidate(inv)}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {inv.status !== "payee" && (
                          <button
                            title="Enregistrer un paiement"
                            onClick={() => openPaymentDialog(inv)}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(inv.status === "payee" || inv.status === "partielle") && (
                          <button
                            title="Annuler le paiement"
                            onClick={() => handleCancelPayment(inv)}
                            className="p-1.5 rounded-md border border-orange-500/40 text-orange-500 hover:bg-orange-500/10 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {inv.status !== "brouillon" && (
                          <button
                            title="Remettre en brouillon"
                            onClick={() => handleRevertBrouillon(inv)}
                            className="p-1.5 rounded-md border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {inv.status !== "brouillon" && (
                          <button
                            title="Generer bon de livraison"
                            onClick={() => handleGenerateBL(inv)}
                            className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                          >
                            <Truck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Imprimer"
                          onClick={() => navigate(`/commerce/factures/${inv._id}?print=true`)}
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Dupliquer"
                          onClick={() => handleDuplicate(inv)}
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Supprimer"
                          onClick={() => handleDelete(inv)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
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
        </div>
        <Pagination page={page} totalPages={Math.ceil(sorted.length / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              {paymentTarget && `Facture ${paymentTarget.number} — Total : ${formatFCFA(paymentTarget.total)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Montant</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Montant du paiement"
              />
            </div>
            <div className="space-y-2">
              <Label>Methode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitPayment} disabled={paymentSaving}>
              {paymentSaving ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacturesPage;
