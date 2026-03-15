import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDraftSync } from "@/hooks/useDraftSync";
import { DraftBanner } from "@/components/DraftBanner";
import {
  FilePlus, Clock, CheckCircle, AlertTriangle, Plus,
  Eye, Pencil, Trash2, Send, Copy, XCircle, ArrowRightCircle,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X,
} from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

interface Quote {
  _id: string;
  number: string;
  status: string;
  client?: { _id: string; name: string; phone: string; email: string };
  date: string;
  validUntil?: string;
  total: number;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  envoyee: { label: "Envoye", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  accepte: { label: "Accepte", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  refuse: { label: "Refuse", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
  expire: { label: "Expire", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  converti: { label: "Converti", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

type SortField = "number" | "client" | "date" | "validUntil" | "total" | "status";
type SortDir = "asc" | "desc";

const DevisPage = () => {
  const navigate = useNavigate();
  const { otherDrafts } = useDraftSync({ type: "devis" });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes", { headers: getHeaders() });
      if (res.ok) setQuotes(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

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

  const hasActiveFilters = search || filterStatus !== "all" || filterDateFrom || filterDateTo;

  const filtered = quotes.filter((q) => {
    if (search) {
      const s = search.toLowerCase();
      const match =
        q.number.toLowerCase().includes(s) ||
        (q.client?.name || "").toLowerCase().includes(s) ||
        (q.client?.phone || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    if (filterStatus !== "all" && q.status !== filterStatus) return false;
    if (filterDateFrom && new Date(q.date) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(q.date) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "number": return dir * a.number.localeCompare(b.number);
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "date": return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case "validUntil": return dir * ((a.validUntil ? new Date(a.validUntil).getTime() : 0) - (b.validUntil ? new Date(b.validUntil).getTime() : 0));
      case "total": return dir * ((a.total || 0) - (b.total || 0));
      case "status": return dir * a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  async function handleDelete(q: Quote) {
    if (!confirm(`Supprimer le devis ${q.number} ?`)) return;
    setDeleting(q._id);
    try {
      const res = await fetch(`/api/quotes/${q._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        toast.success("Devis supprime");
        setQuotes((prev) => prev.filter((i) => i._id !== q._id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setDeleting(null);
  }

  async function handleValidate(q: Quote) {
    try {
      const res = await fetch(`/api/quotes/${q._id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "envoyee" }),
      });
      if (res.ok) {
        toast.success(`Devis ${q.number} envoye`);
        setQuotes((prev) => prev.map((i) => i._id === q._id ? { ...i, status: "envoyee" } : i));
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleAccept(q: Quote) {
    try {
      const res = await fetch(`/api/quotes/${q._id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "accepte" }),
      });
      if (res.ok) {
        toast.success(`Devis ${q.number} accepte`);
        setQuotes((prev) => prev.map((i) => i._id === q._id ? { ...i, status: "accepte" } : i));
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleRefuse(q: Quote) {
    try {
      const res = await fetch(`/api/quotes/${q._id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: "refuse" }),
      });
      if (res.ok) {
        toast.success(`Devis ${q.number} refuse`);
        setQuotes((prev) => prev.map((i) => i._id === q._id ? { ...i, status: "refuse" } : i));
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleConvert(q: Quote) {
    if (!confirm(`Convertir le devis ${q.number} en facture ?`)) return;
    try {
      const res = await fetch(`/api/quotes/${q._id}/convert`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify({ invoiceType: "facture" }),
      });
      if (res.ok) {
        const invoice = await res.json();
        toast.success(`Facture ${invoice.number} creee a partir du devis`);
        setQuotes((prev) => prev.map((i) => i._id === q._id ? { ...i, status: "converti" } : i));
        navigate(`/commerce/factures/${invoice._id}`);
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDuplicate(q: Quote) {
    try {
      const detail = await fetch(`/api/quotes/${q._id}`, { headers: getHeaders() });
      if (!detail.ok) { toast.error("Impossible de charger le devis"); return; }
      const src = await detail.json();
      const body = {
        client: src.client?._id || src.client,
        items: (src.items || []).map((it: any) => ({
          type: it.type, productId: it.productId?._id || it.productId,
          description: it.description, quantity: it.quantity,
          unitPrice: it.unitPrice, total: it.total,
        })),
        subtotal: src.subtotal, showTax: src.showTax, taxRate: src.taxRate,
        taxAmount: src.taxAmount, total: src.total,
        showItemPrices: src.showItemPrices, showSectionTotals: src.showSectionTotals,
        notes: src.notes || "",
      };
      const res = await fetch("/api/quotes", {
        method: "POST", headers: getHeaders(), body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        toast.success(`Devis duplique : ${created.number}`);
        setQuotes((prev) => [created, ...prev]);
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  const totalQuotes = quotes.length;
  const pendingCount = quotes.filter((q) => q.status === "brouillon" || q.status === "envoyee").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepte").length;
  const totalAmount = quotes.reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div>
      <DraftBanner
        drafts={otherDrafts}
        className="mb-4"
        onResume={() => navigate("/commerce/devis/nouveau")}
      />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Devis</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion des devis et propositions commerciales</p>
        </div>
        <Button onClick={() => navigate("/commerce/devis/nouveau")}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau devis
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total devis" value={String(totalQuotes)} icon={FilePlus} />
        <StatCard label="En attente" value={String(pendingCount)} icon={Clock} />
        <StatCard label="Acceptes" value={String(acceptedCount)} icon={CheckCircle} />
        <StatCard label="Montant total" value={formatFCFA(totalAmount)} icon={AlertTriangle} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher n°, client, tel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
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
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoyee">Envoye</SelectItem>
            <SelectItem value="accepte">Accepte</SelectItem>
            <SelectItem value="refuse">Refuse</SelectItem>
            <SelectItem value="expire">Expire</SelectItem>
            <SelectItem value="converti">Converti</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-[140px] h-9" title="Date debut" />
        <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-[140px] h-9" title="Date fin" />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">{filtered.length} / {quotes.length} devis</span>
        )}
      </div>

      {loading ? (
        <StockLoader />
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FilePlus className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm mb-3">Aucun devis</p>
          <Button variant="outline" onClick={() => navigate("/commerce/devis/nouveau")}>
            <Plus className="h-4 w-4 mr-1" /> Creer votre premier devis
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm mb-2">Aucun devis ne correspond aux filtres</p>
          <Button variant="outline" size="sm"
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterDateFrom(""); setFilterDateTo(""); }}>
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
                    Numero {getSortIcon("number")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("client")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Client {getSortIcon("client")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("date")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Date {getSortIcon("date")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("validUntil")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Validite {getSortIcon("validUntil")}
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
              {sorted.map((q) => {
                const sc = statusConfig[q.status] || statusConfig.brouillon;
                const isDeleting = deleting === q._id;
                return (
                  <TableRow key={q._id} className="hover:bg-accent/50 transition-colors group animate-row">
                    <TableCell className="font-mono text-xs font-medium text-foreground">{q.number}</TableCell>
                    <TableCell className="font-medium text-sm">{q.client?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(q.date)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(q.validUntil)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{formatFCFA(q.total)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button title="Voir" onClick={() => navigate(`/commerce/devis/${q._id}`)}
                          className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button title="Modifier" onClick={() => navigate(`/commerce/devis/modifier/${q._id}`)}
                          className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {q.status === "brouillon" && (
                          <button title="Envoyer" onClick={() => handleValidate(q)}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {q.status === "envoyee" && (
                          <button title="Accepter" onClick={() => handleAccept(q)}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {q.status === "envoyee" && (
                          <button title="Refuser" onClick={() => handleRefuse(q)}
                            className="p-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {(q.status === "accepte" || q.status === "envoyee") && q.status !== "converti" && (
                          <button title="Convertir en facture" onClick={() => handleConvert(q)}
                            className="p-1.5 rounded-md border border-violet-500/40 text-violet-500 hover:bg-violet-500/10 transition-colors">
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title="Dupliquer" onClick={() => handleDuplicate(q)}
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button title="Supprimer" onClick={() => handleDelete(q)} disabled={isDeleting}
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
    </div>
  );
};

export default DevisPage;
