import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Tag, Loader2, Trash2, Pencil, Percent, DollarSign } from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Promotion {
  _id: string;
  code: string;
  type: "pourcentage" | "fixe";
  value: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  createdAt: string;
}

const emptyForm = {
  code: "",
  type: "pourcentage" as "pourcentage" | "fixe",
  value: "",
  minOrder: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  active: true,
};

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const token = localStorage.getItem("mbayestock_token");

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boutique/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPromos(await res.json());
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditId(p._id);
    setForm({
      code: p.code,
      type: p.type,
      value: String(p.value),
      minOrder: p.minOrder ? String(p.minOrder) : "",
      maxUses: p.maxUses ? String(p.maxUses) : "",
      validFrom: p.validFrom ? p.validFrom.slice(0, 10) : "",
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : "",
      active: p.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.value) {
      toast.error("Code et valeur requis");
      return;
    }
    const body = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder ? Number(form.minOrder) : 0,
      maxUses: form.maxUses ? Number(form.maxUses) : 0,
      validFrom: form.validFrom || undefined,
      validUntil: form.validUntil || undefined,
      active: form.active,
    };

    try {
      const url = editId
        ? `/api/boutique/promotions/${editId}`
        : `/api/boutique/promotions`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      toast.success(editId ? "Promotion modifiée" : "Promotion créée");
      setDialogOpen(false);
      fetchPromos();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    try {
      await fetch(`/api/boutique/promotions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Promotion supprimée");
      fetchPromos();
    } catch {
      toast.error("Erreur");
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      await fetch(`/api/boutique/promotions/${p._id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !p.active }),
      });
      fetchPromos();
    } catch {
      toast.error("Erreur");
    }
  };

  const getStatus = (p: Promotion) => {
    if (!p.active) return { label: "Désactivée", color: "bg-gray-100 text-gray-600" };
    const now = new Date();
    if (p.validUntil && new Date(p.validUntil) < now)
      return { label: "Expirée", color: "bg-red-100 text-red-600" };
    if (p.validFrom && new Date(p.validFrom) > now)
      return { label: "Planifiée", color: "bg-blue-100 text-blue-600" };
    if (p.maxUses > 0 && p.usedCount >= p.maxUses)
      return { label: "Épuisée", color: "bg-amber-100 text-amber-600" };
    return { label: "Active", color: "bg-green-100 text-green-600" };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les codes promo de la boutique
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle promotion
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : promos.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold">Aucune promotion</h3>
          <p className="text-muted-foreground mt-1">
            Créez votre premier code promo
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {promos.map((p) => {
            const status = getStatus(p);
            return (
              <div
                key={p._id}
                className="rounded-lg border bg-card px-4 py-3 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {p.type === "pourcentage" ? (
                    <Percent className="h-5 w-5 text-primary" />
                  ) : (
                    <DollarSign className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{p.code}</span>
                    <Badge variant="secondary" className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {p.type === "pourcentage"
                      ? `-${p.value}%`
                      : `-${p.value.toLocaleString("fr-FR")} F`}
                    {p.minOrder > 0 &&
                      ` · Min: ${p.minOrder.toLocaleString("fr-FR")} F`}
                    {p.maxUses > 0 && ` · ${p.usedCount}/${p.maxUses} utilisations`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => deletePromo(p._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Modifier la promotion" : "Nouvelle promotion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code promo</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="ex: PROMO20"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: any) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pourcentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixe">Montant fixe (F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valeur</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "pourcentage" ? "ex: 20" : "ex: 5000"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Commande min. (F)</Label>
                <Input
                  type="number"
                  value={form.minOrder}
                  onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                  placeholder="0 = pas de minimum"
                />
              </div>
              <div>
                <Label>Max utilisations</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  placeholder="0 = illimité"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valide à partir de</Label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Valide jusqu'au</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, validUntil: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
