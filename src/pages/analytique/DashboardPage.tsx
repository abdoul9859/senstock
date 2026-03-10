import { useState, useEffect, useCallback } from "react";
import { Activity, TrendingUp, Package, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

interface Invoice {
  status: string;
  total: number;
  date: string;
  items?: { total: number }[];
}

interface Product {
  archived: boolean;
  hasVariants: boolean;
  variants?: { sold: boolean }[];
}

const DashboardPage = () => {
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        fetch("/api/invoices", { headers: getHeaders() }),
        fetch("/api/products", { headers: getHeaders() }),
      ]);
      if (iRes.ok) setInvoices(await iRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const REVENUE_STATUSES = ["payee", "partielle", "envoyee"];

  // Compute invoice total from items if top-level total is missing
  const getTotal = (inv: any) => {
    if (inv.total) return inv.total;
    if (inv.items?.length) return inv.items.reduce((s: number, it: any) => s + (it.total || 0), 0);
    return 0;
  };

  const revenue = invoices.filter((i) => REVENUE_STATUSES.includes(i.status)).reduce((s, i) => s + getTotal(i), 0);
  const monthRevenue = invoices
    .filter((i) => {
      const d = new Date(i.date);
      return REVENUE_STATUSES.includes(i.status) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, i) => s + getTotal(i), 0);

  const activeProducts = products.filter((p) => !p.archived).length;
  const soldVariants = products.reduce((sum, p) => {
    if (!p.hasVariants || !p.variants) return sum;
    return sum + p.variants.filter((v) => v.sold).length;
  }, 0);

  // Last 6 months revenue bars
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleDateString("fr-FR", { month: "short" }), month: d.getMonth(), year: d.getFullYear() };
  });

  const monthlyRevenue = monthLabels.map(({ label, month, year }) => ({
    label,
    total: invoices
      .filter((inv) => {
        const d = new Date(inv.date);
        return REVENUE_STATUSES.includes(inv.status) && d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((s, inv) => s + getTotal(inv), 0),
  }));

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.total), 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Tableau de bord analytique</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Vue globale de votre activité</p>
      </div>

      {loading ? <StockLoader /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="animate-card"><StatCard label="Chiffre d'affaires" value={formatFCFA(revenue)} icon={CreditCard} /></div>
            )}
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="animate-card"><StatCard label="CA ce mois" value={formatFCFA(monthRevenue)} icon={TrendingUp} /></div>
            )}
            <div className="animate-card"><StatCard label="Produits actifs" value={String(activeProducts)} icon={Package} /></div>
            <div className="animate-card"><StatCard label="Produits vendus" value={String(soldVariants)} icon={Activity} /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue bars */}
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-5">CA mensuel (6 derniers mois)</h3>
                {monthlyRevenue.every((m) => m.total === 0) ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Aucune donnée de vente
                  </div>
                ) : (
                  <div className="flex items-end gap-2 h-36">
                    {monthlyRevenue.map(({ label, total }) => (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {total > 0 ? (total >= 1_000_000 ? (total / 1_000_000).toFixed(1) + "M" : (total / 1000).toFixed(0) + "k") : ""}
                        </span>
                        <div
                          className="w-full rounded-t-sm bg-primary/80 transition-all"
                          style={{ height: `${Math.max((total / maxRevenue) * 100, total > 0 ? 4 : 0)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invoice breakdown */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Répartition des factures</h3>
              {invoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucune facture</div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Payées", key: "payee", color: "bg-emerald-500" },
                    { label: "En attente", key: "envoyee", color: "bg-blue-500" },
                    { label: "Brouillons", key: "brouillon", color: "bg-muted-foreground" },
                    { label: "En retard", key: "en_retard", color: "bg-red-500" },
                    { label: "Partielles", key: "partielle", color: "bg-amber-500" },
                  ].map(({ label, key, color }) => {
                    const count = invoices.filter((i) => i.status === key).length;
                    if (count === 0) return null;
                    const pct = (count / invoices.length) * 100;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
