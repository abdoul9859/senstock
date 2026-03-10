import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  Wallet,
  Loader2,
  Eye,
  Trash2,
  Plus,
  CheckCircle2,
  Printer,
  X,
  RefreshCw,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface SalaryEntry {
  _id: string;
  number: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    position: string;
    department: string;
  } | null;
  period: string;
  baseSalary: number;
  bonuses: { _id?: string; label: string; amount: number }[];
  deductions: { _id?: string; label: string; amount: number }[];
  totalBonuses: number;
  totalDeductions: number;
  netSalary: number;
  paymentMethod: string;
  paymentDate: string | null;
  status: string;
  notes: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
  baseSalary: number;
  status: string;
}

const statusLabels: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payé",
  annulee: "Annulé",
};

const statusColors: Record<string, string> = {
  en_attente: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  payee: "bg-green-500/15 text-green-600 dark:text-green-400",
  annulee: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const paymentLabels: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  cheque: "Chèque",
};

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(p: string) {
  const [year, month] = p.split("-");
  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function SalairesPage() {
  const { hasPermission } = useAuth();
  const canSeeSalaries = hasPermission("confidentialite.salaires");
  const [salaries, setSalaries] = useState<SalaryEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SalaryEntry | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState(getCurrentPeriod());
  const [generating, setGenerating] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const [sRes, eRes] = await Promise.all([
        fetch(`/api/salaries`, { headers }),
        fetch(`/api/employees`, { headers }),
      ]);
      if (sRes.ok) setSalaries(await sRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, []);

  // Available periods from salaries
  const periods = [...new Set(salaries.map((s) => s.period))].sort().reverse();

  const filtered = salaries.filter((s) => {
    if (periodFilter !== "all" && s.period !== periodFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const empName = s.employee
        ? `${s.employee.lastName} ${s.employee.firstName}`.toLowerCase()
        : "";
      return (
        s.number.toLowerCase().includes(q) ||
        empName.includes(q)
      );
    }
    return true;
  });

  // Stats for current filter
  const filteredTotal = filtered.reduce((s, sal) => s + sal.netSalary, 0);
  const filteredPaid = filtered.filter((s) => s.status === "payee").length;
  const filteredPending = filtered.filter((s) => s.status === "en_attente").length;

  // Generate salaries
  const handleGenerate = async () => {
    if (!generatePeriod) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/salaries/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ period: generatePeriod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(data.message);
      setGenerateOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setGenerating(false);
  };

  // Pay salary
  const markAsPaid = async (sal: SalaryEntry, method: string) => {
    try {
      const res = await fetch(`/api/salaries/${sal._id}/pay`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ paymentMethod: method }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Marqué comme payé");
      const updated = await res.json();
      setSalaries((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      if (selected?._id === updated._id) setSelected(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update bonuses/deductions
  const updateSalary = async (id: string, data: Partial<SalaryEntry>) => {
    try {
      const res = await fetch(`/api/salaries/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Mis à jour");
      const updated = await res.json();
      setSalaries((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      if (selected?._id === updated._id) setSelected(updated);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete
  const deleteSalary = async (id: string) => {
    if (!confirm("Supprimer cette fiche de paie ?")) return;
    try {
      await fetch(`/api/salaries/${id}`, { method: "DELETE", headers });
      toast.success("Supprimé");
      setSalaries((prev) => prev.filter((s) => s._id !== id));
      if (selected?._id === id) {
        setSelected(null);
        setDetailOpen(false);
      }
    } catch {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salaires</h1>
          <p className="text-muted-foreground">Gestion des fiches de paie</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Générer les fiches
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 bg-blue-500/10">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{canSeeSalaries ? fmtMoney(filteredTotal) : "••••••"}</div>
          <div className="text-sm text-muted-foreground">Total affiché</div>
        </div>
        <div className="rounded-lg border p-4 bg-green-500/10">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredPaid}</div>
          <div className="text-sm text-muted-foreground">Payés</div>
        </div>
        <div className="rounded-lg border p-4 bg-amber-500/10">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{filteredPending}</div>
          <div className="text-sm text-muted-foreground">En attente</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Wallet className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucune fiche de paie</h3>
          <p className="text-muted-foreground">
            Générez les fiches pour une période
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">N°</th>
                <th className="text-left p-3 font-medium">Employé</th>
                <th className="text-left p-3 font-medium">Période</th>
                {canSeeSalaries && <th className="text-right p-3 font-medium">Base</th>}
                {canSeeSalaries && <th className="text-right p-3 font-medium">Net</th>}
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sal) => (
                <tr key={sal._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{sal.number}</td>
                  <td className="p-3">
                    <div className="font-medium">
                      {sal.employee
                        ? `${sal.employee.lastName} ${sal.employee.firstName}`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sal.employee?.position || ""}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {periodLabel(sal.period)}
                  </td>
                  {canSeeSalaries && (
                  <td className="p-3 text-right text-muted-foreground">
                    {fmtMoney(sal.baseSalary)}
                  </td>
                  )}
                  {canSeeSalaries && (
                  <td className="p-3 text-right font-bold">
                    {fmtMoney(sal.netSalary)}
                  </td>
                  )}
                  <td className="p-3">
                    <Badge className={`${statusColors[sal.status]} border-0 text-xs`}>
                      {statusLabels[sal.status]}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setSelected(sal); setDetailOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {sal.status === "en_attente" && (
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-green-600"
                          onClick={() => markAsPaid(sal, sal.paymentMethod)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                        onClick={() => deleteSalary(sal._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========== GENERATE DIALOG =========== */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Générer les fiches de paie</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crée automatiquement une fiche de paie pour chaque employé actif
              qui n'a pas encore de fiche pour la période sélectionnée.
            </p>
            <div>
              <Label>Période</Label>
              <Input
                type="month"
                value={generatePeriod}
                onChange={(e) => setGeneratePeriod(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {employees.filter((e) => e.status === "actif").length} employés actifs
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========== DETAIL DIALOG =========== */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="font-mono">{selected.number}</span>
                <Badge className={`${statusColors[selected.status]} border-0`}>
                  {statusLabels[selected.status]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Employé</span>
                  <div className="font-medium">
                    {selected.employee
                      ? `${selected.employee.lastName} ${selected.employee.firstName}`
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selected.employee?.position}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Période</span>
                  <div className="font-medium">{periodLabel(selected.period)}</div>
                </div>
              </div>

              {/* Breakdown */}
              {canSeeSalaries ? (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salaire de base</span>
                  <span className="font-medium">{fmtMoney(selected.baseSalary)}</span>
                </div>

                {/* Bonuses */}
                {selected.bonuses.length > 0 && (
                  <div className="space-y-1">
                    {selected.bonuses.map((b, i) => (
                      <div key={i} className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          + {b.label}
                          {selected.status === "en_attente" && (
                            <button
                              className="text-red-400 hover:text-red-600"
                              onClick={() => {
                                const newBonuses = selected.bonuses.filter((_, j) => j !== i);
                                updateSalary(selected._id, {
                                  baseSalary: selected.baseSalary,
                                  bonuses: newBonuses,
                                  deductions: selected.deductions,
                                } as any);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                        <span>{fmtMoney(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deductions */}
                {selected.deductions.length > 0 && (
                  <div className="space-y-1">
                    {selected.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-red-600">
                        <span className="flex items-center gap-1">
                          - {d.label}
                          {selected.status === "en_attente" && (
                            <button
                              className="text-red-400 hover:text-red-600"
                              onClick={() => {
                                const newDeductions = selected.deductions.filter((_, j) => j !== i);
                                updateSalary(selected._id, {
                                  baseSalary: selected.baseSalary,
                                  bonuses: selected.bonuses,
                                  deductions: newDeductions,
                                } as any);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                        <span>{fmtMoney(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add bonus/deduction */}
                {selected.status === "en_attente" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const label = prompt("Libellé de la prime :");
                        if (!label) return;
                        const amount = Number(prompt("Montant :", "0")) || 0;
                        updateSalary(selected._id, {
                          baseSalary: selected.baseSalary,
                          bonuses: [...selected.bonuses, { label, amount }],
                          deductions: selected.deductions,
                        } as any);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Prime
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const label = prompt("Libellé de la retenue :");
                        if (!label) return;
                        const amount = Number(prompt("Montant :", "0")) || 0;
                        updateSalary(selected._id, {
                          baseSalary: selected.baseSalary,
                          bonuses: selected.bonuses,
                          deductions: [...selected.deductions, { label, amount }],
                        } as any);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Retenue
                    </Button>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Net à payer</span>
                  <span>{fmtMoney(selected.netSalary)}</span>
                </div>
              </div>
              ) : (
              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground italic">
                  Vous n'avez pas la permission de voir les montants des salaires.
                </p>
              </div>
              )}

              {/* Payment info */}
              <div className="border-t pt-3 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Mode de paiement</span>
                  <div className="font-medium">
                    {paymentLabels[selected.paymentMethod] || selected.paymentMethod}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date de paiement</span>
                  <div className="font-medium">{fmtDate(selected.paymentDate)}</div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-wrap gap-2">
              {selected.status === "en_attente" && (
                <Select
                  onValueChange={(method) => markAsPaid(selected, method)}
                >
                  <SelectTrigger className="w-44 h-9 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Marquer payé..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const emp = selected.employee;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  const bonusesHtml = selected.bonuses
                    .map((b) => `<div style="display:flex;justify-content:space-between;color:green"><span>+ ${b.label}</span><span>${fmtMoney(b.amount)}</span></div>`)
                    .join("");
                  const deductionsHtml = selected.deductions
                    .map((d) => `<div style="display:flex;justify-content:space-between;color:red"><span>- ${d.label}</span><span>${fmtMoney(d.amount)}</span></div>`)
                    .join("");
                  win.document.write(`<html><head><title>Fiche ${selected.number}</title>
                    <style>body{font-family:Arial,sans-serif;max-width:500px;margin:20px auto;font-size:13px}
                    .title{text-align:center;font-size:16px;font-weight:bold;margin-bottom:4px}
                    .mono{font-family:monospace;text-align:center;font-size:14px}
                    .meta{color:#888;text-align:center;margin-bottom:12px}
                    .sep{border-top:1px solid #ddd;padding-top:8px;margin-top:8px}
                    .row{display:flex;justify-content:space-between;margin:4px 0}
                    .total{font-weight:bold;font-size:16px}
                    @media print{body{margin:0}}</style></head>
                    <body>
                    <div class="title">FICHE DE PAIE</div>
                    <div class="mono">${selected.number}</div>
                    <div class="meta">${periodLabel(selected.period)}</div>
                    <div class="sep">
                      <div class="row"><span><strong>Employé</strong></span><span>${emp ? `${emp.lastName} ${emp.firstName}` : "—"}</span></div>
                      <div class="row"><span>Poste</span><span>${emp?.position || "—"}</span></div>
                    </div>
                    <div class="sep">
                      <div class="row"><span>Salaire de base</span><span>${fmtMoney(selected.baseSalary)}</span></div>
                      ${bonusesHtml}${deductionsHtml}
                    </div>
                    <div class="sep row total"><span>Net à payer</span><span>${fmtMoney(selected.netSalary)}</span></div>
                    <div class="sep row"><span>Statut</span><span>${statusLabels[selected.status]}</span></div>
                    ${selected.paymentDate ? `<div class="row"><span>Payé le</span><span>${fmtDate(selected.paymentDate)}</span></div>` : ""}
                    </body></html>`);
                  win.document.close();
                  win.print();
                }}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
