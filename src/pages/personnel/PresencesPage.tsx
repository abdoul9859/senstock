import { useState, useEffect, useCallback } from "react";
import { Users, Clock, UserX, CalendarOff, CheckCircle, Plus } from "lucide-react";
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

interface AttendanceEntry {
  _id: string;
  employee: Employee | null;
  date: string;
  arrivalTime: string;
  departureTime: string;
  status: string;
  notes: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

const statusLabels: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  retard: "Retard",
  conge: "En conge",
};

const statusColors: Record<string, string> = {
  present: "bg-green-500/15 text-green-600 dark:text-green-400",
  absent: "bg-red-500/15 text-red-600 dark:text-red-400",
  retard: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  conge: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const statusButtonColors: Record<string, string> = {
  present: "bg-green-500 hover:bg-green-600 text-white",
  absent: "bg-red-500 hover:bg-red-600 text-white",
  retard: "bg-amber-500 hover:bg-amber-600 text-white",
  conge: "bg-blue-500 hover:bg-blue-600 text-white",
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("senstock_token")}`,
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function PresencesPage() {
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<AttendanceEntry | null>(null);
  const [editArrival, setEditArrival] = useState("");
  const [editDeparture, setEditDeparture] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const headers = getHeaders();

  const fetchData = useCallback(async (date: string) => {
    try {
      const [aRes, sRes, eRes] = await Promise.all([
        fetch(`/api/attendance?date=${date}`, { headers }),
        fetch(`/api/attendance/stats?date=${date}`, { headers }),
        fetch("/api/employees", { headers }),
      ]);
      if (aRes.ok) setAttendance(await aRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
    } catch {
      toast.error("Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(selectedDate).then(() => setLoading(false));
  }, [selectedDate]);

  const setStatus = async (employeeId: string, status: string) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          employee: employeeId,
          date: selectedDate,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(`Statut mis a jour : ${statusLabels[status]}`);
      fetchData(selectedDate);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const markAllPresent = async () => {
    if (!confirm("Marquer tous les employes comme presents ?")) return;
    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers,
        body: JSON.stringify({
          date: selectedDate,
          status: "present",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Tous marques comme presents");
      fetchData(selectedDate);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (entry: AttendanceEntry) => {
    setEditEntry(entry);
    setEditArrival(entry.arrivalTime || "");
    setEditDeparture(entry.departureTime || "");
    setEditNotes(entry.notes || "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editEntry) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          employee: editEntry.employee?._id,
          date: selectedDate,
          status: editEntry.status,
          arrivalTime: editArrival,
          departureTime: editDeparture,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Presence mise a jour");
      setEditOpen(false);
      fetchData(selectedDate);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  // Build a combined list: attendance records + employees without records
  const attendanceMap = new Map<string, AttendanceEntry>();
  attendance.forEach((a) => {
    if (a.employee?._id) attendanceMap.set(a.employee._id, a);
  });

  const combinedRows = employees.map((emp) => {
    const entry = attendanceMap.get(emp._id);
    return {
      employee: emp,
      entry,
      status: entry?.status || "",
      arrivalTime: entry?.arrivalTime || "",
      departureTime: entry?.departureTime || "",
      notes: entry?.notes || "",
    };
  });

  if (loading) return <StockLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Presences</h1>
          <p className="text-muted-foreground">Suivi de presence du personnel</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={markAllPresent}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Marquer tous present
          </Button>
        </div>
      </div>

      {/* Date Picker */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Label className="text-sm font-medium">Date :</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Presents" value={stats.present} icon={Users} />
        <StatCard label="Absents" value={stats.absent} icon={UserX} />
        <StatCard label="Retards" value={stats.late} icon={Clock} />
        <StatCard label="En conge" value={stats.onLeave} icon={CalendarOff} />
      </div>

      {/* Table */}
      {combinedRows.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun employe</h3>
          <p className="text-muted-foreground">Ajoutez des employes pour commencer le suivi</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employe</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Heure arrivee</TableHead>
                <TableHead>Heure depart</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedRows.map((row, idx) => (
                <TableRow key={row.employee._id} className="animate-row" style={{ animationDelay: `${idx * 30}ms` }}>
                  <TableCell>
                    <div className="font-medium">
                      {row.employee.lastName} {row.employee.firstName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.employee.position || "—"}
                  </TableCell>
                  <TableCell>{row.arrivalTime || "—"}</TableCell>
                  <TableCell>{row.departureTime || "—"}</TableCell>
                  <TableCell>
                    {row.status ? (
                      <Badge className={`${statusColors[row.status]} border-0 text-xs`}>
                        {statusLabels[row.status] || row.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non defini</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="max-w-[150px] truncate block text-muted-foreground text-sm">
                      {row.notes || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(["present", "absent", "retard", "conge"] as const).map((s) => (
                        <button
                          key={s}
                          className={`h-7 w-7 rounded-md text-xs font-medium transition-all ${
                            row.status === s
                              ? statusButtonColors[s]
                              : "bg-muted hover:bg-muted-foreground/20 text-muted-foreground"
                          }`}
                          onClick={() => setStatus(row.employee._id, s)}
                          title={statusLabels[s]}
                        >
                          {s === "present" ? "P" : s === "absent" ? "A" : s === "retard" ? "R" : "C"}
                        </button>
                      ))}
                      {row.entry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-1"
                          onClick={() => openEdit(row.entry!)}
                          title="Modifier les details"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Modifier la presence
              {editEntry?.employee && ` — ${editEntry.employee.lastName} ${editEntry.employee.firstName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Heure d'arrivee</Label>
              <Input
                type="time"
                value={editArrival}
                onChange={(e) => setEditArrival(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Heure de depart</Label>
              <Input
                type="time"
                value={editDeparture}
                onChange={(e) => setEditDeparture(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notes supplementaires..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditSave} disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
