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
  ChevronRight,
  Package,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Order {
  _id: string;
  number: string;
  status: string;
  source: string;
  customer: { name: string; phone: string; email: string; address: string };
  items: { _id: string; name: string; variant: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  promoCode: string;
  notes: string;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

const statusColors: Record<string, string> = {
  nouvelle: "bg-blue-100 text-blue-700",
  confirmee: "bg-cyan-100 text-cyan-700",
  en_preparation: "bg-amber-100 text-amber-700",
  expediee: "bg-purple-100 text-purple-700",
  livree: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-700",
};

const paymentLabels: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  carte: "Carte",
  a_la_livraison: "À la livraison",
};

const paymentStatusLabels: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payée",
  echouee: "Échouée",
  remboursee: "Remboursée",
};

const statusFlow: Record<string, string[]> = {
  nouvelle: ["confirmee", "annulee"],
  confirmee: ["en_preparation", "annulee"],
  en_preparation: ["expediee", "annulee"],
  expediee: ["livree"],
  livree: [],
  annulee: [],
};

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<Order | null>(null);
  const token = localStorage.getItem("senstock_token");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boutique/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/boutique/orders/${id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Statut mis à jour : ${statusLabels[status]}`);
      fetchOrders();
      if (detail?._id === id) {
        setDetail((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      toast.error("Erreur");
    }
  };

  const updatePayment = async (id: string, paymentStatus: string) => {
    try {
      const res = await fetch(`/api/boutique/orders/${id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Paiement mis à jour");
      fetchOrders();
      if (detail?._id === id) {
        setDetail((prev) => (prev ? { ...prev, paymentStatus } : null));
      }
    } catch {
      toast.error("Erreur");
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Supprimer cette commande ?")) return;
    try {
      await fetch(`/api/boutique/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Commande supprimée");
      setDetail(null);
      fetchOrders();
    } catch {
      toast.error("Erreur");
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.number.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q)
      );
    }
    return true;
  });

  const counts = {
    nouvelle: orders.filter((o) => o.status === "nouvelle").length,
    en_cours: orders.filter((o) =>
      ["confirmee", "en_preparation", "expediee"].includes(o.status)
    ).length,
    livree: orders.filter((o) => o.status === "livree").length,
    annulee: orders.filter((o) => o.status === "annulee").length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les commandes de la boutique en ligne
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{counts.nouvelle}</div>
          <div className="text-sm text-muted-foreground">Nouvelles</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{counts.en_cours}</div>
          <div className="text-sm text-muted-foreground">En cours</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{counts.livree}</div>
          <div className="text-sm text-muted-foreground">Livrées</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{counts.annulee}</div>
          <div className="text-sm text-muted-foreground">Annulées</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (N°, client, tél)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
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

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold">Aucune commande</h3>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">N°</th>
                <th className="px-4 py-2.5 text-left font-medium">Client</th>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-left font-medium">Paiement</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-left font-medium">Source</th>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((o) => (
                <tr key={o._id} className="hover:bg-muted/30 animate-row">
                  <td className="px-4 py-2.5 font-mono text-xs">{o.number}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{o.customer.name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary" className={statusColors[o.status] || ""}>
                      {statusLabels[o.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={
                        o.paymentStatus === "payee"
                          ? "border-green-500 text-green-600"
                          : o.paymentStatus === "en_attente"
                            ? "border-amber-500 text-amber-600"
                            : ""
                      }
                    >
                      {paymentStatusLabels[o.paymentStatus] || o.paymentStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {o.total.toLocaleString("fr-FR")} F
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {o.source === "boutique" ? "En ligne" : "Manuel"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDetail(o)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => deleteOrder(o._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commande {detail?.number}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="rounded-lg border p-3 space-y-1">
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Client
                </div>
                <div className="font-medium">{detail.customer.name}</div>
                <div className="text-sm text-muted-foreground">{detail.customer.phone}</div>
                {detail.customer.email && (
                  <div className="text-sm text-muted-foreground">
                    {detail.customer.email}
                  </div>
                )}
                {detail.customer.address && (
                  <div className="text-sm text-muted-foreground">
                    {detail.customer.address}
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="rounded-lg border p-3">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  Articles
                </div>
                <div className="space-y-2">
                  {detail.items.map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.variant && (
                          <span className="text-muted-foreground ml-1">
                            ({item.variant})
                          </span>
                        )}
                        <span className="text-muted-foreground"> x{item.quantity}</span>
                      </div>
                      <span>{(item.price * item.quantity).toLocaleString("fr-FR")} F</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{detail.subtotal.toLocaleString("fr-FR")} F</span>
                  </div>
                  {detail.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise{detail.promoCode ? ` (${detail.promoCode})` : ""}</span>
                      <span>-{detail.discount.toLocaleString("fr-FR")} F</span>
                    </div>
                  )}
                  {detail.shipping > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison</span>
                      <span>{detail.shipping.toLocaleString("fr-FR")} F</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{detail.total.toLocaleString("fr-FR")} F</span>
                  </div>
                </div>
              </div>

              {/* Status workflow */}
              <div className="rounded-lg border p-3">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  Statut
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant="secondary"
                    className={`text-sm ${statusColors[detail.status]}`}
                  >
                    {statusLabels[detail.status]}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-2">
                    {(statusFlow[detail.status] || []).map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === "annulee" ? "destructive" : "default"}
                        className="h-7 text-xs"
                        onClick={() => updateStatus(detail._id, next)}
                      >
                        {statusLabels[next]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  Paiement — {paymentLabels[detail.paymentMethod] || detail.paymentMethod}
                </div>
                <div className="flex gap-2">
                  {["en_attente", "payee"].map((ps) => (
                    <Button
                      key={ps}
                      size="sm"
                      variant={detail.paymentStatus === ps ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => updatePayment(detail._id, ps)}
                    >
                      {paymentStatusLabels[ps]}
                    </Button>
                  ))}
                </div>
              </div>

              {detail.notes && (
                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium uppercase text-muted-foreground mb-1">
                    Notes
                  </div>
                  <p className="text-sm">{detail.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Créée le {new Date(detail.createdAt).toLocaleString("fr-FR")} —{" "}
                {detail.source === "boutique" ? "Commande en ligne" : "Commande manuelle"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
