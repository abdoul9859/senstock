import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle,
  ExternalLink,
  Loader2,
  DollarSign,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Use relative URLs — Vite proxy routes /api to the server

interface Order {
  _id: string;
  number: string;
  status: string;
  source: string;
  customer: { name: string; phone: string };
  total: number;
  paymentStatus: string;
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

const PIE_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#8b5cf6", "#22c55e", "#ef4444"];

export default function BoutiqueDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("senstock_token");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/boutique/orders`, { headers }),
        fetch(`/api/boutique/stats`, { headers }),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Revenue by month (last 6 months)
  const revenueByMonth = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    orders
      .filter((o) => o.status !== "annulee")
      .forEach((o) => {
        const d = new Date(o.createdAt);
        const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        if (key in months) months[key] += o.total || 0;
      });
    return Object.entries(months).map(([name, ca]) => ({ name, ca }));
  })();

  // Orders by status (pie)
  const ordersByStatus = (() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, value]) => ({ name: statusLabels[status] || status, value }))
      .filter((d) => d.value > 0);
  })();

  const recentOrders = orders.slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Boutique en ligne</h1>
        <Button variant="outline" onClick={() => window.open("/shop", "_blank")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Voir la vitrine
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShoppingCart className="h-4 w-4" />
            Commandes
          </div>
          <div className="text-2xl font-bold mt-1">{stats?.totalOrders || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <DollarSign className="h-4 w-4" />
            CA total
          </div>
          <div className="text-2xl font-bold mt-1">
            {(stats?.totalRevenue || 0).toLocaleString("fr-FR")} F
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            En attente
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">
            {stats?.pendingOrders || 0}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Package className="h-4 w-4" />
            Produits publiés
          </div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {stats?.publishedProducts || 0}
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Commandes aujourd'hui</div>
          <div className="text-3xl font-bold mt-1">{stats?.todayOrders || 0}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">CA aujourd'hui</div>
          <div className="text-3xl font-bold mt-1">
            {(stats?.todayRevenue || 0).toLocaleString("fr-FR")} F
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-4">Chiffre d'affaires (6 mois)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="shopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString("fr-FR")} F`, "CA"]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Area
                type="monotone"
                dataKey="ca"
                stroke="hsl(var(--primary))"
                fill="url(#shopGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie chart */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-4">Par statut</h3>
          {ordersByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Aucune commande
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Commandes récentes</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate("/boutique/commandes")}>
            Voir tout
          </Button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aucune commande pour le moment
          </div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((o) => (
              <div key={o._id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{o.number}</div>
                  <div className="text-sm text-muted-foreground">
                    {o.customer.name} — {o.customer.phone}
                  </div>
                </div>
                <Badge variant="secondary" className={statusColors[o.status] || ""}>
                  {statusLabels[o.status] || o.status}
                </Badge>
                <div className="text-sm font-medium shrink-0">
                  {o.total.toLocaleString("fr-FR")} F
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => navigate("/boutique/catalogue")}
        >
          <Package className="h-5 w-5" />
          <span className="text-xs">Catalogue</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => navigate("/boutique/commandes")}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-xs">Commandes</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => navigate("/boutique/promotions")}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-xs">Promotions</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2"
          onClick={() => window.open("/shop", "_blank")}
        >
          <Eye className="h-5 w-5" />
          <span className="text-xs">Vitrine</span>
        </Button>
      </div>
    </div>
  );
}
