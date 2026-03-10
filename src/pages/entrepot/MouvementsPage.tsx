import { useState, useEffect, useCallback } from "react";
import { Package, Plus, Trash2, Pencil, Archive, ArchiveRestore, Search, ShoppingCart, ArrowUpDown, Download } from "lucide-react";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { exportToCsv } from "@/lib/exportCsv";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

interface Movement {
  _id: string;
  type: string;
  productId: string | null;
  productName: string;
  details: string;
  user: { _id: string; name: string } | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  product_created:   { label: "Produit cree",        color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: Plus },
  product_updated:   { label: "Produit modifie",     color: "bg-blue-500/15 text-blue-600 border-blue-500/20",         icon: Pencil },
  product_deleted:   { label: "Produit supprime",    color: "bg-red-500/15 text-red-500 border-red-500/20",            icon: Trash2 },
  product_archived:  { label: "Archive",             color: "bg-amber-500/15 text-amber-600 border-amber-500/20",      icon: Archive },
  product_unarchived:{ label: "Desarchive",          color: "bg-amber-500/15 text-amber-600 border-amber-500/20",      icon: ArchiveRestore },
  variants_added:    { label: "Variantes ajoutees",  color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20", icon: Plus },
  variants_removed:  { label: "Variantes supprimees",color: "bg-red-500/15 text-red-500 border-red-500/20",            icon: Trash2 },
  variant_sold:      { label: "Variante vendue",     color: "bg-purple-500/15 text-purple-600 border-purple-500/20",   icon: ShoppingCart },
  quantity_updated:  { label: "Quantite modifiee",   color: "bg-blue-500/15 text-blue-600 border-blue-500/20",         icon: Package },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = getEntrepotSettings().movementsPageSize;

const MouvementsPage = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [offset, setOffset] = useState(0);

  const fetchMovements = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(newOffset));
      if (filterType !== "all") params.set("type", filterType);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/movements?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMovements(data.movements);
      setTotal(data.total);
      setOffset(newOffset);
    } catch {
      setMovements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => {
    fetchMovements(0);
  }, [fetchMovements]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Mouvements de stock</h2>
          <p className="text-sm text-muted-foreground mt-1">Historique automatique de toutes les operations sur le stock</p>
        </div>
        <Button variant="outline" onClick={() => exportToCsv("mouvements", movements, [
          { header: "Type", accessor: (m) => TYPE_CONFIG[m.type]?.label || m.type },
          { header: "Produit", accessor: (m) => m.productName },
          { header: "Details", accessor: (m) => m.details },
          { header: "Utilisateur", accessor: (m) => m.user?.name || "" },
          { header: "Date", accessor: (m) => new Date(m.createdAt).toLocaleDateString("fr-FR") },
        ])}>
          <Download className="h-4 w-4 mr-1" /> Exporter
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom de produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => fetchMovements(0)} title="Rafraichir">
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <StockLoader />
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Aucun mouvement enregistre</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Date</TableHead>
                  <TableHead className="w-48">Type</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-32">Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const cfg = TYPE_CONFIG[m.type] || { label: m.type, color: "bg-muted text-muted-foreground", icon: Package };
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={m._id} className="animate-row">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeDate(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${cfg.color} text-xs font-medium gap-1`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {m.productName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.details}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.user?.name || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {total} mouvement{total > 1 ? "s" : ""} — page {currentPage}/{totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => fetchMovements(offset - PAGE_SIZE)}
                >
                  Precedent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => fetchMovements(offset + PAGE_SIZE)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MouvementsPage;
