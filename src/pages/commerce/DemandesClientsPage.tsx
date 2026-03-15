import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Clock, PlayCircle, CheckCircle, Plus, Pencil, Trash2,
  Eye, ArrowUpDown, ArrowUp, ArrowDown, Search, X, AlertTriangle, XCircle, ImageIcon,
} from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

interface RequestItem {
  _id?: string;
  description: string;
  quantity: number;
  notes: string;
  photos: string[];
}

interface ClientRequest {
  _id: string;
  number: string;
  status: string;
  priority: string;
  client?: { _id: string; name: string; phone: string };
  date: string;
  dueDate?: string;
  items: RequestItem[];
  notes: string;
  convertedTo?: { type: string; id: string; number: string };
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  phone: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  nouvelle: { label: "Nouvelle", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  en_cours: { label: "En cours", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  terminee: { label: "Terminee", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  annulee: { label: "Annulee", color: "bg-muted text-muted-foreground line-through" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  basse: { label: "Basse", color: "text-muted-foreground" },
  normale: { label: "Normale", color: "text-blue-500" },
  haute: { label: "Haute", color: "text-amber-500" },
  urgente: { label: "Urgente", color: "text-red-500" },
};

type SortField = "number" | "client" | "date" | "status" | "priority";
type SortDir = "asc" | "desc";

const DemandesClientsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    priority: "normale",
    dueDate: "",
    notes: "",
    items: [{ description: "", quantity: 1, notes: "", photos: [] }] as RequestItem[],
  });

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<ClientRequest | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch("/api/client-requests", { headers: getHeaders() }),
        fetch("/api/clients", { headers: getHeaders() }),
      ]);
      if (rRes.ok) setRequests(await rRes.json());
      if (cRes.ok) setClients(await cRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const hasActiveFilters = search || filterStatus !== "all" || filterPriority !== "all";

  const filtered = requests.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        r.number.toLowerCase().includes(q) ||
        (r.client?.name || "").toLowerCase().includes(q) ||
        r.items.some((i) => i.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterPriority !== "all" && r.priority !== filterPriority) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "number": return dir * a.number.localeCompare(b.number);
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "date": return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case "status": return dir * a.status.localeCompare(b.status);
      case "priority": {
        const order = { urgente: 4, haute: 3, normale: 2, basse: 1 };
        return dir * ((order[a.priority as keyof typeof order] || 0) - (order[b.priority as keyof typeof order] || 0));
      }
      default: return 0;
    }
  });

  function openNew() {
    setEditing(null);
    setForm({ clientId: "", priority: "normale", dueDate: "", notes: "", items: [{ description: "", quantity: 1, notes: "", photos: [] }] });
    setDialogOpen(true);
  }

  function openEdit(r: ClientRequest) {
    setEditing(r);
    setForm({
      clientId: r.client?._id || "",
      priority: r.priority,
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split("T")[0] : "",
      notes: r.notes,
      items: r.items.length > 0 ? r.items.map((i) => ({ description: i.description, quantity: i.quantity, notes: i.notes, photos: i.photos || [] })) : [{ description: "", quantity: 1, notes: "", photos: [] }],
    });
    setDialogOpen(true);
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, notes: "", photos: [] }] }));
  }

  async function handlePhotoUpload(idx: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("senstock_token");
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setForm((f) => ({
          ...f,
          items: f.items.map((item, i) =>
            i === idx ? { ...item, photos: [...(item.photos || []), url] } : item
          ),
        }));
      } else { toast.error("Erreur lors de l'upload"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  function removePhoto(itemIdx: number, photoIdx: number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === itemIdx ? { ...item, photos: item.photos.filter((_, pi) => pi !== photoIdx) } : item
      ),
    }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function updateItem(idx: number, field: string, value: string | number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  }

  async function handleSave() {
    const validItems = form.items.filter((i) => i.description.trim());
    if (validItems.length === 0) { toast.error("Ajoutez au moins un article"); return; }
    setSaving(true);
    try {
      const body = {
        client: form.clientId || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        notes: form.notes,
        items: validItems,
      };
      if (editing) {
        const res = await fetch(`/api/client-requests/${editing._id}`, {
          method: "PUT", headers: getHeaders(), body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setRequests((prev) => prev.map((r) => r._id === updated._id ? updated : r));
          toast.success("Demande modifiee");
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      } else {
        const res = await fetch("/api/client-requests", {
          method: "POST", headers: getHeaders(), body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setRequests((prev) => [created, ...prev]);
          toast.success(`Demande ${created.number} creee`);
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  }

  async function handleUpdateStatus(r: ClientRequest, status: string) {
    try {
      const res = await fetch(`/api/client-requests/${r._id}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequests((prev) => prev.map((i) => i._id === r._id ? updated : i));
        toast.success(`${r.number} → ${statusConfig[status]?.label || status}`);
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
  }

  async function handleDelete(r: ClientRequest) {
    if (!confirm(`Supprimer la demande ${r.number} ?`)) return;
    setDeleting(r._id);
    try {
      const res = await fetch(`/api/client-requests/${r._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        setRequests((prev) => prev.filter((i) => i._id !== r._id));
        toast.success("Demande supprimee");
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
    setDeleting(null);
  }

  // Stats
  const totalRequests = requests.length;
  const newCount = requests.filter((r) => r.status === "nouvelle").length;
  const inProgressCount = requests.filter((r) => r.status === "en_cours").length;
  const doneCount = requests.filter((r) => r.status === "terminee").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Demandes clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Suivi des demandes et commandes clients</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle demande
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total demandes" value={String(totalRequests)} icon={MessageSquare} />
        <StatCard label="Nouvelles" value={String(newCount)} icon={Clock} />
        <StatCard label="En cours" value={String(inProgressCount)} icon={PlayCircle} />
        <StatCard label="Terminees" value={String(doneCount)} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher n°, client, article..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="nouvelle">Nouvelle</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="terminee">Terminee</SelectItem>
            <SelectItem value="annulee">Annulee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Priorite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorites</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
            <SelectItem value="normale">Normale</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        )}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">{filtered.length} / {requests.length}</span>
        )}
      </div>

      {loading ? (
        <StockLoader />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm mb-3">Aucune demande client</p>
          <Button variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Creer la premiere demande
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm mb-2">Aucun resultat</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer les filtres
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <button onClick={() => toggleSort("number")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    N° {getSortIcon("number")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("client")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Client {getSortIcon("client")}
                  </button>
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wider">Articles</TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("date")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Date {getSortIcon("date")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("priority")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Priorite {getSortIcon("priority")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("status")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Statut {getSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const sc = statusConfig[r.status] || statusConfig.nouvelle;
                const pc = priorityConfig[r.priority] || priorityConfig.normale;
                return (
                  <TableRow key={r._id} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="font-mono text-xs font-medium text-foreground">{r.number}</TableCell>
                    <TableCell className="font-medium text-sm">{r.client?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.items.length > 0 ? (
                        <span className="truncate block max-w-[200px]">
                          {r.items[0].description}{r.items.length > 1 ? ` (+${r.items.length - 1})` : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${pc.color}`}>
                        {r.priority === "urgente" && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                        {pc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${sc.color}`}>
                        {sc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button title="Voir" onClick={() => { setDetailRequest(r); setDetailOpen(true); }}
                          className="p-1.5 rounded-md border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button title="Modifier" onClick={() => openEdit(r)}
                          className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {r.status === "nouvelle" && (
                          <button title="En cours" onClick={() => handleUpdateStatus(r, "en_cours")}
                            className="p-1.5 rounded-md border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors">
                            <PlayCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {r.status === "en_cours" && (
                          <button title="Terminer" onClick={() => handleUpdateStatus(r, "terminee")}
                            className="p-1.5 rounded-md border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {r.status !== "annulee" && r.status !== "terminee" && (
                          <button title="Annuler" onClick={() => handleUpdateStatus(r, "annulee")}
                            className="p-1.5 rounded-md border border-muted-foreground/40 text-muted-foreground hover:bg-muted transition-colors">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button title="Supprimer" onClick={() => handleDelete(r)} disabled={deleting === r._id}
                          className="p-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la demande" : "Nouvelle demande"}</DialogTitle>
            <DialogDescription>{editing ? `Modification de ${editing.number}` : "Enregistrer une nouvelle demande client"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selectionner un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorite</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date souhaitee</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Articles demandes</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 rounded-md border border-border bg-muted/20">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Description de l'article"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Qte"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <Input
                          placeholder="Notes"
                          value={item.notes}
                          onChange={(e) => updateItem(idx, "notes", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      {/* Photos */}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(item.photos || []).map((photo, pi) => (
                          <div key={pi} className="relative">
                            <img src={photo} alt="" className="h-14 w-14 rounded object-cover border border-border" />
                            <button
                              onClick={() => removePhoto(idx, pi)}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="h-14 w-14 rounded border border-dashed border-border flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted/30 transition-colors">
                          <Plus className="h-4 w-4" />
                          <span className="text-[10px]">Photo</span>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(idx, f); e.target.value = ""; }}
                          />
                        </label>
                      </div>
                    </div>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes ou remarques..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : editing ? "Sauvegarder" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Demande {detailRequest?.number}</DialogTitle>
            <DialogDescription>
              {detailRequest?.client?.name || "Sans client"} — {formatDate(detailRequest?.date)}
            </DialogDescription>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusConfig[detailRequest.status]?.color || ""}`}>
                  {statusConfig[detailRequest.status]?.label || detailRequest.status}
                </span>
                <span className={`text-xs font-medium ${priorityConfig[detailRequest.priority]?.color || ""}`}>
                  {priorityConfig[detailRequest.priority]?.label || detailRequest.priority}
                </span>
              </div>
              {detailRequest.dueDate && (
                <p className="text-sm text-muted-foreground">Souhaitee pour le : {formatDate(detailRequest.dueDate)}</p>
              )}
              <div className="rounded-md border border-border divide-y divide-border">
                {detailRequest.items.map((item, idx) => (
                  <div key={idx} className="p-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{item.description}</span>
                      <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                    </div>
                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                    {item.photos && item.photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.photos.map((photo, pi) => (
                          <a key={pi} href={photo} target="_blank" rel="noopener noreferrer">
                            <img src={photo} alt="" className="h-12 w-12 rounded object-cover border border-border hover:opacity-80" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {detailRequest.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes :</p>
                  <p className="text-sm">{detailRequest.notes}</p>
                </div>
              )}
              {detailRequest.convertedTo && (
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Convertie en {detailRequest.convertedTo.type} : {detailRequest.convertedTo.number}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemandesClientsPage;
