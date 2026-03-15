import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";

const TOKEN_KEY = "senstock_token";
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
  };
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

export interface ProductLabel {
  id: string;
  name: string;
  description: string;
  color: string;
  _count?: { products: number };
}

export default function EtiquettesPage() {
  const [labels, setLabels] = useState<ProductLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductLabel | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", description: "", color: "#6366f1" });

  async function fetchLabels() {
    try {
      const res = await fetch("/api/product-labels", { headers: getHeaders() });
      if (res.ok) setLabels(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLabels(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", color: "#6366f1" });
    setDialogOpen(true);
  }

  function openEdit(label: ProductLabel) {
    setEditing(label);
    setForm({ name: label.name, description: label.description, color: label.color });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/product-labels/${editing.id}` : "/api/product-labels";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erreur");
        return;
      }
      toast.success(editing ? "Étiquette modifiée" : "Étiquette créée");
      setDialogOpen(false);
      fetchLabels();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/product-labels/${deleteId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (res.ok) {
      toast.success("Étiquette supprimée");
      setLabels((prev) => prev.filter((l) => l.id !== deleteId));
    } else {
      toast.error("Erreur lors de la suppression");
    }
    setDeleteId(null);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Étiquettes produits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Créez et gérez les étiquettes pour classer vos produits
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nouvelle étiquette
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : labels.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Aucune étiquette"
          description="Créez votre première étiquette pour organiser vos produits"
          action={{ label: "Nouvelle étiquette", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{label.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label._count?.products ?? 0} produit{(label._count?.products ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                {label.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{label.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(label)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteId(label.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'étiquette" : "Nouvelle étiquette"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lbl-name">Nom *</Label>
              <Input
                id="lbl-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Reconditionné, Premium, Défectueux..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl-desc">Description</Label>
              <Textarea
                id="lbl-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description optionnelle"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="h-7 w-7 rounded-full ring-offset-background transition-all hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: form.color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-7 w-7 cursor-pointer rounded-full border border-border bg-transparent p-0.5"
                  title="Couleur personnalisée"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: form.color }} />
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: form.color }}
                >
                  {form.name || "Aperçu"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : editing ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'étiquette ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera l'étiquette de tous les produits associés. Elle ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
