import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Wallet, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Use relative URLs — Vite proxy routes /api to the server

interface Stats {
  activeEmployees: number;
  currentMonthTotal: number;
  currentMonthPaid: number;
  currentMonthPending: number;
  totalPaidAllTime: number;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  status: string;
  baseSalary: number;
}

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

export default function PersonnelDashboard() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          fetch(`/api/salaries/stats`, { headers }),
          fetch(`/api/employees`, { headers }),
        ]);
        if (sRes.ok) setStats(await sRes.json());
        if (eRes.ok) setEmployees(await eRes.json());
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

  const activeEmployees = employees.filter((e) => e.status === "actif");
  const totalMassSalariale = activeEmployees.reduce((s, e) => s + (e.baseSalary || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion du personnel</h1>
        <p className="text-muted-foreground">Vue d'ensemble des employés et salaires</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-blue-500/10">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.activeEmployees || activeEmployees.length}
          </div>
          <div className="text-sm text-muted-foreground">Employés actifs</div>
        </div>
        {hasPermission("confidentialite.salaires") && (
        <div className="rounded-lg border p-4 bg-amber-500/10">
          <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {fmtMoney(totalMassSalariale)}
          </div>
          <div className="text-sm text-muted-foreground">Masse salariale</div>
        </div>
        )}
        <div className="rounded-lg border p-4 bg-green-500/10">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mb-1" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats?.currentMonthPaid || 0}
          </div>
          <div className="text-sm text-muted-foreground">Payés ce mois</div>
        </div>
        <div className="rounded-lg border p-4 bg-orange-500/10">
          <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 mb-1" />
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats?.currentMonthPending || 0}
          </div>
          <div className="text-sm text-muted-foreground">En attente</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/personnel/employes"
          className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Employés</h3>
              <p className="text-sm text-muted-foreground">
                Gérer les fiches des employés
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
        <Link
          to="/personnel/salaires"
          className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Salaires</h3>
              <p className="text-sm text-muted-foreground">
                Fiches de paie et paiements
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      </div>

      {/* Recent employees */}
      {activeEmployees.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Employés actifs</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Poste</th>
                <th className="text-left p-3 font-medium">Département</th>
                {hasPermission("confidentialite.salaires") && (
                <th className="text-right p-3 font-medium">Salaire de base</th>
                )}
              </tr>
            </thead>
            <tbody>
              {activeEmployees.slice(0, 10).map((emp) => (
                <tr key={emp._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {emp.lastName} {emp.firstName}
                  </td>
                  <td className="p-3 text-muted-foreground">{emp.position}</td>
                  <td className="p-3 text-muted-foreground">{emp.department || "—"}</td>
                  {hasPermission("confidentialite.salaires") && (
                  <td className="p-3 text-right font-medium">{fmtMoney(emp.baseSalary)}</td>
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
