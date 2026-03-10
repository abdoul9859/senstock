import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CheckCircle2,
  Landmark,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Account {
  _id: string;
  name: string;
}

interface Transaction {
  _id: string;
  number: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  accountId: { _id: string; name: string };
  date: string;
  reconciled: boolean;
  reconciledAt: string | null;
}

const typeLabels: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  virement: "Virement",
};

const typeColors: Record<string, string> = {
  entree: "bg-green-500/15 text-green-600 dark:text-green-400",
  sortie: "bg-red-500/15 text-red-600 dark:text-red-400",
  virement: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
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

export default function RapprochementPage() {
  const [tab, setTab] = useState<"unreconciled" | "reconciled">("unreconciled");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAccount, setFilterAccount] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reconcilingIds, setReconcilingIds] = useState<Set<string>>(new Set());
  const [batchReconciling, setBatchReconciling] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/bank-accounts`, { headers });
      if (res.ok) setAccounts(await res.json());
    } catch {}
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("reconciled", tab === "unreconciled" ? "false" : "true");
      if (filterAccount !== "all") params.set("accountId", filterAccount);

      const res = await fetch(`/api/bank-transactions?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      }
    } catch {
      setTransactions([]);
      setTotal(0);
    }
    setLoading(false);
  }, [tab, filterAccount]);

  useEffect(() => { fetchAccounts(); }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    fetchTransactions();
  }, [fetchTransactions]);

  const allSelected = transactions.length > 0 && transactions.every((t) => selectedIds.has(t._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t._id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reconcileSingle = async (id: string) => {
    setReconcilingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/bank-transactions/${id}/reconcile`, {
        method: "PUT",
        headers,
      });
      if (!res.ok) throw new Error();
      toast.success("Transaction rapprochée");
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      toast.error("Erreur lors du rapprochement");
    }
    setReconcilingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const reconcileBatch = async () => {
    if (selectedIds.size === 0) return;
    setBatchReconciling(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch(`/api/bank-transactions/reconcile-batch`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${ids.length} transaction${ids.length > 1 ? "s" : ""} rapprochée${ids.length > 1 ? "s" : ""}`);
      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t._id)));
      setTotal((prev) => prev - ids.length);
      setSelectedIds(new Set());
    } catch {
      toast.error("Erreur lors du rapprochement");
    }
    setBatchReconciling(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rapprochement bancaire</h1>
          {!loading && (
            <p className="text-muted-foreground">
              {tab === "unreconciled"
                ? `${total} transaction${total !== 1 ? "s" : ""} non rapprochée${total !== 1 ? "s" : ""}`
                : `${total} transaction${total !== 1 ? "s" : ""} rapprochée${total !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {tab === "unreconciled" && selectedIds.size > 0 && (
            <Button onClick={reconcileBatch} disabled={batchReconciling} size="sm">
              {batchReconciling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Rapprocher la sélection ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={fetchTransactions} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "unreconciled" | "reconciled")}>
          <TabsList>
            <TabsTrigger value="unreconciled">Non rapprochées</TabsTrigger>
            <TabsTrigger value="reconciled">Rapprochées</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tous les comptes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les comptes</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <Landmark className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">
            {tab === "unreconciled"
              ? "Toutes les transactions sont rapprochées"
              : "Aucune transaction rapprochée"}
          </h3>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {tab === "unreconciled" && (
                  <th className="p-3 w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </th>
                )}
                <th className="text-left p-3 font-medium">N°</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Compte</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Montant</th>
                {tab === "unreconciled" && (
                  <th className="text-right p-3 font-medium">Action</th>
                )}
                {tab === "reconciled" && (
                  <th className="text-left p-3 font-medium">Rapproché le</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30">
                  {tab === "unreconciled" && (
                    <td className="p-3">
                      <Checkbox checked={selectedIds.has(tx._id)} onCheckedChange={() => toggleSelect(tx._id)} />
                    </td>
                  )}
                  <td className="p-3 font-mono text-xs">{tx.number}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="p-3">
                    <Badge className={`${typeColors[tx.type] || ""} border-0 text-xs`}>
                      {typeLabels[tx.type] || tx.type}
                    </Badge>
                  </td>
                  <td className="p-3">{tx.accountId?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground truncate max-w-[200px]">{tx.description || "—"}</td>
                  <td className="p-3 text-right font-medium whitespace-nowrap">{fmtMoney(tx.amount)}</td>
                  {tab === "unreconciled" && (
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reconcilingIds.has(tx._id)}
                        onClick={() => reconcileSingle(tx._id)}
                      >
                        {reconcilingIds.has(tx._id)
                          ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="mr-1 h-3 w-3" />}
                        Rapprocher
                      </Button>
                    </td>
                  )}
                  {tab === "reconciled" && (
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {tx.reconciledAt ? fmtDate(tx.reconciledAt) : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
