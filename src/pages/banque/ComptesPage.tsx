import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Landmark,
  Loader2,
  Trash2,
  Plus,
  Pencil,
  Star,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface BankAccount {
  _id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  type: string;
  currency: string;
  balance: number;
  isDefault: boolean;
  notes: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  courant: "Courant",
  epargne: "Épargne",
  mobile_money: "Mobile Money",
};

const typeColors: Record<string, string> = {
  courant: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  epargne: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  mobile_money: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

function getToken() {
  return localStorage.getItem("mbayestock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

const emptyForm = {
  name: "",
  bankName: "",
  accountNumber: "",
  type: "courant",
  currency: "FCFA",
  balance: 0,
  isDefault: false,
  notes: "",
};

export default function ComptesPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/bank-accounts`, { headers });
      if (res.ok) setAccounts(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchAccounts().then(() => setLoading(false));
  }, []);

  const filtered = accounts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.bankName && a.bankName.toLowerCase().includes(q))
    );
  });

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (account: BankAccount) => {
    setEditId(account._id);
    setForm({
      name: account.name,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber || "",
      type: account.type,
      currency: account.currency || "FCFA",
      balance: account.balance,
      isDefault: account.isDefault,
      notes: account.notes || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom du compte est requis");
      return;
    }
    try {
      const url = editId
        ? `/api/bank-accounts/${editId}`
        : `/api/bank-accounts`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          type: form.type,
          currency: form.currency.trim() || "FCFA",
          balance: form.balance,
          isDefault: form.isDefault,
          notes: form.notes.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success(editId ? "Compte modifié" : "Compte ajouté");
      setFormOpen(false);
      resetForm();
      fetchAccounts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Supprimer ce compte bancaire ?")) return;
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Impossible de supprimer ce compte");
      }
      toast.success("Compte supprimé");
      setAccounts((prev) => prev.filter((a) => a._id !== id));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comptes bancaires</h1>
          <p className="text-muted-foreground">
            {accounts.length} compte{accounts.length !== 1 ? "s" : ""} — Solde total :{" "}
            <span className="font-semibold text-foreground">{fmtMoney(totalBalance)}</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau compte
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou banque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Landmark className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucun compte</h3>
          <p className="text-muted-foreground">
            {accounts.length === 0
              ? "Ajoutez votre premier compte bancaire"
              : "Aucun résultat pour cette recherche"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Nom</th>
                <th className="text-left p-3 font-medium">Banque</th>
                <th className="text-left p-3 font-medium">N° Compte</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Solde</th>
                <th className="text-center p-3 font-medium">Défaut</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account) => (
                <tr key={account._id} className="border-b last:border-0 hover:bg-muted/30 animate-row">
                  <td className="p-3">
                    <div className="font-medium">{account.name}</div>
                    {account.currency && account.currency !== "FCFA" && (
                      <div className="text-xs text-muted-foreground">{account.currency}</div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{account.bankName || "—"}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{account.accountNumber || "—"}</td>
                  <td className="p-3">
                    <Badge className={`${typeColors[account.type] || "bg-slate-500/15 text-slate-600"} border-0 text-xs`}>
                      {typeLabels[account.type] || account.type}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium">{fmtMoney(account.balance)}</td>
                  <td className="p-3 text-center">
                    {account.isDefault && (
                      <Star className="h-4 w-4 mx-auto fill-yellow-400 text-yellow-400" />
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteAccount(account._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========== CREATE / EDIT DIALOG =========== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom du compte *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Compte principal" />
              </div>
              <div>
                <Label>Banque</Label>
                <Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Ex: CBAO, Wave..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>N° de compte</Label>
                <Input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="Numéro de compte" />
              </div>
              <div>
                <Label>Type de compte</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Devise</Label>
                <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} placeholder="FCFA" />
              </div>
              <div>
                <Label>Solde initial</Label>
                <Input
                  type="number"
                  value={form.balance || ""}
                  onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isDefault: checked === true }))}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">Compte par défaut</Label>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes internes..." rows={3} />
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
    </div>
  );
}
