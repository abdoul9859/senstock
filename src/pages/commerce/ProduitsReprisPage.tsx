import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Wrench, ShoppingCart, RefreshCw, Clock, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockLoader } from "@/components/StockLoader";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";
function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface ExchangeItem {
  _id: string;
  description: string;
  variantLabel: string;
  price: number;
  quantity: number;
  notes: string;
  disposition: string | null;
  maintenanceTicketId: string | null;
  maintenanceTicket?: { _id: string; number: string; status: string } | null;
  label?: { id: string; name: string; color: string } | null;
  invoice: {
    _id: string;
    number: string;
    date: string;
    client?: { _id: string; name: string } | null;
  };
}

interface ExchangeStats {
  total: number;
  pending: number;
  revente: number;
  maintenance: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  revente: { label: "Revente", variant: "default" },
  maintenance: { label: "Maintenance", variant: "secondary" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "revente", label: "Revente" },
  { value: "maintenance", label: "Maintenance" },
];

export default function ProduitsReprisPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [stats, setStats] = useState<ExchangeStats>({ total: 0, pending: 0, revente: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [maintenanceModal, setMaintenanceModal] = useState<ExchangeItem | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({ issueDescription: "", conditionAtReception: "moyen", accessories: "", estimatedCost: "" });
  const [saving, setSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/exchange-items/stats", { headers: getHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?disposition=${filter}` : "";
      const res = await fetch(`/api/exchange-items${params}`, { headers: getHeaders() });
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function setDisposition(item: ExchangeItem, disposition: string | null) {
    if (disposition === "maintenance") {
      setMaintenanceModal(item);
      setMaintenanceForm({ issueDescription: "", conditionAtReception: "moyen", accessories: "", estimatedCost: "" });
      return;
    }
    try {
      const res = await fetch(`/api/exchange-items/${item._id}/disposition`, {
        method: "PATCH", headers: getHeaders(), body: JSON.stringify({ disposition }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => i._id === item._id ? updated : i));
        fetchStats();
        toast.success(disposition ? `Marqué ${disposition}` : "Réinitialisé");
      }
    } catch { toast.error("Erreur"); }
  }

  async function createMaintenanceTicket() {
    if (!maintenanceModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exchange-items/${maintenanceModal._id}/create-maintenance`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify(maintenanceForm),
      });
      if (res.ok) {
        const ticket = await res.json();
        setMaintenanceModal(null);
        fetchItems();
        fetchStats();
        toast.success(`Ticket ${ticket.number} créé`);
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  }

  if (loading) return <StockLoader />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits repris</h1>
          <p className="text-muted-foreground text-sm">Produits reçus en échange — gérez leur destination</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchItems(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total repris</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <ShoppingCart className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.revente}</p>
              <p className="text-xs text-muted-foreground">Revente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
              <Wrench className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.maintenance}</p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun produit repris trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {item.description || item.variantLabel || "Produit sans nom"}
                    </p>
                    {item.label && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: item.label.color }}>
                        {item.label.name}
                      </span>
                    )}
                    {item.disposition && (
                      <Badge variant={STATUS_CONFIG[item.disposition]?.variant || "outline"}>
                        {STATUS_CONFIG[item.disposition]?.label || item.disposition}
                      </Badge>
                    )}
                  </div>
                  {item.variantLabel && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      IMEI/S.N: {item.variantLabel}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Facture <button
                      className="text-primary hover:underline"
                      onClick={() => navigate(`/commerce/factures/${item.invoice._id}`)}
                    >{item.invoice.number}</button>
                    {item.invoice.client && ` · ${item.invoice.client.name}`}
                    {" · "}{new Date(item.invoice.date).toLocaleDateString("fr-FR")}
                  </p>
                  {item.price > 0 && (
                    <p className="text-xs text-muted-foreground">{item.price.toLocaleString("fr-FR")} FCFA</p>
                  )}
                  {item.maintenanceTicket && (
                    <button
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={() => navigate(`/entrepot/maintenance`)}
                    >
                      Ticket: {item.maintenanceTicket.number} ({item.maintenanceTicket.status})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.disposition ? (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                      onClick={() => setDisposition(item, null)}>
                      Réinitialiser
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm"
                        className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                        onClick={() => setDisposition(item, "revente")}>
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Revente
                      </Button>
                      <Button variant="outline" size="sm"
                        className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                        onClick={() => setDisposition(item, "maintenance")}>
                        <Wrench className="h-3.5 w-3.5 mr-1.5" /> Maintenance
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance ticket creation dialog */}
      <Dialog open={!!maintenanceModal} onOpenChange={(o) => !o && setMaintenanceModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un ticket maintenance</DialogTitle>
            <DialogDescription>
              {maintenanceModal?.description || maintenanceModal?.variantLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description du problème</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                rows={3}
                value={maintenanceForm.issueDescription}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, issueDescription: e.target.value }))}
                placeholder="Décrire le problème..."
              />
            </div>
            <div>
              <Label>État à la réception</Label>
              <Select value={maintenanceForm.conditionAtReception} onValueChange={(v) => setMaintenanceForm((f) => ({ ...f, conditionAtReception: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bon">Bon</SelectItem>
                  <SelectItem value="moyen">Moyen</SelectItem>
                  <SelectItem value="mauvais">Mauvais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coût estimé (FCFA)</Label>
              <Input
                type="number"
                className="mt-1"
                value={maintenanceForm.estimatedCost}
                onChange={(e) => setMaintenanceForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMaintenanceModal(null)}>Annuler</Button>
            <Button onClick={createMaintenanceTicket} disabled={saving}>
              {saving ? "Création..." : "Créer le ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
