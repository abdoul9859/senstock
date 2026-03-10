import { useState, useEffect, useCallback } from "react";
import { CalendarOff, Plus, CheckCircle, XCircle, Trash2, Filter } from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface LeaveEntry {
  _id: string;
  employee: Employee | null;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  refused: number;
}

const typeLabels: Record<string, string> = {
  conge_paye: "Conge paye",
  maladie: "Maladie",
  sans_solde: "Sans solde",
  maternite: "Maternite",
  autre: "Autre",
};

const statusLabels: Record<string, string> = {
  en_attente: "En attente",
  approuve: "Approuve",
  refuse: "Refuse",
};

const statusColors: Record<string, string> = {
  en_attente: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approuve: "bg-green-500/15 text-green-600 dark:text-green-400",
  refuse: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("senstock_token")}`,
  };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export default function CongesPage() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<LeaveStats>({ total: 0, pending: 0, approved: 0, refused: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState("");
  const [formType, setFormType] = useState("conge_paye");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const headers = getHeaders();

  const fetchData = useCallback(async () => {
    try {
      const [lRes, sRes, eRes] = await Promise.all([
        fetch("/api/leaves", { headers }),
        fetch("/api/leaves/stats", { headers }),
        fetch("/api/employees", { headers }),
      ]);
      if (lRes.ok) setLeaves(await lRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch {
      toast.error("Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, []);

  const filtered = leaves.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (employeeFilter !== "all" && l.employee?._id !== employeeFilter) return false;
    return true;
  });

  const resetForm = () => {
    setFormEmployee("");
    setFormType("conge_paye");
    setFormStart("");
    setFormEnd("");
    setFormReason("");
  };

  const handleCreate = async () => {
    if (!formEmployee || !formStart || !formEnd) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers,
        body: JSON.stringify({
          employee: formEmployee,
          type: formType,
          startDate: formStart,
          endDate: formEnd,
          days: calcDays(formStart, formEnd),
          reason: formReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Conge cree avec succes");
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}/approve`, { method: "PUT", headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Conge approuve");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRefuse = async (id: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}/refuse`, { method: "PUT", headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Conge refuse");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce conge ?")) return;
    try {
      await fetch(`/api/leaves/${id}`, { method: "DELETE", headers });
      toast.success("Conge supprime");
      setLeaves((prev) => prev.filter((l) => l._id !== id));
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) return <StockLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Conges</h1>
          <p className="text-muted-foreground">Gestion des conges du personnel</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau conge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total cette annee" value={stats.total} icon={CalendarOff} />
        <StatCard label="En attente" value={stats.pending} icon={Filter} trend="A traiter" />
        <StatCard label="Approuves" value={stats.approved} icon={CheckCircle} />
        <StatCard label="Refuses" value={stats.refused} icon={XCircle} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="approuve">Approuve</SelectItem>
            <SelectItem value="refuse">Refuse</SelectItem>
          </SelectContent>
        </Select>
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Employe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les employes</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp._id} value={emp._id}>
                {emp.lastName} {emp.firstName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <CalendarOff className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun conge trouve</h3>
          <p className="text-muted-foreground">Ajoutez un nouveau conge pour commencer</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employe</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Debut</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead className="text-center">Jours</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((leave, idx) => (
                <TableRow key={leave._id} className="animate-row" style={{ animationDelay: `${idx * 30}ms` }}>
                  <TableCell>
                    <div className="font-medium">
                      {leave.employee
                        ? `${leave.employee.lastName} ${leave.employee.firstName}`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {leave.employee?.position || ""}
                    </div>
                  </TableCell>
                  <TableCell>{typeLabels[leave.type] || leave.type}</TableCell>
                  <TableCell>{fmtDate(leave.startDate)}</TableCell>
                  <TableCell>{fmtDate(leave.endDate)}</TableCell>
                  <TableCell className="text-center font-medium">{leave.days}</TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate block text-muted-foreground">
                      {leave.reason || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[leave.status]} border-0 text-xs`}>
                      {statusLabels[leave.status] || leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {leave.status === "en_attente" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleApprove(leave._id)}
                            title="Approuver"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            onClick={() => handleRefuse(leave._id)}
                            title="Refuser"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(leave._id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau conge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employe *</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selectionner un employe" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.lastName} {emp.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type de conge *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date de debut *</Label>
                <Input
                  type="date"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Date de fin *</Label>
                <Input
                  type="date"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {formStart && formEnd && (
              <div className="text-sm text-muted-foreground">
                Nombre de jours : <span className="font-medium text-foreground">{calcDays(formStart, formEnd)}</span>
              </div>
            )}

            <div>
              <Label>Raison</Label>
              <Textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Motif du conge..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Enregistrement..." : "Creer le conge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
