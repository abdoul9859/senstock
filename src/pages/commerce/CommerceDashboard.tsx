import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FileText, Clock, CheckCircle, TrendingUp, TrendingDown,
  Plus, ArrowRight, RefreshCw, Zap, FilePlus, FileCheck,
  CreditCard, Users, Truck, Package, Banknote, Boxes, BarChart3,
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

interface Invoice {
  _id: string;
  number: string;
  type: string;
  status: string;
  client?: { _id: string; name: string; phone: string };
  date: string;
  total: number;
  payment?: { enabled: boolean; amount: number; method: string; date: string };
  createdAt: string;
}

interface Quote {
  _id: string;
  number: string;
  status: string;
  client?: { name: string };
  total: number;
  date: string;
}

interface Client {
  _id: string;
  name: string;
  createdAt: string;
}

interface DeliveryNote {
  _id: string;
  number: string;
  status: string;
  date: string;
}

const statusColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  envoyee: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  payee: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  partielle: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  en_retard: "bg-red-500/15 text-red-600 dark:text-red-400",
  annulee: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée",
  partielle: "Partielle", en_retard: "En retard", annulee: "Annulée",
};

const typeIcons: Record<string, React.ElementType> = {
  echange: RefreshCw, vente_flash: Zap,
};

const PIE_COLORS: Record<string, string> = {
  payee: "#10b981",
  envoyee: "#3b82f6",
  brouillon: "#6b7280",
  en_retard: "#ef4444",
  partielle: "#f59e0b",
  annulee: "#9ca3af",
};

const quickLinks = [
  { label: "Factures", url: "/commerce/factures", icon: FileText },
  { label: "Devis", url: "/commerce/devis", icon: FilePlus },
  { label: "Bons de livraison", url: "/commerce/bons-livraison", icon: FileCheck },
  { label: "Clients", url: "/commerce/clients", icon: Users },
];

const CommerceDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, qRes, cRes, dRes] = await Promise.all([
        fetch("/api/invoices", { headers: getHeaders() }),
        fetch("/api/quotes", { headers: getHeaders() }),
        fetch("/api/clients", { headers: getHeaders() }),
        fetch("/api/delivery-notes", { headers: getHeaders() }),
      ]);
      if (iRes.ok) setInvoices(await iRes.json());
      if (qRes.ok) setQuotes(await qRes.json());
      if (cRes.ok) setClients(await cRes.json());
      if (dRes.ok) setDeliveryNotes(await dRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Computed stats ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const revenue = invoices.filter((i) => i.status === "payee" || i.status === "partielle")
    .reduce((s, i) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0), 0);

  const monthInvoices = invoices.filter((i) => new Date(i.date) >= monthStart);
  const monthRevenue = monthInvoices
    .filter((i) => i.status === "payee" || i.status === "partielle")
    .reduce((s, i) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0), 0);

  const prevMonthRevenue = invoices
    .filter((i) => {
      const d = new Date(i.date);
      return (i.status === "payee" || i.status === "partielle") && d >= prevMonthStart && d <= prevMonthEnd;
    })
    .reduce((s, i) => s + (i.payment?.enabled ? (i.payment.amount || 0) : 0), 0);

  const revenueTrend = prevMonthRevenue > 0
    ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
    : monthRevenue > 0 ? 100 : 0;

  const pendingInvoices = invoices.filter((i) => i.status === "envoyee" || i.status === "partielle").length;
  const overdueInvoices = invoices.filter((i) => i.status === "en_retard").length;

  const activeQuotes = quotes.filter((q) => q.status === "envoyee" || q.status === "accepte").length;
  const quotesAmount = quotes.filter((q) => q.status !== "refuse" && q.status !== "expire")
    .reduce((s, q) => s + (q.total || 0), 0);

  const pendingBL = deliveryNotes.filter((d) => d.status === "en_preparation" || d.status === "expedie").length;

  // Payment stats
  const paidThisMonth = invoices.filter((i) =>
    (i.status === "payee" || i.status === "partielle") &&
    i.payment?.enabled && i.payment.date && new Date(i.payment.date) >= monthStart
  );
  const paidThisMonthAmount = paidThisMonth.reduce((s, i) => s + (i.payment?.amount || 0), 0);
  const awaitingInvoices = invoices.filter((i) => i.status === "envoyee" || i.status === "partielle");
  const awaitingAmount = awaitingInvoices.reduce((s, i) => {
    const paid = i.payment?.enabled ? (i.payment.amount || 0) : 0;
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);
  const overdueList = invoices.filter((i) => i.status === "en_retard");
  const overdueAmount = overdueList.reduce((s, i) => {
    const paid = i.payment?.enabled ? (i.payment.amount || 0) : 0;
    return s + Math.max(0, (i.total || 0) - paid);
  }, 0);

  // --- Revenue chart: last 6 months ---
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const ca = invoices
      .filter((inv) => {
        const id = new Date(inv.date);
        return (inv.status === "payee" || inv.status === "partielle") &&
          id.getMonth() === month && id.getFullYear() === year;
      })
      .reduce((s, inv) => s + (inv.payment?.enabled ? (inv.payment.amount || 0) : 0), 0);

    const factures = invoices.filter((inv) => {
      const id = new Date(inv.date);
      return id.getMonth() === month && id.getFullYear() === year;
    }).length;

    return { label, ca, factures };
  });

  // --- Invoice status breakdown for pie chart ---
  const statusBreakdown = ["payee", "envoyee", "brouillon", "partielle", "en_retard", "annulee"]
    .map((key) => ({
      name: statusLabels[key] || key,
      value: invoices.filter((i) => i.status === key).length,
      color: PIE_COLORS[key] || "#6b7280",
    }))
    .filter((s) => s.value > 0);

  // --- Top clients by revenue ---
  const clientRevenue: Record<string, { name: string; total: number; count: number }> = {};
  invoices.forEach((inv) => {
    if (!inv.client) return;
    const id = inv.client._id;
    if (!clientRevenue[id]) clientRevenue[id] = { name: inv.client.name, total: 0, count: 0 };
    clientRevenue[id].total += inv.total || 0;
    clientRevenue[id].count += 1;
  });
  const topClients = Object.values(clientRevenue)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // --- Monthly invoices bar data ---
  const invoiceTypeData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString("fr-FR", { month: "short" });

    const monthInvs = invoices.filter((inv) => {
      const id = new Date(inv.date);
      return id.getMonth() === month && id.getFullYear() === year;
    });

    return {
      label,
      factures: monthInvs.filter((i) => i.type === "facture").length,
      proformas: monthInvs.filter((i) => i.type === "proforma").length,
      autres: monthInvs.filter((i) => !["facture", "proforma"].includes(i.type)).length,
    };
  });

  // Recent invoices
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Vue d'ensemble — Commerce</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Resume complet de votre activite commerciale</p>
        </div>
        <Button onClick={() => navigate("/commerce/factures/nouvelle")}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle facture
        </Button>
      </div>

      <UpgradeBanner className="mb-6" />

      {loading ? <StockLoader /> : (
        <>
          {/* Row 1: Key metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
            {hasPermission("confidentialite.chiffre_affaires") && <div className="animate-card"><StatCard label="Chiffre d'affaires" value={formatFCFA(revenue)} icon={TrendingUp} /></div>}
            {hasPermission("confidentialite.chiffre_affaires") && <div className="animate-card">
              <StatCard
                label="CA ce mois"
                value={formatFCFA(monthRevenue)}
                icon={revenueTrend >= 0 ? TrendingUp : TrendingDown}
                trend={revenueTrend !== 0 ? `${revenueTrend > 0 ? "+" : ""}${revenueTrend}% vs mois precedent` : undefined}
              />
            </div>}
            <div className="animate-card"><StatCard label="Factures" value={String(invoices.length)} icon={FileText} /></div>
            <div className="animate-card"><StatCard label="Devis actifs" value={String(activeQuotes)} icon={FilePlus} /></div>
            <div className="animate-card"><StatCard label="Clients" value={String(clients.length)} icon={Users} /></div>
            <div className="animate-card"><StatCard label="BL en cours" value={String(pendingBL)} icon={Truck} /></div>
          </div>

          {/* Row 2: Payment summary cards */}
          {hasPermission("confidentialite.paiements") && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
            <div className="animate-card"><StockCard title="Paiements recus" subtitle={`${paidThisMonth.length} ce mois — ${formatFCFA(paidThisMonthAmount)}`} icon={CreditCard} status="active" /></div>
            <div className="animate-card"><StockCard title="En attente" subtitle={`${awaitingInvoices.length} paiement${awaitingInvoices.length > 1 ? "s" : ""} — ${formatFCFA(awaitingAmount)}`} icon={CreditCard} status="warning" /></div>
            <div className="animate-card"><StockCard title="En retard" subtitle={`${overdueList.length} paiement${overdueList.length > 1 ? "s" : ""} — ${formatFCFA(overdueAmount)}`} icon={CreditCard} status="inactive" /></div>
          </div>
          )}

          {/* Row 3: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue area chart — spans 2 cols */}
            {hasPermission("confidentialite.chiffre_affaires") && <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Chiffre d'affaires mensuel</h3>
              <p className="text-xs text-muted-foreground mb-4">Evolution sur les 6 derniers mois</p>
              {revenueData.every((d) => d.ca === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucune donnee de vente
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} width={45} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatFCFA(value), "CA"]}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ca"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#caGrad)"
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>}

            {/* Invoice status pie chart */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Statut des factures</h3>
              <p className="text-xs text-muted-foreground mb-4">Repartition actuelle</p>
              {statusBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucune facture
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusBreakdown.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [`${value} facture${value > 1 ? "s" : ""}`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {statusBreakdown.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        {s.name} ({s.value})
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 4: Monthly invoice count bar chart + Top clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly bar chart */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Volume de facturation</h3>
              <p className="text-xs text-muted-foreground mb-4">Nombre de factures par mois</p>
              {invoiceTypeData.every((d) => d.factures + d.proformas + d.autres === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Aucune facture
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={invoiceTypeData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                    <Bar dataKey="factures" name="Factures" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="proformas" name="Proformas" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="autres" name="Autres" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top clients */}
            {hasPermission("confidentialite.chiffre_affaires") && <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Top clients</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Par volume de facturation</p>
                </div>
                <button
                  onClick={() => navigate("/commerce/clients")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {topClients.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Aucun client</div>
              ) : (
                <div className="divide-y divide-border">
                  {topClients.map((c, idx) => {
                    const maxTotal = topClients[0]?.total || 1;
                    const pct = Math.round((c.total / maxTotal) * 100);
                    return (
                      <div key={idx} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-foreground">{c.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono font-medium text-foreground">{formatFCFA(c.total)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{c.count} facture{c.count > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}
          </div>

          {/* Row 5: Recent invoices + Quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent invoices */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Factures recentes</h3>
                <button
                  onClick={() => navigate("/commerce/factures")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {recentInvoices.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Aucune facture</p>
                  <button
                    onClick={() => navigate("/commerce/factures/nouvelle")}
                    className="text-xs text-primary hover:underline"
                  >
                    Creer votre premiere facture
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentInvoices.map((inv) => {
                    const TypeIcon = typeIcons[inv.type];
                    return (
                      <div
                        key={inv._id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/commerce/factures/${inv._id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-muted-foreground">{inv.number}</span>
                            {TypeIcon && <TypeIcon className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">
                            {inv.client?.name || <span className="italic text-muted-foreground">Sans client</span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {hasPermission("confidentialite.chiffre_affaires") && <p className="text-sm font-mono font-medium text-foreground">{formatFCFA(inv.total)}</p>}
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[inv.status] || statusColors.brouillon}`}>
                            {statusLabels[inv.status] || inv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
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

              {/* Summary box */}
              <div className="mx-3 mb-3 rounded-md bg-muted/50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Activite du mois</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Factures creees</span>
                    <span className="font-medium text-foreground">{monthInvoices.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Devis envoyes</span>
                    <span className="font-medium text-foreground">
                      {quotes.filter((q) => {
                        const d = new Date(q.date);
                        return d >= monthStart && (q.status === "envoyee" || q.status === "accepte");
                      }).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">BL generes</span>
                    <span className="font-medium text-foreground">
                      {deliveryNotes.filter((d) => new Date(d.date) >= monthStart).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Nouveaux clients</span>
                    <span className="font-medium text-foreground">
                      {clients.filter((c) => new Date(c.createdAt) >= monthStart).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cross-workspace quick links */}
          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Acces rapide aux autres espaces</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate("/entrepot/inventaire")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-primary/10 p-2.5 shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Boxes className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Inventaire</p>
                  <p className="text-xs text-muted-foreground">Entrepot → Stock & produits</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => navigate("/logistique/commandes")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-amber-500/10 p-2.5 shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <Truck className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Commandes fournisseurs</p>
                  <p className="text-xs text-muted-foreground">Logistique → Achats</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => navigate("/analytique/dashboard")}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <div className="rounded-md bg-blue-500/10 p-2.5 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Analytique</p>
                  <p className="text-xs text-muted-foreground">Tendances & performance</p>
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

export default CommerceDashboard;
