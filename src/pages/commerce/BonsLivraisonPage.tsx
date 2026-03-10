import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck, Clock, CheckCircle, Truck, Eye, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X, Package,
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
import { toast } from "sonner";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

interface DeliveryNote {
  _id: string;
  number: string;
  status: string;
  invoiceNumber: string;
  invoiceId: string;
  client?: { _id: string; name: string; phone: string };
  date: string;
  deliveryDate?: string;
  items: { _id: string; description: string; quantity: number; delivered: number }[];
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_preparation: { label: "En preparation", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  expedie: { label: "Expedie", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  livre: { label: "Livre", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  annule: { label: "Annule", color: "bg-muted text-muted-foreground line-through" },
};

type SortField = "number" | "client" | "date" | "status" | "invoice";
type SortDir = "asc" | "desc";

const BonsLivraisonPage = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/delivery-notes", { headers: getHeaders() });
      if (res.ok) setNotes(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const hasActiveFilters = search || filterStatus !== "all";

  const filtered = notes.filter((n) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        n.number.toLowerCase().includes(q) ||
        n.invoiceNumber.toLowerCase().includes(q) ||
        (n.client?.name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "number": return dir * a.number.localeCompare(b.number);
      case "invoice": return dir * a.invoiceNumber.localeCompare(b.invoiceNumber);
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "date": return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case "status": return dir * a.status.localeCompare(b.status);
      default: return 0;
    }
  });

  async function handleDelete(n: DeliveryNote) {
    if (!confirm(`Supprimer le bon ${n.number} ?`)) return;
    setDeleting(n._id);
    try {
      const res = await fetch(`/api/delivery-notes/${n._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        toast.success("Bon de livraison supprime");
        setNotes((prev) => prev.filter((i) => i._id !== n._id));
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
    setDeleting(null);
  }

  async function handleUpdateStatus(n: DeliveryNote, status: string) {
    try {
      const res = await fetch(`/api/delivery-notes/${n._id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const label = statusConfig[status]?.label || status;
        toast.success(`${n.number} → ${label}`);
        setNotes((prev) => prev.map((i) => i._id === n._id ? { ...i, status } : i));
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  const totalNotes = notes.length;
  const inPrep = notes.filter((n) => n.status === "en_preparation").length;
  const shipped = notes.filter((n) => n.status === "expedie").length;
  const delivered = notes.filter((n) => n.status === "livre").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bons de livraison</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Suivi des livraisons generees depuis les factures</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total BL" value={String(totalNotes)} icon={FileCheck} />
        <StatCard label="En preparation" value={String(inPrep)} icon={Clock} />
        <StatCard label="Expedies" value={String(shipped)} icon={Truck} />
        <StatCard label="Livres" value={String(delivered)} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher n° BL, facture, client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="en_preparation">En preparation</SelectItem>
            <SelectItem value="expedie">Expedie</SelectItem>
            <SelectItem value="livre">Livre</SelectItem>
            <SelectItem value="annule">Annule</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">{filtered.length} / {notes.length} BL</span>
        )}
      </div>

      {loading ? (
        <StockLoader />
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileCheck className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm mb-1">Aucun bon de livraison</p>
          <p className="text-xs">Les bons sont generes a partir des factures acceptees</p>
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
                    N° BL {getSortIcon("number")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("invoice")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Facture {getSortIcon("invoice")}
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
                <TableHead className="text-xs font-medium uppercase tracking-wider text-center">Articles</TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("status")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Statut {getSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((n) => {
                const sc = statusConfig[n.status] || statusConfig.en_preparation;
                const totalItems = n.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <TableRow key={n._id} className="hover:bg-accent/50 transition-colors animate-row">
                    <TableCell className="font-mono text-xs font-medium text-foreground">{n.number}</TableCell>
                    <TableCell>
                      <button onClick={() => navigate(`/commerce/factures/${n.invoiceId}`)}
                        className="font-mono text-xs text-primary hover:underline">
                        {n.invoiceNumber}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{n.client?.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(n.date)}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" /> {totalItems}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button title="Voir" onClick={() => navigate(`/commerce/bons-livraison/${n._id}`)}
                          className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {n.status === "en_preparation" && (
                          <button title="Marquer expedie" onClick={() => handleUpdateStatus(n, "expedie")}
                            className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors">
                            <Truck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {n.status === "expedie" && (
                          <button title="Marquer livre" onClick={() => handleUpdateStatus(n, "livre")}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title="Supprimer" onClick={() => handleDelete(n)} disabled={deleting === n._id}
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

export default BonsLivraisonPage;
