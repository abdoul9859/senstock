import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Package, ArrowDownUp, QrCode, Tag, Settings2,
  AlertTriangle, Layers, TrendingUp, Plus, ArrowRight,
  Users, ShoppingCart, Archive, CheckCircle, FileText, Truck, BarChart3,
} from "lucide-react";
import { StatCard, StockCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { Button } from "@/components/ui/button";
import UpgradeBanner from "@/components/UpgradeBanner";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

interface Variant {
  _id?: string;
  serialNumber: string;
  condition: "neuf" | "venant" | "occasion";
  sold: boolean;
  soldInvoiceId?: string;
  price?: number;
  supplier?: { _id: string; name: string } | null;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  archived: boolean;
  variants?: Variant[];
  category?: { _id: string; name: string; hasVariants?: boolean };
  supplier?: { _id: string; name: string } | null;
  createdAt: string;
}

interface Category {
  _id: string;
  name: string;
  hasVariants: boolean;
}

interface Supplier {
  _id: string;
  name: string;
}

interface Movement {
  _id: string;
  type: string;
  productId: string | null;
  productName: string;
  details: string;
  user?: { name: string } | null;
  createdAt: string;
}

const movementLabel: Record<string, { label: string; color: string }> = {
  quantity_updated: { label: "Quantite modifiee", color: "text-blue-500" },
  variant_sold: { label: "Vendu", color: "text-amber-500" },
  variants_added: { label: "Variante(s) ajoutee(s)", color: "text-emerald-500" },
  variants_removed: { label: "Variante(s) supprimee(s)", color: "text-red-500" },
  product_created: { label: "Produit cree", color: "text-primary" },
  product_updated: { label: "Produit modifie", color: "text-blue-500" },
  product_deleted: { label: "Produit supprime", color: "text-red-500" },
  product_archived: { label: "Archive", color: "text-muted-foreground" },
  product_unarchived: { label: "Desarchive", color: "text-amber-500" },
};

const CONDITION_COLORS: Record<string, string> = {
  neuf: "#10b981",
  venant: "#3b82f6",
  occasion: "#f59e0b",
};

const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  venant: "Venant",
  occasion: "Occasion",
};

const PIE_COLORS = [
  "hsl(var(--primary))", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const quickLinks = [
  { label: "Inventaire", url: "/entrepot/inventaire", icon: Package },
  { label: "Mouvements", url: "/entrepot/mouvements", icon: ArrowDownUp },
  { label: "Codes-barres", url: "/entrepot/codes-barres", icon: QrCode },
  { label: "Categories", url: "/entrepot/categories", icon: Tag },
  { label: "Parametres", url: "/entrepot/parametres", icon: Settings2 },
];

const EntrepotDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, sRes, mRes] = await Promise.all([
        fetch("/api/products", { headers: getHeaders() }),
        fetch("/api/categories", { headers: getHeaders() }),
        fetch("/api/suppliers", { headers: getHeaders() }),
        fetch("/api/movements?limit=500", { headers: getHeaders() }),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (mRes.ok) {
        const data = await mRes.json();
        setMovements(data.movements ?? data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const settings = getEntrepotSettings();

  // --- Core stats ---
  const active = products.filter((p) => !p.archived);
  const totalProducts = active.length;
  const archivedCount = products.filter((p) => p.archived).length;

  // Stock value (simple products: price * qty, variant products: sum of unsold variant prices)
  const stockValue = active.reduce((sum, p) => {
    if (p.category?.hasVariants && p.variants) {
      return sum + p.variants.filter((v) => !v.sold).reduce((s, v) => s + (v.price || p.sellingPrice || 0), 0);
    }
    return sum + (p.sellingPrice || 0) * (p.quantity || 0);
  }, 0);

  const purchaseValue = active.reduce((sum, p) => {
    if (p.category?.hasVariants && p.variants) {
      return sum + p.variants.filter((v) => !v.sold).reduce((s, v) => s + (p.purchasePrice || 0), 0);
    }
    return sum + (p.purchasePrice || 0) * (p.quantity || 0);
  }, 0);

  const totalVariants = active.reduce((sum, p) => {
    if (!p.category?.hasVariants || !p.variants) return sum;
    return sum + p.variants.length;
  }, 0);

  const availableVariants = active.reduce((sum, p) => {
    if (!p.category?.hasVariants || !p.variants) return sum;
    return sum + p.variants.filter((v) => !v.sold).length;
  }, 0);

  const soldVariants = totalVariants - availableVariants;

  // Stock health
  const lowStockThreshold = settings.lowStockThresholdSimple || 5;
  const lowStockThresholdVar = settings.lowStockThresholdVariants || 2;

  const healthyStock = active.filter((p) => {
    if (p.category?.hasVariants && p.variants) {
      const avail = p.variants.filter((v) => !v.sold).length;
      return avail > lowStockThresholdVar;
    }
    return (p.quantity || 0) > lowStockThreshold;
  }).length;

  const lowStock = active.filter((p) => {
    if (p.category?.hasVariants && p.variants) {
      const avail = p.variants.filter((v) => !v.sold).length;
      return avail > 0 && avail <= lowStockThresholdVar;
    }
    return (p.quantity || 0) > 0 && (p.quantity || 0) <= lowStockThreshold;
  }).length;

  const outOfStock = active.filter((p) => {
    if (p.category?.hasVariants && p.variants) return p.variants.filter((v) => !v.sold).length === 0;
    return (p.quantity || 0) === 0;
  }).length;

  // --- Movement chart: last 6 months ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const movementChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString("fr-FR", { month: "short" });

    const monthMovements = movements.filter((m) => {
      const md = new Date(m.createdAt);
      return md.getMonth() === month && md.getFullYear() === year;
    });

    return {
      label,
      total: monthMovements.length,
      entrees: monthMovements.filter((m) =>
        ["product_created", "variants_added", "product_unarchived"].includes(m.type) ||
        (m.type === "quantity_updated" && m.details.includes("→") && (() => {
          const parts = m.details.match(/(\d+)\s*→\s*(\d+)/);
          return parts && parseInt(parts[2]) > parseInt(parts[1]);
        })())
      ).length,
      sorties: monthMovements.filter((m) =>
        ["variant_sold", "variants_removed", "product_deleted", "product_archived"].includes(m.type) ||
        (m.type === "quantity_updated" && m.details.includes("→") && (() => {
          const parts = m.details.match(/(\d+)\s*→\s*(\d+)/);
          return parts && parseInt(parts[2]) < parseInt(parts[1]);
        })())
      ).length,
    };
  });

  // --- Products by category (pie) ---
  const categoryBreakdown = categories
    .map((cat) => ({
      name: cat.name,
      value: active.filter((p) => p.category?._id === cat._id).length,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const uncategorized = active.filter((p) => !p.category).length;
  if (uncategorized > 0) categoryBreakdown.push({ name: "Sans categorie", value: uncategorized });

  // --- Variant condition breakdown (bar) ---
  const conditionData = ["neuf", "venant", "occasion"].map((cond) => {
    const available = active.reduce((sum, p) => {
      if (!p.category?.hasVariants || !p.variants) return sum;
      return sum + p.variants.filter((v) => !v.sold && v.condition === cond).length;
    }, 0);
    const sold = active.reduce((sum, p) => {
      if (!p.category?.hasVariants || !p.variants) return sum;
      return sum + p.variants.filter((v) => v.sold && v.condition === cond).length;
    }, 0);
    return {
      label: CONDITION_LABELS[cond] || cond,
      disponible: available,
      vendu: sold,
    };
  });

  // --- Top products by stock value ---
  const topProducts = [...active]
    .map((p) => {
      let value = 0;
      let stock = 0;
      if (p.category?.hasVariants && p.variants) {
        const unsold = p.variants.filter((v) => !v.sold);
        stock = unsold.length;
        value = unsold.reduce((s, v) => s + (v.price || p.sellingPrice || 0), 0);
      } else {
        stock = p.quantity || 0;
        value = (p.sellingPrice || 0) * stock;
      }
      return { name: `${p.brand ? p.brand + " " : ""}${p.name}`, value, stock, category: p.category?.name || "—" };
    })
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Recent movements (last 8)
  const recentMovements = movements.slice(0, 8);

  // Month activity
  const productsThisMonth = products.filter((p) => new Date(p.createdAt) >= monthStart).length;
  const movementsThisMonth = movements.filter((m) => new Date(m.createdAt) >= monthStart).length;
  const soldThisMonth = movements.filter((m) => m.type === "variant_sold" && new Date(m.createdAt) >= monthStart).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Vue d'ensemble — Entrepot</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Resume complet de votre stock et activite</p>
        </div>
        <Button onClick={() => navigate("/entrepot/inventaire")}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau produit
        </Button>
      </div>

      <UpgradeBanner className="mb-6" />

      {loading ? <StockLoader /> : (
        <>
          {/* Row 1: Key metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
            <div className="animate-card"><StatCard label="Produits actifs" value={String(totalProducts)} icon={Package} /></div>
            {hasPermission("confidentialite.valeur_stock") && <div className="animate-card"><StatCard label="Valeur du stock" value={formatFCFA(stockValue)} icon={TrendingUp} /></div>}
            <div className="animate-card"><StatCard label="Variantes dispo" value={String(availableVariants)} icon={Layers} /></div>
            <div className="animate-card"><StatCard label="Vendues" value={String(soldVariants)} icon={ShoppingCart} /></div>
            <div className="animate-card"><StatCard label="Categories" value={String(categories.length)} icon={Tag} /></div>
            <div className="animate-card"><StatCard label="Fournisseurs" value={String(suppliers.length)} icon={Users} /></div>
          </div>

          {/* Row 2: Stock health cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="animate-card"><StockCard title="Stock OK" subtitle={`${healthyStock} produit${healthyStock > 1 ? "s" : ""} — stock suffisant`} icon={CheckCircle} status="active" /></div>
            <div className="animate-card"><StockCard title="Stock faible" subtitle={`${lowStock} produit${lowStock > 1 ? "s" : ""} — a reapprovisionner`} icon={AlertTriangle} status="warning" /></div>
            <div className="animate-card"><StockCard title="Rupture de stock" subtitle={`${outOfStock} produit${outOfStock > 1 ? "s" : ""} — stock epuise`} icon={AlertTriangle} status="inactive" /></div>
          </div>

          {/* Row 3: Movement area chart + Category pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Movement chart — spans 2 cols */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Activite du stock</h3>
              <p className="text-xs text-muted-foreground mb-4">Entrees et sorties sur les 6 derniers mois</p>
              {movementChartData.every((d) => d.total === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucun mouvement
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={movementChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="entGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="sorGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="entrees" name="Entrees" stroke="#10b981" strokeWidth={2} fill="url(#entGrad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#f59e0b" strokeWidth={2} fill="url(#sorGrad)" dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category pie chart */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Produits par categorie</h3>
              <p className="text-xs text-muted-foreground mb-4">Repartition du catalogue</p>
              {categoryBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucun produit
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryBreakdown.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [`${value} produit${value > 1 ? "s" : ""}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {categoryBreakdown.map((c, idx) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        {c.name} ({c.value})
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 4: Condition bar chart + Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Variant condition bar chart */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Variantes par condition</h3>
              <p className="text-xs text-muted-foreground mb-4">Disponibles vs vendues</p>
              {conditionData.every((d) => d.disponible + d.vendu === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucune variante
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={conditionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="disponible" name="Disponible" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="vendu" name="Vendu" fill="#6b7280" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top products by value */}
            {hasPermission("confidentialite.valeur_stock") && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Top produits</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Par valeur de stock</p>
                </div>
                <button
                  onClick={() => navigate("/entrepot/inventaire")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Aucun produit en stock</div>
              ) : (
                <div className="divide-y divide-border">
                  {topProducts.map((p, idx) => {
                    const maxVal = topProducts[0]?.value || 1;
                    const pct = Math.round((p.value / maxVal) * 100);
                    return (
                      <div key={idx} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground truncate block">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground">{p.category} — {p.stock} en stock</span>
                            </div>
                          </div>
                          <span className="text-sm font-mono font-medium text-foreground shrink-0 ml-2">{formatFCFA(p.value)}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Row 5: Recent movements + Quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent movements */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Mouvements recents</h3>
                <button
                  onClick={() => navigate("/entrepot/mouvements")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {recentMovements.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Aucun mouvement</div>
              ) : (
                <div className="divide-y divide-border">
                  {recentMovements.map((m) => {
                    const cfg = movementLabel[m.type] || { label: m.type, color: "text-muted-foreground" };
                    return (
                      <div key={m._id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.productName}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.details}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links + month summary */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Acces rapides</h3>
              </div>
              <div className="p-3 space-y-1">
                {quickLinks.map(({ label, url, icon: Icon }) => (
                  <button
                    key={url}
                    onClick={() => navigate(url)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>

              {/* Monthly summary */}
              <div className="mx-3 mb-3 rounded-md bg-muted/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Activite du mois</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Produits crees</span>
                    <span className="font-medium text-foreground">{productsThisMonth}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Variantes vendues</span>
                    <span className="font-medium text-foreground">{soldThisMonth}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mouvements total</span>
                    <span className="font-medium text-foreground">{movementsThisMonth}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Archives</span>
                    <span className="font-medium text-foreground">{archivedCount}</span>
                  </div>
                  {hasPermission("confidentialite.marges") && (
                  <div className="flex justify-between text-xs border-t border-border pt-2 mt-2">
                    <span className="text-muted-foreground">Marge estimee</span>
                    <span className="font-medium text-foreground">{formatFCFA(Math.max(0, stockValue - purchaseValue))}</span>
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cross-workspace quick links */}
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Acces rapide aux autres espaces</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate("/commerce/factures/nouvelle")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-blue-500/10 p-2.5 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nouvelle facture</p>
                  <p className="text-xs text-muted-foreground">Commerce → Facturation</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => navigate("/logistique/fournisseurs")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-amber-500/10 p-2.5 shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <Truck className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Fournisseurs</p>
                  <p className="text-xs text-muted-foreground">Logistique → Fournisseurs</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => navigate("/analytique/dashboard")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-primary/10 p-2.5 shrink-0 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Analytique</p>
                  <p className="text-xs text-muted-foreground">Tendances & rapports</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EntrepotDashboard;
