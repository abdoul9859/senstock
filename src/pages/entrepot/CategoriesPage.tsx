import { useState, useEffect, useCallback } from "react";
import { Package, Plus, Trash2, Layers } from "lucide-react";
import { StockLoader } from "@/components/StockLoader";
import { StockCard } from "@/components/StockCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Attribute {
  name: string;
  type: "text" | "number" | "select";
  options: string[];
  required: boolean;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  hasVariants: boolean;
  attributes: Attribute[];
}

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const emptyForm = {
  name: "",
  description: "",
  hasVariants: false,
  attributes: [] as Attribute[],
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setDeleteConfirm(false);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description,
      hasVariants: cat.hasVariants,
      attributes: cat.attributes.map((a) => ({ ...a, options: [...a.options] })),
    });
    setError("");
    setDeleteConfirm(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom est requis");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de la sauvegarde");
        return;
      }
      setDialogOpen(false);
      fetchCategories();
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de la suppression");
      }
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setSaving(false);
    }
  }

  // --- Attribute helpers ---
  function addAttribute() {
    setForm((f) => ({
      ...f,
      attributes: [...f.attributes, { name: "", type: "text", options: [], required: false }],
    }));
  }

  function updateAttribute(index: number, updates: Partial<Attribute>) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) => (i === index ? { ...a, ...updates } : a)),
    }));
  }

  function removeAttribute(index: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== index),
    }));
  }

  function addOption(attrIndex: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex ? { ...a, options: [...a.options, ""] } : a
      ),
    }));
  }

  function updateOption(attrIndex: number, optIndex: number, value: string) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex
          ? { ...a, options: a.options.map((o, j) => (j === optIndex ? value : o)) }
          : a
      ),
    }));
  }

  function removeOption(attrIndex: number, optIndex: number) {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, i) =>
        i === attrIndex ? { ...a, options: a.options.filter((_, j) => j !== optIndex) } : a
      ),
    }));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Categories</h2>
        <Button variant="secondary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle categorie
        </Button>
      </div>

      {loading ? (
        <StockLoader />
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Layers className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune categorie</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Creer une categorie
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat._id} onClick={() => openEdit(cat)} className="cursor-pointer">
              <StockCard
                title={cat.name}
                subtitle={`${cat.attributes.length} attribut${cat.attributes.length !== 1 ? "s" : ""}${cat.hasVariants ? " \u00b7 Variantes" : ""}`}
                icon={Package}
                status="active"
              />
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier la categorie" : "Nouvelle categorie"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Modifiez les informations de la categorie."
                : "Remplissez les informations pour creer une categorie."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom</Label>
              <Input
                id="cat-name"
                placeholder="Ex: Smartphone"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                placeholder="Description optionnelle"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* hasVariants switch */}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Produits avec variantes</p>
                <p className="text-xs text-muted-foreground">
                  Activer pour les produits avec N/S ou IMEI
                </p>
              </div>
              <Switch
                checked={form.hasVariants}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, hasVariants: checked }))
                }
              />
            </div>

            {/* Attributes section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Attributs personnalises</Label>
                <Button variant="outline" size="sm" onClick={addAttribute}>
                  <Plus className="h-3 w-3" />
                  Ajouter
                </Button>
              </div>

              {form.attributes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun attribut. Ajoutez des attributs comme Stockage, RAM, Couleur...
                </p>
              )}

              {form.attributes.map((attr, ai) => (
                <div
                  key={ai}
                  className="space-y-3 rounded-md border border-border p-3"
                >
                  <div className="flex items-start gap-2">
                    {/* Attribute name */}
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input
                        placeholder="Ex: Stockage"
                        value={attr.name}
                        onChange={(e) =>
                          updateAttribute(ai, { name: e.target.value })
                        }
                      />
                    </div>

                    {/* Attribute type */}
                    <div className="w-40 space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={attr.type}
                        onValueChange={(v) =>
                          updateAttribute(ai, {
                            type: v as Attribute["type"],
                            options: v === "select" ? attr.options : [],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texte</SelectItem>
                          <SelectItem value="number">Nombre</SelectItem>
                          <SelectItem value="select">Liste de selection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove attribute */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-5 shrink-0"
                      onClick={() => removeAttribute(ai)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Required switch */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={attr.required}
                      onCheckedChange={(checked) =>
                        updateAttribute(ai, { required: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      Obligatoire
                    </span>
                  </div>

                  {/* Options for select type */}
                  {attr.type === "select" && (
                    <div className="space-y-2 pl-1">
                      <Label className="text-xs">Options</Label>
                      {attr.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <Input
                            className="h-8 text-xs"
                            placeholder={`Option ${oi + 1}`}
                            value={opt}
                            onChange={(e) =>
                              updateOption(ai, oi, e.target.value)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeOption(ai, oi)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => addOption(ai)}
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter une option
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {editingId && (
              <div>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Confirmer ?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={saving}
                      onClick={handleDelete}
                    >
                      Supprimer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
