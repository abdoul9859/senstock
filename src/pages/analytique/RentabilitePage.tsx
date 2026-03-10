import { useState, useEffect, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function fmtMoney(n: number) {
  return Number(n).toLocaleString("fr-FR") + " F";
}

interface ProductRow {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  quantity: number;
}

interface CategoryRow {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface Totals {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface ProfitabilityData {
  products: ProductRow[];
  categories: CategoryRow[];
  totals: Totals;
}

function MarginBadge({ margin }: { margin: number }) {
  const pct = margin.toFixed(1) + "%";
  if (margin >= 30) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
        {pct}
      </span>
    );
  }
  if (margin >= 15) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
        {pct}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
      {pct}
    </span>
  );
}

export default function RentabilitePage() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/profitability", {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Erreur lors du chargement");
      setData(await res.json());
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du chargement des donnees");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <StockLoader />;

  const totals = data?.totals || { revenue: 0, cost: 0, profit: 0, margin: 0 };
  const categories = data?.categories || [];
  const products = data?.products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold text-foreground">Rentabilite</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analyse de la rentabilite par produit et categorie
        </p>
      </div>

      {!hasPermission("confidentialite.marges") ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Vous n'avez pas la permission de consulter les donnees de rentabilite.
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Revenus totaux"
              value={fmtMoney(totals.revenue)}
              icon={DollarSign}
            />
            <StatCard
              label="Couts totaux"
              value={fmtMoney(totals.cost)}
              icon={TrendingDown}
            />
            <StatCard
              label="Profit total"
              value={fmtMoney(totals.profit)}
              icon={TrendingUp}
              trend={`Marge: ${totals.margin.toFixed(1)}%`}
            />
          </div>

          {/* Category Profitability */}
          <div className="rounded-lg border border-border bg-card p-5 animate-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Rentabilite par categorie
            </h3>
            {categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnee
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Categorie
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Revenus
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Couts
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Profit
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Marge %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr
                        key={cat.name}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{cat.name}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {fmtMoney(cat.revenue)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {fmtMoney(cat.cost)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {fmtMoney(cat.profit)}
                        </td>
                        <td className="p-3 text-right">
                          <MarginBadge margin={cat.margin} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Products by Profit */}
          <div className="rounded-lg border border-border bg-card p-5 animate-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Top produits par profit
            </h3>
            {products.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnee
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Produit
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Quantite vendue
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Revenus
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Couts
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Profit
                      </th>
                      <th className="text-right p-3 font-medium text-muted-foreground">
                        Marge %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => (
                      <tr
                        key={prod.name}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">{prod.name}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {prod.quantity.toLocaleString("fr-FR")}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {fmtMoney(prod.revenue)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {fmtMoney(prod.cost)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {fmtMoney(prod.profit)}
                        </td>
                        <td className="p-3 text-right">
                          <MarginBadge margin={prod.margin} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
