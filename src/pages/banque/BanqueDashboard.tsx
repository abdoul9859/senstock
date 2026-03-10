import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface MonthlyData {
  month: string;
  entrees: number;
  sorties: number;
}

interface Account {
  _id: string;
  name: string;
  balance: number;
}

interface RecentTransaction {
  _id: string;
  number: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  accountId: { _id: string; name: string };
}

interface Stats {
  totalBalance: number;
  accountCount: number;
  monthEntries: number;
  monthExits: number;
  unreconciledCount: number;
  monthlyData: MonthlyData[];
  recent: RecentTransaction[];
  accounts: Account[];
}

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BanqueDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/bank-transactions/stats`, { headers });
        if (res.ok) setStats(await res.json());
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const monthlyData = stats?.monthlyData || [];
  const maxMonthly = Math.max(
    ...monthlyData.flatMap((d) => [d.entrees, d.sorties]),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Banque & Trésorerie</h1>
        <p className="text-muted-foreground">Vue d'ensemble des comptes et transactions</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-blue-500/10">
          <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {fmtMoney(stats?.totalBalance || 0)}
          </div>
          <div className="text-sm text-muted-foreground">Solde total</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-500/10">
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {fmtMoney(stats?.monthEntries || 0)}
          </div>
          <div className="text-sm text-muted-foreground">Entrées du mois</div>
        </div>
        <div className="rounded-lg border p-4 bg-red-500/10">
          <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400 mb-1" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {fmtMoney(stats?.monthExits || 0)}
          </div>
          <div className="text-sm text-muted-foreground">Sorties du mois</div>
        </div>
        <div className="rounded-lg border p-4 bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats?.unreconciledCount || 0}
          </div>
          <div className="text-sm text-muted-foreground">Non rapprochées</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/banque/comptes" className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Comptes</h3>
              <p className="text-sm text-muted-foreground">Gérer les comptes</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link to="/banque/transactions" className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Transactions</h3>
              <p className="text-sm text-muted-foreground">Voir les opérations</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link to="/banque/virements" className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Virements</h3>
              <p className="text-sm text-muted-foreground">Transferts entre comptes</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link to="/banque/rapprochement" className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Rapprochement</h3>
              <p className="text-sm text-muted-foreground">Rapprochement bancaire</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Évolution mensuelle</h3>
          </div>
          <div className="p-4">
            <div className="flex items-end gap-3 h-48 overflow-x-auto">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
                  <div className="flex items-end gap-1 h-36 w-full justify-center">
                    <div
                      className="w-3 bg-green-500 rounded-t"
                      style={{
                        height: `${(d.entrees / maxMonthly) * 100}%`,
                        minHeight: d.entrees > 0 ? "4px" : "0px",
                      }}
                      title={`Entrées: ${fmtMoney(d.entrees)}`}
                    />
                    <div
                      className="w-3 bg-red-500 rounded-t"
                      style={{
                        height: `${(d.sorties / maxMonthly) * 100}%`,
                        minHeight: d.sorties > 0 ? "4px" : "0px",
                      }}
                      title={`Sorties: ${fmtMoney(d.sorties)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" /> Entrées
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" /> Sorties
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {(stats?.accounts || []).length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Comptes bancaires</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Compte</th>
                <th className="text-right p-3 font-medium">Solde</th>
              </tr>
            </thead>
            <tbody>
              {stats!.accounts.map((acc) => (
                <tr key={acc._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {acc.name}
                  </td>
                  <td className={`p-3 text-right font-medium ${acc.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {fmtMoney(acc.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent transactions */}
      {(stats?.recent || []).length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Transactions récentes</h3>
            <Link to="/banque/transactions">
              <Button variant="ghost" size="sm">
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">N°</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-left p-3 font-medium">Compte</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {stats!.recent.slice(0, 5).map((tx) => (
                <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 text-muted-foreground">{tx.number}</td>
                  <td className="p-3 font-medium">{tx.description || tx.category}</td>
                  <td className="p-3 text-muted-foreground">{tx.accountId?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(tx.date)}</td>
                  <td className={`p-3 text-right font-medium ${tx.type === "entree" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.type === "entree" ? "+" : "-"}{fmtMoney(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
