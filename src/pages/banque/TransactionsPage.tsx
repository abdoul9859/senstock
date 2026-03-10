import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  Trash2,
  Plus,
  Download,
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Account {
  _id: string;
  name: string;
}

interface Transaction {
  _id: string;
  number: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  accountId: { _id: string; name: string };
  toAccountId?: { _id: string; name: string };
  date: string;
  reference: string;
  reconciled: boolean;
  notes: string;
}

const typeLabels: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  virement: "Virement",
};

const typeColors: Record<string, string> = {
  entree: "bg-green-500/15 text-green-600 dark:text-green-400",
  sortie: "bg-red-500/15 text-red-600 dark:text-red-400",
  virement: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const categoryLabels: Record<string, string> = {
  vente: "Vente",
  salaire: "Salaire",
  fournisseur: "Fournisseur",
  loyer: "Loyer",
  charge: "Charge",
  virement_interne: "Virement interne",
  autre: "Autre",
};

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LIMIT = 50;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState("entree");
  const [formCategory, setFormCategory] = useState("autre");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formAccountId, setFormAccountId] = useState("");
  const [formToAccountId, setFormToAccountId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formReference, setFormReference] = useState("");
  const [formNotes, setFormNotes] = useState("");

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

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (search) params.set("search", search);
      if (filterAccount !== "all") params.set("accountId", filterAccount);
      if (filterType !== "all") params.set("type", filterType);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/bank-transactions?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [page, search, filterAccount, filterType, startDate, endDate]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const resetForm = () => {
    setFormType("entree");
    setFormCategory("autre");
    setFormAmount(0);
    setFormAccountId("");
    setFormToAccountId("");
    setFormDescription("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormReference("");
    setFormNotes("");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formAccountId) { toast.error("Sélectionnez un compte"); return; }
    if (!formAmount || formAmount <= 0) { toast.error("Montant invalide"); return; }
    if (formType === "virement" && !formToAccountId) { toast.error("Sélectionnez le compte destinataire"); return; }

    try {
      const body: any = {
        type: formType,
        category: formType === "virement" ? "virement_interne" : formCategory,
        amount: formAmount,
        accountId: formAccountId,
        description: formDescription.trim(),
        date: formDate,
        reference: formReference.trim(),
        notes: formNotes.trim(),
      };
      if (formType === "virement") body.toAccountId = formToAccountId;

      const res = await fetch(`/api/bank-transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Transaction créée");
      setFormOpen(false);
      resetForm();
      fetchTransactions();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("Supprimer cette transaction ?")) return;
    try {
      const res = await fetch(`/api/bank-transactions/${id}`, { method: "DELETE", headers });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erreur");
      }
      toast.success("Transaction supprimée");
      fetchTransactions();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">{total} transaction{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToCsv("transactions", transactions, [
            { header: "Numero", accessor: (tx) => tx.number },
            { header: "Type", accessor: (tx) => typeLabels[tx.type] || tx.type },
            { header: "Categorie", accessor: (tx) => categoryLabels[tx.category] || tx.category },
            { header: "Montant", accessor: (tx) => tx.amount },
            { header: "Compte", accessor: (tx) => tx.accountId?.name || "" },
            { header: "Date", accessor: (tx) => fmtDate(tx.date) },
            { header: "Reference", accessor: (tx) => tx.reference },
            { header: "Description", accessor: (tx) => tx.description },
            { header: "Rapproche", accessor: (tx) => tx.reconciled ? "Oui" : "Non" },
          ])}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Compte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les comptes</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="w-40"
          placeholder="Date début"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="w-40"
          placeholder="Date fin"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16">
          <ArrowLeftRight className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Aucune transaction</h3>
          <p className="text-muted-foreground">
            {total === 0 && !search && filterAccount === "all" && filterType === "all"
              ? "Créez votre première transaction"
              : "Aucun résultat pour ces filtres"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Catégorie</th>
                  <th className="text-left p-3 font-medium">Compte</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="text-center p-3 font-medium">Rapp.</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b last:border-0 hover:bg-muted/30 animate-row">
                    <td className="p-3 font-mono text-xs">{tx.number}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(tx.date)}</td>
                    <td className="p-3">
                      <Badge className={`${typeColors[tx.type] || ""} border-0 text-xs`}>
                        {typeLabels[tx.type] || tx.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{categoryLabels[tx.category] || tx.category}</td>
                    <td className="p-3">
                      <div>{tx.accountId?.name || "—"}</div>
                      {tx.type === "virement" && tx.toAccountId && (
                        <div className="text-xs text-muted-foreground">→ {tx.toAccountId.name}</div>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{tx.description || "—"}</td>
                    <td className={`p-3 text-right font-medium whitespace-nowrap ${tx.type === "entree" ? "text-green-600 dark:text-green-400" : tx.type === "sortie" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {tx.type === "entree" ? "+" : tx.type === "sortie" ? "-" : ""}{fmtMoney(tx.amount)}
                    </td>
                    <td className="p-3 text-center">
                      {tx.reconciled && <CheckCircle2 className="h-4 w-4 mx-auto text-green-500" />}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteTransaction(tx._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} sur {totalPages} ({total} résultats)
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* =========== CREATE DIALOG =========== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle transaction</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={formType} onValueChange={(v) => { setFormType(v); if (v === "virement") setFormCategory("virement_interne"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={formCategory} onValueChange={setFormCategory} disabled={formType === "virement"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant *</Label>
                <Input
                  type="number"
                  value={formAmount || ""}
                  onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Compte *</Label>
              <Select value={formAccountId} onValueChange={setFormAccountId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formType === "virement" && (
              <div>
                <Label>Compte destinataire *</Label>
                <Select value={formToAccountId} onValueChange={setFormToAccountId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner le compte destinataire" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a._id !== formAccountId).map((a) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Description</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description de la transaction" />
            </div>

            <div>
              <Label>Référence</Label>
              <Input value={formReference} onChange={(e) => setFormReference(e.target.value)} placeholder="Référence externe (optionnel)" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes internes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>
              <Plus className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
