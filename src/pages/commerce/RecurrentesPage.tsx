import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Plus, Pencil, Trash2, Play, Pause, X,
  CalendarClock, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

function formatFCFA(n?: number): string {
  if (n == null) return "0 F";
  return Number(n).toLocaleString("fr-FR") + " F";
}

function formatDate(d?: string): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("fr-FR");
}

const frequencyLabels: Record<string, string> = {
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
};

interface TemplateItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface RecurringInvoice {
  _id: string;
  client?: { _id: string; name: string };
  frequency: string;
  nextDate: string;
  lastGenerated?: string;
  totalGenerated: number;
  active: boolean;
  templateItems: TemplateItem[];
  showTax: boolean;
  taxRate: number;
  notes: string;
}

interface ClientOption {
  _id: string;
  name: string;
}

const emptyItem = (): TemplateItem => ({ description: "", quantity: 1, unitPrice: 0 });

type SortField = "client" | "frequency" | "nextDate" | "lastGenerated" | "totalGenerated" | "active";
type SortDir = "asc" | "desc";

export default function RecurrentesPage() {
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("nextDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    clientId: "",
    frequency: "mensuel",
    nextDate: "",
    templateItems: [emptyItem()] as TemplateItem[],
    showTax: false,
    taxRate: 18,
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch("/api/recurring-invoices", { headers: getHeaders() }),
        fetch("/api/clients", { headers: getHeaders() }),
      ]);
      if (rRes.ok) setItems(await rRes.json());
      if (cRes.ok) {
        const data = await cRes.json();
        setClients(data.map((c: any) => ({ _id: c._id, name: c.name })));
      }
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Sorting
  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  const sorted = [...items].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "client": return dir * (a.client?.name || "").localeCompare(b.client?.name || "");
      case "frequency": return dir * a.frequency.localeCompare(b.frequency);
      case "nextDate": return dir * (new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());
      case "lastGenerated": return dir * (new Date(a.lastGenerated || 0).getTime() - new Date(b.lastGenerated || 0).getTime());
      case "totalGenerated": return dir * (a.totalGenerated - b.totalGenerated);
      case "active": return dir * (Number(a.active) - Number(b.active));
      default: return 0;
    }
  });

  // Dialog helpers
  function openCreate() {
    setEditing(null);
    setForm({
      clientId: "",
      frequency: "mensuel",
      nextDate: "",
      templateItems: [emptyItem()],
      showTax: false,
      taxRate: 18,
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(r: RecurringInvoice) {
    setEditing(r);
    setForm({
      clientId: r.client?._id || "",
      frequency: r.frequency,
      nextDate: r.nextDate ? r.nextDate.slice(0, 10) : "",
      templateItems: r.templateItems.length ? r.templateItems.map(i => ({ ...i })) : [emptyItem()],
      showTax: r.showTax,
      taxRate: r.taxRate,
      notes: r.notes || "",
    });
    setDialogOpen(true);
  }

  function updateItem(idx: number, field: keyof TemplateItem, value: string | number) {
    setForm(f => {
      const items = [...f.templateItems];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, templateItems: items };
    });
  }

  function addItem() {
    setForm(f => ({ ...f, templateItems: [...f.templateItems, emptyItem()] }));
  }

  function removeItem(idx: number) {
    setForm(f => ({
      ...f,
      templateItems: f.templateItems.length > 1 ? f.templateItems.filter((_, i) => i !== idx) : f.templateItems,
    }));
  }

  async function handleSave() {
    if (!form.clientId) { toast.error("Veuillez choisir un client"); return; }
    if (!form.nextDate) { toast.error("Veuillez choisir la prochaine date"); return; }
    if (form.templateItems.some(i => !i.description.trim())) {
      toast.error("Chaque ligne doit avoir une description");
      return;
    }

    setSaving(true);
    try {
      const body = {
        client: form.clientId,
        frequency: form.frequency,
        nextDate: form.nextDate,
        templateItems: form.templateItems,
        showTax: form.showTax,
        taxRate: form.taxRate,
        notes: form.notes,
      };
      const url = editing ? `/api/recurring-invoices/${editing._id}` : "/api/recurring-invoices";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Recurrence mise a jour" : "Recurrence creee");
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  async function handleToggle(r: RecurringInvoice) {
    try {
      const res = await fetch(`/api/recurring-invoices/${r._id}/toggle`, { method: "PUT", headers: getHeaders() });
      if (!res.ok) throw new Error();
      toast.success(r.active ? "Recurrence desactivee" : "Recurrence activee");
      fetchData();
    } catch {
      toast.error("Erreur lors du changement de statut");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/recurring-invoices/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error();
      toast.success("Recurrence supprimee");
      fetchData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeleting(null);
  }

  const templateTotal = form.templateItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const templateTax = form.showTax ? templateTotal * (form.taxRate / 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Factures recurrentes</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvelle recurrence
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Aucune recurrence"
          description="Creez votre premiere facture recurrente."
        />
      ) : (
        <div className="rounded-lg border bg-card animate-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("client")}>
                  <span className="flex items-center">Client {getSortIcon("client")}</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("frequency")}>
                  <span className="flex items-center">Frequence {getSortIcon("frequency")}</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nextDate")}>
                  <span className="flex items-center">Prochain {getSortIcon("nextDate")}</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("lastGenerated")}>
                  <span className="flex items-center">Derniere generation {getSortIcon("lastGenerated")}</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("totalGenerated")}>
                  <span className="flex items-center justify-end">Total genere {getSortIcon("totalGenerated")}</span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("active")}>
                  <span className="flex items-center">Statut {getSortIcon("active")}</span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r, idx) => (
                <TableRow key={r._id} className="animate-row" style={{ animationDelay: `${idx * 30}ms` }}>
                  <TableCell className="font-medium">{r.client?.name || "\u2014"}</TableCell>
                  <TableCell>{frequencyLabels[r.frequency] || r.frequency}</TableCell>
                  <TableCell>{formatDate(r.nextDate)}</TableCell>
                  <TableCell>{formatDate(r.lastGenerated)}</TableCell>
                  <TableCell className="text-right">{r.totalGenerated}</TableCell>
                  <TableCell>
                    {r.active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Active</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(r)} title={r.active ? "Desactiver" : "Activer"}>
                        {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r._id)}
                        disabled={deleting === r._id}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la recurrence" : "Nouvelle recurrence"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations de la recurrence." : "Remplissez les informations pour creer une recurrence."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency + Next date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Frequence</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(frequencyLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prochaine date</Label>
                <Input
                  type="date"
                  value={form.nextDate}
                  onChange={e => setForm(f => ({ ...f, nextDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Template Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Articles du modele</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {form.templateItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateItem(idx, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qte"
                      value={item.quantity}
                      onChange={e => updateItem(idx, "quantity", Number(e.target.value))}
                      className="w-20"
                      min={1}
                    />
                    <Input
                      type="number"
                      placeholder="Prix unit."
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, "unitPrice", Number(e.target.value))}
                      className="w-28"
                      min={0}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      disabled={form.templateItems.length <= 1}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground text-right">
                Sous-total: {formatFCFA(templateTotal)}
                {form.showTax && <> | Taxe: {formatFCFA(templateTax)} | Total: {formatFCFA(templateTotal + templateTax)}</>}
              </div>
            </div>

            {/* Tax */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.showTax}
                  onCheckedChange={v => setForm(f => ({ ...f, showTax: v }))}
                />
                <Label>Appliquer la taxe</Label>
              </div>
              {form.showTax && (
                <div className="flex items-center gap-2">
                  <Label>Taux (%)</Label>
                  <Input
                    type="number"
                    value={form.taxRate}
                    onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
                    className="w-20"
                    min={0}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes optionnelles..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
