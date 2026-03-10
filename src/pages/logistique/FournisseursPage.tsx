import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
import { toast } from "sonner";
import {
  Search,
  Users,
  Truck,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";

// Use relative URLs — Vite proxy routes /api to the server

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

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

export default function FournisseursPage() {
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") || "");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers`, { headers });
      if (res.ok) setSuppliers(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filtered = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditId(s._id);
    setForm({
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    try {
      const url = editId
        ? `/api/suppliers/${editId}`
        : `/api/suppliers`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(editId ? "Fournisseur modifie" : "Fournisseur cree");
      setFormOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    try {
      await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
        headers,
      });
      toast.success("Fournisseur supprime");
      setSuppliers((prev) => prev.filter((s) => s._id !== id));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gestion de vos fournisseurs et contacts
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3" role="search">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Rechercher des fournisseurs"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aucun fournisseur"
          description="Ajoutez votre premier fournisseur"
          action={{ label: "Nouveau fournisseur", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun resultat</h3>
          <p className="text-muted-foreground">
            Aucun resultat pour cette recherche
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden" aria-live="polite">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Nom
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Telephone
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                  Email
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">
                  Adresse
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s._id}
                  className="border-t hover:bg-muted/30 animate-row"
                >
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {s.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">
                    {s.email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {s.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate hidden md:table-cell">
                    {s.address ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {s.address}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Voir le fournisseur"
                        onClick={() => {
                          setSelected(s);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Modifier le fournisseur"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        aria-label="Supprimer le fournisseur"
                        onClick={() => deleteSupplier(s._id)}
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

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Nom du fournisseur"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telephone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Adresse du fournisseur"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Notes ou remarques..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editId ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Creer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Telephone</span>
                  <div className="font-medium">
                    {selected.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selected.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <div className="font-medium">
                    {selected.email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selected.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Adresse</span>
                <div className="font-medium">
                  {selected.address ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selected.address}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              {selected.notes && (
                <div>
                  <span className="text-muted-foreground">Notes</span>
                  <div className="bg-muted/30 rounded-lg p-3 mt-1">
                    {selected.notes}
                  </div>
                </div>
              )}

              {selected.createdAt && (
                <div>
                  <span className="text-muted-foreground">Date de creation</span>
                  <div className="font-medium">
                    {fmtDate(selected.createdAt)}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(selected);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500"
                onClick={() => {
                  setDetailOpen(false);
                  deleteSupplier(selected._id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
