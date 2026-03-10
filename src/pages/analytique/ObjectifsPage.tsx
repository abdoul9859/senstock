import { useState, useEffect, useCallback } from "react";
import {
  Target, TrendingUp, TrendingDown, FileText, Settings2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";

const TOKEN_KEY = "senstock_token";
// Use relative URLs — Vite proxy routes /api to the server
const OBJECTIFS_KEY = "senstock_objectifs";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

interface Objectives {
  revenuTarget: number;
  invoiceTarget: number;
}

interface TrendRow {
  month: string;
  key: string;
  revenue: number;
  expenses: number;
  salaries: number;
}

interface Invoice {
  _id: string;
  status: string;
  total: number;
  date: string;
}

function loadObjectives(): Objectives {
  try {
    const raw = localStorage.getItem(OBJECTIFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        revenuTarget: parsed.revenuTarget ?? 1_000_000,
        invoiceTarget: parsed.invoiceTarget ?? 20,
      };
    }
  } catch {
    /* ignore */
  }
  return { revenuTarget: 1_000_000, invoiceTarget: 20 };
}

function saveObjectives(obj: Objectives) {
  localStorage.setItem(OBJECTIFS_KEY, JSON.stringify(obj));
}

const ObjectifsPage = () => {
  const { hasPermission } = useAuth();
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState<Objectives>(loadObjectives);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRevenuTarget, setEditRevenuTarget] = useState("");
  const [editInvoiceTarget, setEditInvoiceTarget] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        fetch(`/api/analytics/trends`, { headers: getHeaders() }),
        fetch(`/api/invoices`, { headers: getHeaders() }),
      ]);
      if (tRes.ok) setTrends(await tRes.json());
      if (iRes.ok) setInvoices(await iRes.json());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Current month info
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const currentTrend = trends.find((t) => t.key === currentMonthKey);
  const prevTrend = trends.find((t) => t.key === prevMonthKey);

  const currentRevenue = currentTrend?.revenue || 0;
  const prevRevenue = prevTrend?.revenue || 0;

  // Current month invoices count
  const currentMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const currentInvoiceCount = currentMonthInvoices.length;

  // Previous month invoices count
  const prevMonthInvoices = invoices.filter((inv) => {
    const d = new Date(inv.date);
    return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
  });
  const prevInvoiceCount = prevMonthInvoices.length;

  // Progress percentages
  const revenueProgress = objectives.revenuTarget > 0
    ? Math.min(100, Math.round((currentRevenue / objectives.revenuTarget) * 100))
    : 0;
  const invoiceProgress = objectives.invoiceTarget > 0
    ? Math.min(100, Math.round((currentInvoiceCount / objectives.invoiceTarget) * 100))
    : 0;

  // Revenue change
  const revenueDiff = prevRevenue > 0
    ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
    : currentRevenue > 0 ? 100 : 0;
  const revenueUp = revenueDiff >= 0;

  // Invoice change
  const invoiceDiff = prevInvoiceCount > 0
    ? Math.round(((currentInvoiceCount - prevInvoiceCount) / prevInvoiceCount) * 100)
    : currentInvoiceCount > 0 ? 100 : 0;
  const invoiceUp = invoiceDiff >= 0;

  // Open config dialog
  function openDialog() {
    setEditRevenuTarget(String(objectives.revenuTarget));
    setEditInvoiceTarget(String(objectives.invoiceTarget));
    setDialogOpen(true);
  }

  // Save config
  function handleSave() {
    const newObj: Objectives = {
      revenuTarget: Math.max(0, parseInt(editRevenuTarget) || 0),
      invoiceTarget: Math.max(0, parseInt(editInvoiceTarget) || 0),
    };
    saveObjectives(newObj);
    setObjectives(newObj);
    setDialogOpen(false);
  }

  const currentMonthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const prevMonthLabel = prevMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Objectifs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suivi des objectifs mensuels - {currentMonthLabel}
          </p>
        </div>
        <Button variant="outline" onClick={openDialog}>
          <Settings2 className="h-4 w-4 mr-1.5" />
          Configurer
        </Button>
      </div>

      {loading ? (
        <StockLoader />
      ) : (
        <>
          {/* Objective cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue objective */}
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">CA ce mois</h3>
                      <p className="text-xs text-muted-foreground">
                        Objectif : {fmtMoney(objectives.revenuTarget)}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {revenueProgress}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${revenueProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {fmtMoney(currentRevenue)} / {fmtMoney(objectives.revenuTarget)}
                  </span>
                  <div className="flex items-center gap-1">
                    {revenueUp ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={revenueUp ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                      {revenueUp ? "+" : ""}{revenueDiff}%
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">vs {prevMonthLabel}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice count objective */}
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Factures ce mois</h3>
                    <p className="text-xs text-muted-foreground">
                      Objectif : {objectives.invoiceTarget} factures
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {invoiceProgress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${invoiceProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentInvoiceCount} / {objectives.invoiceTarget} factures
                </span>
                <div className="flex items-center gap-1">
                  {invoiceUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={invoiceUp ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                    {invoiceUp ? "+" : ""}{invoiceDiff}%
                  </span>
                  <span className="text-muted-foreground text-xs ml-1">vs {prevMonthLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison section */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-5">
              Comparaison mois precedent
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* This month revenue */}
              {hasPermission("confidentialite.chiffre_affaires") && (
                <div className="rounded-lg bg-blue-500/10 p-4">
                  <p className="text-xs text-muted-foreground mb-1">CA ce mois</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {fmtMoney(currentRevenue)}
                  </p>
                </div>
              )}

              {/* Previous month revenue */}
              {hasPermission("confidentialite.chiffre_affaires") && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">CA mois precedent</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmtMoney(prevRevenue)}
                  </p>
                </div>
              )}

              {/* This month invoices */}
              <div className="rounded-lg bg-emerald-500/10 p-4">
                <p className="text-xs text-muted-foreground mb-1">Factures ce mois</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {currentInvoiceCount}
                </p>
              </div>

              {/* Previous month invoices */}
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Factures mois precedent</p>
                <p className="text-lg font-bold text-foreground">
                  {prevInvoiceCount}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Config Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer les objectifs</DialogTitle>
            <DialogDescription>
              Definissez vos objectifs mensuels de chiffre d'affaires et de nombre de factures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {hasPermission("confidentialite.chiffre_affaires") && (
              <div className="space-y-2">
                <Label>Objectif de chiffre d'affaires (F)</Label>
                <Input
                  type="number"
                  value={editRevenuTarget}
                  onChange={(e) => setEditRevenuTarget(e.target.value)}
                  placeholder="Ex: 1000000"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Objectif de factures</Label>
              <Input
                type="number"
                value={editInvoiceTarget}
                onChange={(e) => setEditInvoiceTarget(e.target.value)}
                placeholder="Ex: 20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObjectifsPage;
