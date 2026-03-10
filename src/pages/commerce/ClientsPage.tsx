import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users, Plus, Pencil, Trash2, Search, X, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Phone, Mail, MapPin,
} from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface Client {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

type SortField = "name" | "phone" | "email" | "createdAt";
type SortDir = "asc" | "desc";

const ClientsPage = () => {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", { headers: getHeaders() });
      if (res.ok) setClients(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name": return dir * a.name.localeCompare(b.name);
      case "phone": return dir * a.phone.localeCompare(b.phone);
      case "email": return dir * a.email.localeCompare(b.email);
      case "createdAt": return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default: return 0;
    }
  });

  function openNew() {
    setEditingClient(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(c: Client) {
    setEditingClient(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient._id}`, {
          method: "PUT", headers: getHeaders(), body: JSON.stringify(form),
        });
        if (res.ok) {
          const updated = await res.json();
          setClients((prev) => prev.map((c) => c._id === updated._id ? updated : c));
          toast.success("Client modifie");
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      } else {
        const res = await fetch("/api/clients", {
          method: "POST", headers: getHeaders(), body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setClients((prev) => [...prev, created]);
          toast.success("Client cree");
          setDialogOpen(false);
        } else { toast.error((await res.json()).error || "Erreur"); }
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  }

  async function handleDelete(c: Client) {
    if (!confirm(`Supprimer le client "${c.name}" ?`)) return;
    setDeleting(c._id);
    try {
      const res = await fetch(`/api/clients/${c._id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) {
        setClients((prev) => prev.filter((i) => i._id !== c._id));
        toast.success("Client supprime");
      } else { toast.error((await res.json()).error || "Erreur"); }
    } catch { toast.error("Erreur de connexion"); }
    setDeleting(null);
  }

  const totalClients = clients.length;
  const withPhone = clients.filter((c) => c.phone).length;
  const withEmail = clients.filter((c) => c.email).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Clients</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gestion de votre base clients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToCsv("clients", sorted, [
            { header: "Nom", accessor: (c) => c.name },
            { header: "Telephone", accessor: (c) => c.phone },
            { header: "Email", accessor: (c) => c.email },
            { header: "Adresse", accessor: (c) => c.address },
            { header: "Notes", accessor: (c) => c.notes },
          ])}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau client
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total clients" value={String(totalClients)} icon={Users} />
        <StatCard label="Avec telephone" value={String(withPhone)} icon={Phone} />
        <StatCard label="Avec email" value={String(withEmail)} icon={Mail} />
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3" role="search">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher nom, tel, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" aria-label="Rechercher des clients" />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Effacer la recherche">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {search && (
          <span className="text-xs text-muted-foreground">{filtered.length} / {clients.length} client{clients.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun client"
          description="Commencez par ajouter votre premier client"
          action={{ label: "Ajouter votre premier client", onClick: openNew }}
        />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm mb-2">Aucun client ne correspond a la recherche</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setPage(1); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        </div>
      ) : (
        <>
        <div className="rounded-lg border border-border overflow-hidden" aria-live="polite">
          <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <button onClick={() => toggleSort("name")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Nom {getSortIcon("name")}
                  </button>
                </TableHead>
                <TableHead>
                  <button onClick={() => toggleSort("phone")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Telephone {getSortIcon("phone")}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("email")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Email {getSortIcon("email")}
                  </button>
                </TableHead>
                <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider">Adresse</TableHead>
                <TableHead className="hidden md:table-cell">
                  <button onClick={() => toggleSort("createdAt")} className="flex items-center text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors">
                    Date {getSortIcon("createdAt")}
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => (
                <TableRow key={c._id + '-' + page} className="hover:bg-accent/50 transition-colors animate-row">
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.phone ? (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.email ? (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                    {c.address ? (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{c.address}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button aria-label="Modifier le client" title="Modifier" onClick={() => openEdit(c)}
                        className="p-1.5 rounded-md border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button aria-label="Supprimer le client" title="Supprimer" onClick={() => handleDelete(c)} disabled={deleting === c._id}
                        className="p-1.5 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
        <Pagination page={page} totalPages={Math.ceil(sorted.length / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}

      {/* Dialog: Create/Edit client */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>{editingClient ? `Modification de ${editingClient.name}` : "Ajouter un nouveau client"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom du client" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+221 77 123 45 67" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Adresse du client" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes ou remarques..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Enregistrement..." : editingClient ? "Sauvegarder" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
