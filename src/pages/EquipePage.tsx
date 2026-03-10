import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Plus, Shield, Pencil, Trash2, Loader2, Eye, EyeOff,
  UserPlus, Crown, UserCog, ChevronDown, ChevronRight, Save, X,
} from "lucide-react";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface TeamMember {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
  createdAt: string;
}

// Permission groups for the UI
const PERMISSION_GROUPS: { label: string; icon: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: "Entrepot",
    icon: "boxes",
    permissions: [
      { key: "entrepot.voir", label: "Voir l'entrepot" },
      { key: "entrepot.produits.creer", label: "Creer des produits" },
      { key: "entrepot.produits.modifier", label: "Modifier des produits" },
      { key: "entrepot.produits.supprimer", label: "Supprimer des produits" },
      { key: "entrepot.categories", label: "Gerer les categories" },
      { key: "entrepot.mouvements", label: "Voir les mouvements" },
      { key: "entrepot.parametres", label: "Parametres entrepot" },
    ],
  },
  {
    label: "Commerce",
    icon: "receipt",
    permissions: [
      { key: "commerce.voir", label: "Voir le commerce" },
      { key: "commerce.factures.creer", label: "Creer des factures" },
      { key: "commerce.factures.modifier", label: "Modifier des factures" },
      { key: "commerce.factures.supprimer", label: "Supprimer des factures" },
      { key: "commerce.clients", label: "Gerer les clients" },
      { key: "commerce.creances", label: "Gerer les creances" },
      { key: "commerce.devis", label: "Gerer les devis" },
      { key: "commerce.achats", label: "Achats quotidiens" },
      { key: "commerce.parametres", label: "Parametres commerce" },
    ],
  },
  {
    label: "Boutique",
    icon: "store",
    permissions: [
      { key: "boutique.voir", label: "Voir la boutique" },
      { key: "boutique.catalogue", label: "Gerer le catalogue" },
      { key: "boutique.commandes", label: "Gerer les commandes" },
      { key: "boutique.promotions", label: "Gerer les promotions" },
      { key: "boutique.parametres", label: "Parametres boutique" },
    ],
  },
  {
    label: "Personnel",
    icon: "user-cog",
    permissions: [
      { key: "personnel.voir", label: "Voir le personnel" },
      { key: "personnel.employes", label: "Gerer les employes" },
      { key: "personnel.salaires", label: "Gerer les salaires" },
    ],
  },
  {
    label: "Banque",
    icon: "building",
    permissions: [
      { key: "banque.voir", label: "Voir la banque" },
      { key: "banque.comptes", label: "Gerer les comptes" },
      { key: "banque.transactions", label: "Gerer les transactions" },
      { key: "banque.virements", label: "Gerer les virements" },
      { key: "banque.parametres", label: "Parametres banque" },
    ],
  },
  {
    label: "Analytique",
    icon: "chart",
    permissions: [
      { key: "analytique.voir", label: "Voir l'analytique" },
    ],
  },
  {
    label: "Logistique",
    icon: "truck",
    permissions: [
      { key: "logistique.voir", label: "Voir la logistique" },
      { key: "logistique.fournisseurs", label: "Gerer les fournisseurs" },
      { key: "logistique.commandes", label: "Gerer les commandes fournisseurs" },
      { key: "logistique.livraisons", label: "Gerer les livraisons" },
    ],
  },
  {
    label: "Pilotage",
    icon: "list",
    permissions: [
      { key: "taches.voir", label: "Voir le pilotage" },
      { key: "taches.tableaux", label: "Gerer les tableaux" },
      { key: "taches.agenda", label: "Gerer l'agenda" },
    ],
  },
  {
    label: "Confidentialite",
    icon: "eye-off",
    permissions: [
      { key: "confidentialite.chiffre_affaires", label: "Voir le chiffre d'affaires" },
      { key: "confidentialite.prix_achat", label: "Voir les prix d'achat" },
      { key: "confidentialite.marges", label: "Voir les marges et profits" },
      { key: "confidentialite.salaires", label: "Voir les salaires" },
      { key: "confidentialite.paiements", label: "Voir les montants des paiements" },
      { key: "confidentialite.valeur_stock", label: "Voir la valeur du stock" },
    ],
  },
  {
    label: "Systeme",
    icon: "settings",
    permissions: [
      { key: "systeme.parametres", label: "Parametres generaux" },
      { key: "systeme.corbeille", label: "Gerer la corbeille" },
      { key: "systeme.equipe", label: "Gerer l'equipe" },
    ],
  },
];

export default function EquipePage() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team", { headers: getHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleDelete(member: TeamMember) {
    if (!confirm(`Supprimer ${member.name} de l'equipe ?`)) return;
    const res = await fetch(`/api/team/${member._id}`, { method: "DELETE", headers: getHeaders() });
    if (res.ok) {
      toast.success("Membre supprime");
      fetchMembers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Acces restreint</h2>
        <p className="text-muted-foreground">Seul l'administrateur peut gerer l'equipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Equipe
          </h1>
          <p className="text-muted-foreground">Gerez les membres de votre equipe et leurs permissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un membre
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member._id === user?.id;
            const permCount = member.role === "admin"
              ? "Toutes"
              : String(Object.values(member.permissions || {}).filter(Boolean).length);

            return (
              <div
                key={member._id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 animate-card"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{member.name}</span>
                    {member.role === "admin" ? (
                      <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">
                        <Crown className="h-3 w-3 mr-0.5" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <UserCog className="h-3 w-3 mr-0.5" /> Gerant
                      </Badge>
                    )}
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-[10px]">Vous</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {permCount} permission{permCount !== "1" ? "s" : ""}
                  </span>
                  {!isCurrentUser && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setEditMember(member)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Permissions
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create member dialog */}
      <CreateMemberDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchMembers(); }}
      />

      {/* Edit permissions dialog */}
      {editMember && (
        <EditPermissionsDialog
          member={editMember}
          open={!!editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); fetchMembers(); }}
        />
      )}
    </div>
  );
}

// ─── Create Member Dialog ───

function CreateMemberDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  function reset() {
    setName(""); setEmail(""); setPassword(""); setPermissions({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, permissions }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Membre ajoute");
      reset();
      onCreated();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un membre
          </DialogTitle>
          <DialogDescription>Creez un compte gerant avec des permissions specifiques</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du gerant" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mot de passe</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 caracteres"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <PermissionEditor permissions={permissions} onChange={setPermissions} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Creer le compte
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Permissions Dialog ───

function EditPermissionsDialog({ member, open, onClose, onSaved }: { member: TeamMember; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(member.permissions || {});
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(member.name);
  const [password, setPassword] = useState("");

  useEffect(() => {
    setPermissions(member.permissions || {});
    setRole(member.role);
    setName(member.name);
    setPassword("");
  }, [member]);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, unknown> = { permissions, role };
    if (name.trim() !== member.name) body.name = name.trim();
    if (password) body.password = password;

    const res = await fetch(`/api/team/${member._id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Permissions mises a jour");
      onSaved();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions — {member.name}
          </DialogTitle>
          <DialogDescription>Definissez ce que ce membre peut voir et gerer</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="gerant">Gerant</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nouveau mot de passe (optionnel)</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
            />
          </div>

          {role === "admin" ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-amber-600">
                <Crown className="h-4 w-4" />
                Administrateur — acces complet
              </div>
              <p className="text-muted-foreground mt-1">
                Un administrateur a acces a toutes les fonctionnalites sans restriction.
              </p>
            </div>
          ) : (
            <PermissionEditor permissions={permissions} onChange={setPermissions} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permission Editor Component ───

function PermissionEditor({ permissions, onChange }: { permissions: Record<string, boolean>; onChange: (p: Record<string, boolean>) => void }) {
  const [expanded, setExpanded] = useState<string[]>([]);

  function toggleGroup(label: string) {
    setExpanded((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  }

  function togglePerm(key: string) {
    const next = { ...permissions, [key]: !permissions[key] };
    // Auto-enable ".voir" when any permission in the same module is checked
    if (next[key]) {
      const module = key.split(".")[0]; // e.g. "commerce" from "commerce.factures.creer"
      const voirKey = `${module}.voir`;
      if (voirKey !== key && !next[voirKey]) {
        next[voirKey] = true;
      }
    }
    onChange(next);
  }

  function toggleAllInGroup(group: typeof PERMISSION_GROUPS[0]) {
    const allOn = group.permissions.every((p) => permissions[p.key]);
    const next = { ...permissions };
    for (const p of group.permissions) {
      next[p.key] = !allOn;
    }
    // When enabling all in a group, also ensure ".voir" is enabled
    if (!allOn && group.permissions.length > 0) {
      const module = group.permissions[0].key.split(".")[0];
      const voirKey = `${module}.voir`;
      next[voirKey] = true;
    }
    onChange(next);
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    for (const g of PERMISSION_GROUPS) {
      for (const p of g.permissions) {
        next[p.key] = true;
      }
    }
    onChange(next);
  }

  function selectNone() {
    onChange({});
  }

  const totalPerms = PERMISSION_GROUPS.reduce((s, g) => s + g.permissions.length, 0);
  const activeCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permissions ({activeCount}/{totalPerms})
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">Tout cocher</button>
          <span className="text-xs text-muted-foreground">|</span>
          <button type="button" onClick={selectNone} className="text-xs text-primary hover:underline">Tout decocher</button>
        </div>
      </div>

      <div className="space-y-1">
        {PERMISSION_GROUPS.map((group) => {
          const isOpen = expanded.includes(group.label);
          const activeInGroup = group.permissions.filter((p) => permissions[p.key]).length;
          const allOn = activeInGroup === group.permissions.length;

          return (
            <div key={group.label} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.label)}
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium flex-1">{group.label}</span>
                <span className="text-[11px] text-muted-foreground">{activeInGroup}/{group.permissions.length}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleAllInGroup(group); }}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${allOn ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {allOn ? "Tout retirer" : "Tout activer"}
                </button>
              </div>
              {isOpen && (
                <div className="px-3 py-2 space-y-1 border-t border-border">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!permissions[perm.key]}
                        onChange={() => togglePerm(perm.key)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
