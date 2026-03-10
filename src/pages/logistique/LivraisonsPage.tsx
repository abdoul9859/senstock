import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Truck,
  Loader2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Package,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface OrderItem {
  _id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
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
  deliveredAt?: string;
  paymentMethod: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

function getToken() {
  return localStorage.getItem("senstock_token") || "";
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

function isLate(order: PurchaseOrder): boolean {
  if (order.status !== "en_transit") return false;
  if (!order.expectedDeliveryDate) return false;
  return new Date(order.expectedDeliveryDate) < new Date();
}

export default function LivraisonsPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/purchase-orders`, { headers });
      if (res.ok) {
        const all: PurchaseOrder[] = await res.json();
        setOrders(
          all.filter(
            (o) => o.status === "en_transit" || o.status === "livree"
          )
        );
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const enTransit = orders.filter((o) => o.status === "en_transit");
  const livrees = orders.filter((o) => o.status === "livree");
  const enRetard = orders.filter((o) => isLate(o));

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.number.toLowerCase().includes(q) ||
      getSupplierName(o.supplier).toLowerCase().includes(q) ||
      o.items.some((i) => i.description.toLowerCase().includes(q))
    );
  });

  const markReceived = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: "livree" }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Commande marquee comme livree");
      fetchData();
      if (selected?._id === id) {
        setDetailOpen(false);
        setSelected(null);
      }
    } catch (e: any) {
      toast.error(e.message);
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
      <div>
        <h1 className="text-2xl font-bold">Livraisons</h1>
        <p className="text-muted-foreground">
          Suivi des livraisons en cours et passees
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-purple-500/10">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {enTransit.length}
          </div>
          <div className="text-sm text-muted-foreground">En transit</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-500/10">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {livrees.length}
          </div>
          <div className="text-sm text-muted-foreground">Livrees</div>
        </div>
        <div className="rounded-lg border p-4 bg-red-500/10">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {enRetard.length}
          </div>
          <div className="text-sm text-muted-foreground">En retard</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une livraison..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucune livraison</h3>
          <p className="text-muted-foreground">
            {orders.length === 0
              ? "Aucune livraison en cours ou passee"
              : "Aucun resultat pour cette recherche"}
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
                  Date prevue
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Date reelle
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Statut
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
                  <td className="p-3 text-muted-foreground text-xs">
                    {o.expectedDeliveryDate
                      ? fmtDate(o.expectedDeliveryDate)
                      : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {o.status === "livree" && o.updatedAt
                      ? fmtDate(o.updatedAt)
                      : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {o.status === "en_transit" ? (
                        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0 text-xs">
                          En transit
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 text-xs">
                          Livree
                        </Badge>
                      )}
                      {isLate(o) && (
                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">
                          En retard
                        </Badge>
                      )}
                    </div>
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
                      {o.status === "en_transit" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 dark:text-green-400"
                          onClick={() => markReceived(o._id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Marquer recue
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono">{selected.number}</span>
                {selected.status === "en_transit" ? (
                  <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0">
                    En transit
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0">
                    Livree
                  </Badge>
                )}
                {isLate(selected) && (
                  <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0">
                    En retard
                  </Badge>
                )}
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
                  <span className="text-muted-foreground">Date commande</span>
                  <div className="font-medium">
                    {fmtDate(selected.createdAt)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Livraison prevue
                  </span>
                  <div className="font-medium">
                    {selected.expectedDeliveryDate
                      ? fmtDate(selected.expectedDeliveryDate)
                      : "—"}
                    {isLate(selected) && (
                      <span className="ml-2 text-red-600 dark:text-red-400 text-xs flex items-center gap-1 inline-flex">
                        <AlertTriangle className="h-3 w-3" />
                        En retard
                      </span>
                    )}
                  </div>
                </div>
                {selected.status === "livree" && selected.updatedAt && (
                  <div>
                    <span className="text-muted-foreground">
                      Date de reception
                    </span>
                    <div className="font-medium">
                      {fmtDate(selected.updatedAt)}
                    </div>
                  </div>
                )}
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

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{fmtMoney(selected.total)}</span>
              </div>

              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-3 text-muted-foreground">
                  {selected.notes}
                </div>
              )}
            </div>

            <DialogFooter>
              {selected.status === "en_transit" && (
                <Button
                  size="sm"
                  onClick={() => markReceived(selected._id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marquer recue
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
