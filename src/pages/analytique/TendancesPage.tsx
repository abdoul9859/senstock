import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";

const TOKEN_KEY = "mbayestock_token";
// Use relative URLs — Vite proxy routes /api to the server

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

interface TrendRow {
  month: string;
  key: string;
  revenue: number;
  expenses: number;
  salaries: number;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

const TendancesPage = () => {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/trends`, { headers: getHeaders() });
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalRevenue = data.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalExpenses = data.reduce((s, r) => s + (r.expenses || 0), 0);
  const totalSalaries = data.reduce((s, r) => s + (r.salaries || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Tendances</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Evolution du chiffre d'affaires, des depenses et des salaires sur 12 mois
        </p>
      </div>

      {loading ? (
        <StockLoader />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="rounded-lg border bg-blue-500/10 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Total CA (12 mois)</p>
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fmtMoney(totalRevenue)}
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-amber-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Total Depenses</p>
                <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {fmtMoney(totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg border bg-purple-500/10 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Total Salaires</p>
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
                {fmtMoney(totalSalaries)}
              </p>
            </div>
          </div>

          {/* Revenue chart */}
          {hasPermission("confidentialite.chiffre_affaires") && (
            <div className="rounded-lg border bg-card p-5 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                <TrendingUp className="inline h-4 w-4 mr-1.5 text-blue-500" />
                Chiffre d'affaires
              </h3>
              {data.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v))}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [fmtMoney(value), "CA"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Expenses chart */}
          <div className="rounded-lg border bg-card p-5 mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              <TrendingDown className="inline h-4 w-4 mr-1.5 text-amber-500" />
              Depenses
            </h3>
            {data.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [fmtMoney(value), "Depenses"]}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Salaries chart */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              <Users className="inline h-4 w-4 mr-1.5 text-purple-500" />
              Salaires
            </h3>
            {data.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorSalaries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [fmtMoney(value), "Salaires"]}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="salaries"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorSalaries)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TendancesPage;
