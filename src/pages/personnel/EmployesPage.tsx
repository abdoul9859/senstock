import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  UserCheck,
  Loader2,
  Eye,
  Trash2,
  Plus,
  Pencil,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";

// Use relative URLs — Vite proxy routes /api to the server

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  nationalId: string;
  position: string;
  department: string;
  hireDate: string;
  contractType: string;
  baseSalary: number;
  status: string;
  emergencyContact: { name: string; phone: string; relation: string };
  notes: string;
  createdAt: string;
}

const contractLabels: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  stage: "Stage",
  freelance: "Freelance",
};

const statusLabels: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
  suspendu: "Suspendu",
};

const statusColors: Record<string, string> = {
  actif: "bg-green-500/15 text-green-600 dark:text-green-400",
  inactif: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  suspendu: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  nationalId: "",
  position: "",
  department: "",
  hireDate: new Date().toISOString().split("T")[0],
  contractType: "cdi",
  baseSalary: 0,
  status: "actif",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelation: "",
  notes: "",
};

export default function EmployesPage() {
  const { hasPermission } = useAuth();
  const canSeeSalaries = hasPermission("confidentialite.salaires");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees`, { headers });
      if (res.ok) setEmployees(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchEmployees().then(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.phone.includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditId(emp._id);
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone,
      email: emp.email,
      address: emp.address,
      nationalId: emp.nationalId,
      position: emp.position,
      department: emp.department,
      hireDate: new Date(emp.hireDate).toISOString().split("T")[0],
      contractType: emp.contractType,
      baseSalary: emp.baseSalary,
      status: emp.status,
      emergencyName: emp.emergencyContact?.name || "",
      emergencyPhone: emp.emergencyContact?.phone || "",
      emergencyRelation: emp.emergencyContact?.relation || "",
      notes: emp.notes,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.position.trim()) {
      toast.error("Nom, prénom, téléphone et poste requis");
      return;
    }
    try {
      const url = editId
        ? `/api/employees/${editId}`
        : `/api/employees`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          nationalId: form.nationalId.trim(),
          position: form.position.trim(),
          department: form.department.trim(),
          hireDate: form.hireDate,
          contractType: form.contractType,
          baseSalary: form.baseSalary,
          status: form.status,
          emergencyContact: {
            name: form.emergencyName.trim(),
            phone: form.emergencyPhone.trim(),
            relation: form.emergencyRelation.trim(),
          },
          notes: form.notes.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(editId ? "Employé modifié" : "Employé ajouté");
      setFormOpen(false);
      resetForm();
      fetchEmployees();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Supprimer cet employé ?")) return;
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE", headers });
      toast.success("Supprimé");
      setEmployees((prev) => prev.filter((e) => e._id !== id));
      if (selected?._id === id) {
        setSelected(null);
        setDetailOpen(false);
      }
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employés</h1>
          <p className="text-muted-foreground">
            {employees.filter((e) => e.status === "actif").length} actifs sur{" "}
            {employees.length} employés
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel employé
        </Button>
      </div>

      <div className="flex items-center gap-3" role="search">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Rechercher des employes"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
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

      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Aucun employe"
          description="Ajoutez votre premier employe"
          action={{ label: "Nouvel employe", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun résultat</h3>
          <p className="text-muted-foreground">
            Aucun résultat pour ces filtres
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden" aria-live="polite">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Poste</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Département</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Contrat</th>
                <th className="text-left p-3 font-medium">Statut</th>
                {canSeeSalaries && <th className="text-right p-3 font-medium hidden md:table-cell">Salaire</th>}
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp._id} className="border-b last:border-0 hover:bg-muted/30 animate-row">
                  <td className="p-3">
                    <div className="font-medium">
                      {emp.lastName} {emp.firstName}
                    </div>
                    <div className="text-xs text-muted-foreground">{emp.phone}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{emp.position}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{emp.department || "—"}</td>
                  <td className="p-3 hidden md:table-cell">
                    <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-0 text-xs">
                      {contractLabels[emp.contractType] || emp.contractType}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={`${statusColors[emp.status]} border-0 text-xs`}>
                      {statusLabels[emp.status]}
                    </Badge>
                  </td>
                  {canSeeSalaries && <td className="p-3 text-right font-medium hidden md:table-cell">{fmtMoney(emp.baseSalary)}</td>}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        aria-label="Voir l'employe"
                        onClick={() => { setSelected(emp); setDetailOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        aria-label="Modifier l'employe"
                        onClick={() => openEdit(emp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                        aria-label="Supprimer l'employe"
                        onClick={() => deleteEmployee(emp._id)}
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
        </div>
      )}

      {/* =========== CREATE / EDIT DIALOG =========== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom *</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Nom de famille" />
              </div>
              <div>
                <Label>Prénom *</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Prénom" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Téléphone *</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+221 77 000 00 00" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
              </div>
            </div>

            <div>
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Adresse complète" />
            </div>

            <div>
              <Label>N° Pièce d'identité</Label>
              <Input value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} placeholder="CNI / Passeport" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poste *</Label>
                <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Technicien, Vendeur..." />
              </div>
              <div>
                <Label>Département</Label>
                <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Ventes, Technique..." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date d'embauche</Label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))} />
              </div>
              <div>
                <Label>Type de contrat</Label>
                <Select value={form.contractType} onValueChange={(v) => setForm((f) => ({ ...f, contractType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(contractLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canSeeSalaries && (
            <div>
              <Label>Salaire de base (F CFA)</Label>
              <Input
                type="number"
                value={form.baseSalary || ""}
                onChange={(e) => setForm((f) => ({ ...f, baseSalary: Number(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            )}

            <div className="border-t pt-3">
              <h3 className="text-sm font-semibold mb-2">Contact d'urgence</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input value={form.emergencyName} onChange={(e) => setForm((f) => ({ ...f, emergencyName: e.target.value }))} placeholder="Nom" />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={form.emergencyPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyPhone: e.target.value }))} placeholder="Téléphone" />
                </div>
                <div>
                  <Label className="text-xs">Relation</Label>
                  <Input value={form.emergencyRelation} onChange={(e) => setForm((f) => ({ ...f, emergencyRelation: e.target.value }))} placeholder="Père, Mère..." />
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes internes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>
              {editId ? <><Pencil className="h-4 w-4 mr-2" />Modifier</> : <><Plus className="h-4 w-4 mr-2" />Ajouter</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========== DETAIL DIALOG =========== */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selected.lastName} {selected.firstName}
                <Badge className={`${statusColors[selected.status]} border-0`}>
                  {statusLabels[selected.status]}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Poste</span>
                  <div className="font-medium">{selected.position}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Département</span>
                  <div className="font-medium">{selected.department || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Contrat</span>
                  <div className="font-medium">{contractLabels[selected.contractType]}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Embauché le</span>
                  <div className="font-medium">{fmtDate(selected.hireDate)}</div>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selected.phone}</span>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.email}</span>
                  </div>
                )}
                {selected.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selected.address}</span>
                  </div>
                )}
                {selected.nationalId && (
                  <div className="text-muted-foreground">
                    Pièce d'identité: {selected.nationalId}
                  </div>
                )}
              </div>

              {canSeeSalaries && (
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salaire de base</span>
                  <span className="text-lg font-bold">{fmtMoney(selected.baseSalary)}</span>
                </div>
              </div>
              )}

              {(selected.emergencyContact?.name || selected.emergencyContact?.phone) && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-xs text-muted-foreground mb-1">Contact d'urgence</h4>
                  <div>
                    {selected.emergencyContact.name}
                    {selected.emergencyContact.relation && ` (${selected.emergencyContact.relation})`}
                  </div>
                  {selected.emergencyContact.phone && (
                    <div className="text-muted-foreground">{selected.emergencyContact.phone}</div>
                  )}
                </div>
              )}

              {selected.notes && (
                <div className="bg-muted/30 rounded-lg p-3 text-muted-foreground">
                  {selected.notes}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); openEdit(selected); }}>
                <Pencil className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
