import { useState, useEffect, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "senstock_token";
// Use relative URLs — Vite proxy routes /api to the server

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyee",
  payee: "Payee",
  partielle: "Partielle",
  en_retard: "En retard",
  annulee: "Annulee",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};

interface BreakdownData {
  invoicesByStatus: { name: string; value: number }[];
  productsByCategory: { name: string; value: number }[];
  revenueByCategory: { name: string; value: number }[];
  topProducts: { name: string; value: number }[];
}

/* Custom tooltip for PieChart */
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div
      style={tooltipStyle}
      className="px-3 py-2 text-sm shadow-lg"
    >
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{fmtMoney(value)}</p>
    </div>
  );
};

const PieTooltipCount = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div
      style={tooltipStyle}
      className="px-3 py-2 text-sm shadow-lg"
    >
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  );
};

const RepartitionPage = () => {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/breakdown`, { headers: getHeaders() });
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Data is already in { name, value } format from the API
  const revenueByCategory = (data?.revenueByCategory || []).map((r) => ({
    name: r.name || "Sans categorie",
    value: r.value,
  }));

  const productsByCategory = (data?.productsByCategory || []).map((r) => ({
    name: r.name || "Sans categorie",
    value: r.value,
  }));

  const invoicesByStatus = (data?.invoicesByStatus || []).map((r) => ({
    name: STATUS_LABELS[r.name] || r.name,
    value: r.value,
  }));

  const topProducts = (data?.topProducts || []).slice(0, 10).map((r) => ({
    name: r.name,
    revenue: r.value,
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Repartition</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Analyse de la repartition des revenus, produits et factures
        </p>
      </div>

      {loading ? (
        <StockLoader />
      ) : !data ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Impossible de charger les donnees
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by category */}
          {hasPermission("confidentialite.chiffre_affaires") && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">CA par categorie</h3>
              {revenueByCategory.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={revenueByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {revenueByCategory.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Products by category */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Produits par categorie</h3>
            {productsByCategory.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={productsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {productsByCategory.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipCount />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Invoices by status */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Factures par statut</h3>
            {invoicesByStatus.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={invoicesByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {invoicesByStatus.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipCount />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 10 products by revenue */}
          {hasPermission("confidentialite.chiffre_affaires") && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 produits par CA</h3>
              {topProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnee</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? (v / 1_000_000).toFixed(1) + "M"
                          : v >= 1000
                            ? (v / 1000).toFixed(0) + "k"
                            : String(v)
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [fmtMoney(value), "CA"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepartitionPage;
