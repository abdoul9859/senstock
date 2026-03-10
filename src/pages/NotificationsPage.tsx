import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell, Package, FileText, Wallet, Truck, AlertTriangle,
  ArrowRight, Loader2, CheckCircle, ListChecks, Clock,
} from "lucide-react";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

interface Alert {
  id: string;
  type: "stock" | "invoice" | "salary" | "delivery" | "creance" | "task";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  link: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchAlerts = useCallback(async () => {
    const results: Alert[] = [];
    const headers = getHeaders();

    try {
      // 1. Low stock alerts
      const prodRes = await fetch("/api/products", { headers });
      if (prodRes.ok) {
        const products = await prodRes.json();
        products.forEach((p: any) => {
          if (p.quantity === 0) {
            results.push({
              id: `stock-${p._id}`,
              type: "stock",
              severity: "critical",
              title: `Rupture de stock : ${p.name}`,
              description: `${p.brand || ""} — Stock epuise`.trim(),
              link: "/entrepot/inventaire",
            });
          } else if (p.quantity <= 5) {
            results.push({
              id: `stock-${p._id}`,
              type: "stock",
              severity: "warning",
              title: `Stock bas : ${p.name}`,
              description: `${p.quantity} unite${p.quantity > 1 ? "s" : ""} restante${p.quantity > 1 ? "s" : ""}`,
              link: "/entrepot/inventaire",
            });
          }
        });
      }

      // 2. Unpaid invoices
      const invRes = await fetch("/api/invoices", { headers });
      if (invRes.ok) {
        const invoices = await invRes.json();
        invoices.forEach((inv: any) => {
          if (inv.status === "en_attente" || inv.status === "partiel") {
            const remaining = inv.total - (inv.payment?.amount || 0);
            results.push({
              id: `inv-${inv._id}`,
              type: "invoice",
              severity: inv.dueDate && new Date(inv.dueDate) < new Date() ? "critical" : "warning",
              title: `Facture impayee : ${inv.number}`,
              description: `Reste ${fmtMoney(remaining)}${inv.client?.name ? ` — ${inv.client.name}` : ""}`,
              link: `/commerce/factures/${inv._id}`,
            });
          }
        });
      }

      // 3. Unpaid salaries
      const salRes = await fetch("/api/salaries", { headers });
      if (salRes.ok) {
        const salaries = await salRes.json();
        const unpaid = salaries.filter((s: any) => s.status === "en_attente");
        if (unpaid.length > 0) {
          const totalUnpaid = unpaid.reduce((sum: number, s: any) => sum + s.netSalary, 0);
          results.push({
            id: "salary-pending",
            type: "salary",
            severity: "warning",
            title: `${unpaid.length} salaire${unpaid.length > 1 ? "s" : ""} en attente`,
            description: `Total : ${fmtMoney(totalUnpaid)}`,
            link: "/personnel/salaires",
          });
        }
      }

      // 4. Pending deliveries
      const ordRes = await fetch("/api/purchase-orders", { headers });
      if (ordRes.ok) {
        const orders = await ordRes.json();
        orders.forEach((o: any) => {
          if (o.status === "en_transit") {
            const isLate = o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < new Date();
            results.push({
              id: `delivery-${o._id}`,
              type: "delivery",
              severity: isLate ? "critical" : "info",
              title: `Livraison ${isLate ? "en retard" : "en cours"} : ${o.number}`,
              description: `${typeof o.supplier === "object" ? o.supplier?.name : "Fournisseur"}`,
              link: "/logistique/livraisons",
            });
          }
        });
      }

      // 5. Creances
      const crRes = await fetch("/api/creances", { headers });
      if (crRes.ok) {
        const creances = await crRes.json();
        const active = creances.filter((c: any) => c.status === "en_cours" || c.status === "partiel");
        if (active.length > 0) {
          const totalDue = active.reduce((sum: number, c: any) => sum + (c.remaining || 0), 0);
          results.push({
            id: "creances-active",
            type: "creance",
            severity: "warning",
            title: `${active.length} creance${active.length > 1 ? "s" : ""} en cours`,
            description: `Total du : ${fmtMoney(totalDue)}`,
            link: "/commerce/creances",
          });
        }
      }

      // 6. Task alerts
      const taskRes = await fetch("/api/tasks/agenda?start=2000-01-01&end=2099-12-31", { headers });
      if (taskRes.ok) {
        const tasks = await taskRes.json();
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        // Overdue tasks
        const overdue = tasks.filter((t: any) =>
          !t.completed && t.dueDate && new Date(t.dueDate) < now && new Date(t.dueDate).toISOString().split("T")[0] !== todayStr
        );
        if (overdue.length > 0) {
          results.push({
            id: "tasks-overdue",
            type: "task",
            severity: "critical",
            title: `${overdue.length} tache${overdue.length > 1 ? "s" : ""} en retard`,
            description: overdue.slice(0, 3).map((t: any) => t.title).join(", ") + (overdue.length > 3 ? "..." : ""),
            link: "/taches/agenda",
          });
        }

        // Due today
        const dueToday = tasks.filter((t: any) =>
          !t.completed && t.dueDate && new Date(t.dueDate).toISOString().split("T")[0] === todayStr
        );
        if (dueToday.length > 0) {
          results.push({
            id: "tasks-today",
            type: "task",
            severity: "warning",
            title: `${dueToday.length} tache${dueToday.length > 1 ? "s" : ""} pour aujourd'hui`,
            description: dueToday.slice(0, 3).map((t: any) => t.title).join(", ") + (dueToday.length > 3 ? "..." : ""),
            link: "/taches/agenda",
          });
        }

        // Urgent not completed
        const urgent = tasks.filter((t: any) => !t.completed && t.priority === "urgent");
        if (urgent.length > 0) {
          results.push({
            id: "tasks-urgent",
            type: "task",
            severity: "warning",
            title: `${urgent.length} tache${urgent.length > 1 ? "s" : ""} urgente${urgent.length > 1 ? "s" : ""}`,
            description: urgent.slice(0, 3).map((t: any) => t.title).join(", ") + (urgent.length > 3 ? "..." : ""),
            link: "/taches/liste",
          });
        }
      }
    } catch { /* ignore individual failures */ }

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    results.sort((a, b) => order[a.severity] - order[b.severity]);
    setAlerts(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const severityConfig = {
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600 dark:text-red-400", badge: "bg-red-500/15 text-red-600" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/15 text-amber-600" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/15 text-blue-600" },
  };

  const typeConfig: Record<string, { icon: any; label: string }> = {
    stock: { icon: Package, label: "Stock" },
    invoice: { icon: FileText, label: "Facture" },
    salary: { icon: Wallet, label: "Salaire" },
    delivery: { icon: Truck, label: "Livraison" },
    creance: { icon: AlertTriangle, label: "Creance" },
    task: { icon: ListChecks, label: "Tache" },
  };

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notifications
        </h1>
        <p className="text-muted-foreground">
          {alerts.length} alerte{alerts.length !== 1 ? "s" : ""} active{alerts.length !== 1 ? "s" : ""}
          {criticalCount > 0 && <span className="text-red-500 font-medium"> — {criticalCount} critique{criticalCount > 1 ? "s" : ""}</span>}
          {warningCount > 0 && <span className="text-amber-500 font-medium"> — {warningCount} avertissement{warningCount > 1 ? "s" : ""}</span>}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "Tout", count: alerts.length },
          { key: "stock", label: "Stock", count: alerts.filter((a) => a.type === "stock").length },
          { key: "invoice", label: "Factures", count: alerts.filter((a) => a.type === "invoice").length },
          { key: "task", label: "Taches", count: alerts.filter((a) => a.type === "task").length },
          { key: "salary", label: "Salaires", count: alerts.filter((a) => a.type === "salary").length },
          { key: "delivery", label: "Livraisons", count: alerts.filter((a) => a.type === "delivery").length },
          { key: "creance", label: "Creances", count: alerts.filter((a) => a.type === "creance").length },
        ].filter((t) => t.count > 0 || t.key === "all").map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-background/20 border-0">{tab.count}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Alerts list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500/30 mb-4" />
          <h3 className="text-lg font-semibold">Tout est en ordre</h3>
          <p className="text-muted-foreground">Aucune alerte pour cette categorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const sev = severityConfig[alert.severity];
            const tc = typeConfig[alert.type] || typeConfig.stock;
            const Icon = tc.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${sev.bg} ${sev.border} cursor-pointer hover:shadow-sm transition-shadow animate-list-item`}
                onClick={() => navigate(alert.link)}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${sev.bg}`}>
                  <Icon className={`h-5 w-5 ${sev.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{alert.title}</span>
                    <Badge className={`${sev.badge} border-0 text-[10px]`}>
                      {alert.severity === "critical" ? "Critique" : alert.severity === "warning" ? "Attention" : "Info"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{tc.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
