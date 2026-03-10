import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertTriangle,
  Truck,
  Package,
  CheckCircle,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Product {
  _id: string;
  name: string;
  brand: string;
  quantity: number;
  purchasePrice?: number;
  supplier?: { _id: string; name: string } | string;
  category?: string;
}

interface Supplier {
  _id: string;
  name: string;
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
  createdAt: string;
}

const LOW_STOCK_THRESHOLD = 5;

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

function getSupplierName(supplier: { _id: string; name: string } | string | undefined): string {
  if (!supplier) return "—";
  if (typeof supplier === "string") return supplier;
  return supplier?.name || "—";
}

export default function PlanificationPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        fetch(`/api/products`, { headers }),
        fetch(`/api/purchase-orders`, { headers }),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (oRes.ok) setOrders(await oRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const lowStockProducts = products.filter(
    (p) => p.quantity <= LOW_STOCK_THRESHOLD
  );

  const pendingDeliveries = orders.filter((o) => o.status === "en_transit");

  const suggestions = lowStockProducts.filter((p) => {
    if (!p.supplier) return false;
    const supplierId =
      typeof p.supplier === "string" ? p.supplier : p.supplier._id;
    return !!supplierId;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Planification</h1>
        <p className="text-muted-foreground">
          Alertes de stock et planification des approvisionnements
        </p>
      </div>

      {/* Section 1: Alertes stock bas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold">Alertes stock bas</h2>
          {lowStockProducts.length > 0 && (
            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">
              {lowStockProducts.length} produit
              {lowStockProducts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="rounded-lg border p-6 bg-green-500/10 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
            <p className="font-medium text-green-600 dark:text-green-400">
              Tous les stocks sont suffisants
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Produit
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Marque
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Stock actuel
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Prix d'achat
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Fournisseur
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="border-t hover:bg-muted/30"
                  >
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.brand || "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{p.quantity}</span>
                        {p.quantity === 0 ? (
                          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">
                            Rupture
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-xs">
                            Stock bas
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {p.purchasePrice ? fmtMoney(p.purchasePrice) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {getSupplierName(p.supplier)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Livraisons attendues */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold">Livraisons attendues</h2>
          {pendingDeliveries.length > 0 && (
            <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-0 text-xs">
              {pendingDeliveries.length}
            </Badge>
          )}
        </div>

        {pendingDeliveries.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <Truck className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">
              Aucune livraison en attente
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    N° commande
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Fournisseur
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Nb articles
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Date prevue
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingDeliveries.map((o) => {
                  const supplierName =
                    typeof o.supplier === "string"
                      ? o.supplier
                      : o.supplier?.name || "—";
                  const isLate =
                    o.expectedDeliveryDate &&
                    new Date(o.expectedDeliveryDate) < new Date();
                  return (
                    <tr
                      key={o._id}
                      className="border-t hover:bg-muted/30"
                    >
                      <td className="p-3 font-mono text-xs">{o.number}</td>
                      <td className="p-3 font-medium">{supplierName}</td>
                      <td className="p-3 text-muted-foreground">
                        {o.items.length}
                      </td>
                      <td className="p-3 font-bold">{fmtMoney(o.total)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {o.expectedDeliveryDate
                              ? fmtDate(o.expectedDeliveryDate)
                              : "—"}
                          </span>
                          {isLate && (
                            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">
                              En retard
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Suggestions de reapprovisionnement */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold">
            Suggestions de reapprovisionnement
          </h2>
          {suggestions.length > 0 && (
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0 text-xs">
              {suggestions.length}
            </Badge>
          )}
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-lg border p-6 text-center">
            <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground">Pas de suggestion</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((p) => {
              const suggestedQty = 10 - p.quantity;
              return (
                <div
                  key={p._id}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{p.name}</h3>
                      {p.brand && (
                        <p className="text-xs text-muted-foreground">
                          {p.brand}
                        </p>
                      )}
                    </div>
                    {p.quantity === 0 ? (
                      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">
                        Rupture
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-xs">
                        Stock bas
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Stock actuel
                      </span>
                      <div className="font-bold text-lg">{p.quantity}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Quantite suggeree
                      </span>
                      <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {suggestedQty > 0 ? suggestedQty : 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">
                      Fournisseur : {getSupplierName(p.supplier)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => navigate("/logistique/commandes")}
                    >
                      Commander <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
