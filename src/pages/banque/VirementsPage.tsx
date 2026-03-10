import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  SendHorizontal,
  ArrowLeftRight,
  Landmark,
} from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface BankAccount {
  _id: string;
  name: string;
  bankName: string;
  type: string;
  balance: number;
}

interface Transfer {
  _id: string;
  number: string;
  amount: number;
  description: string;
  accountId: { _id: string; name: string };
  toAccountId: { _id: string; name: string };
  date: string;
  reference: string;
  notes: string;
}

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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function VirementsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const fetchData = useCallback(async () => {
    try {
      const [accRes, trRes] = await Promise.all([
        fetch(`/api/bank-accounts`, { headers }),
        fetch(`/api/bank-transactions?type=virement`, { headers }),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (trRes.ok) {
        const data = await trRes.json();
        setTransfers(data.transactions || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, []);

  const sourceAccount = accounts.find((a) => a._id === sourceId);
  const destAccount = accounts.find((a) => a._id === destId);
  const parsedAmount = parseFloat(amount) || 0;

  const resetForm = () => {
    setSourceId("");
    setDestId("");
    setAmount("");
    setDescription("");
    setReference("");
    setDate(todayISO());
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!sourceId) { toast.error("Sélectionnez le compte source"); return; }
    if (!destId) { toast.error("Sélectionnez le compte destination"); return; }
    if (sourceId === destId) { toast.error("Les comptes source et destination doivent être différents"); return; }
    if (parsedAmount <= 0) { toast.error("Le montant doit être supérieur à 0"); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bank-transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "virement",
          amount: parsedAmount,
          description,
          accountId: sourceId,
          toAccountId: destId,
          date,
          reference,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du virement");
      toast.success("Virement effectué avec succès");
      resetForm();
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
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
      <div>
        <h1 className="text-2xl font-bold">Virements</h1>
        <p className="text-muted-foreground">Transferts entre comptes bancaires</p>
      </div>

      {/* Transfer Form */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <SendHorizontal className="h-5 w-5" />
          Nouveau virement
        </h2>

        {/* Visual: Source -> Destination */}
        <div className="flex items-center gap-4 justify-center py-4">
          <div className="flex-1 max-w-xs rounded-lg border p-4 text-center bg-muted/30">
            <Landmark className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-medium truncate">
              {sourceAccount ? sourceAccount.name : "Compte source"}
            </div>
            {sourceAccount && (
              <div className="text-xs text-muted-foreground mt-1">
                Solde : {fmtMoney(sourceAccount.balance)}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <ArrowRight className="h-6 w-6 text-primary" />
            {parsedAmount > 0 && (
              <span className="text-sm font-bold text-primary">{fmtMoney(parsedAmount)}</span>
            )}
          </div>

          <div className="flex-1 max-w-xs rounded-lg border p-4 text-center bg-muted/30">
            <Landmark className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-medium truncate">
              {destAccount ? destAccount.name : "Compte destination"}
            </div>
            {destAccount && (
              <div className="text-xs text-muted-foreground mt-1">
                Solde : {fmtMoney(destAccount.balance)}
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Compte source</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le compte source" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc._id} value={acc._id}>
                    {acc.name} ({fmtMoney(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Compte destination</Label>
            <Select value={destId} onValueChange={setDestId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le compte destination" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter((acc) => acc._id !== sourceId).map((acc) => (
                  <SelectItem key={acc._id} value={acc._id}>
                    {acc.name} ({fmtMoney(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Montant</Label>
            <Input type="number" min="0" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Input placeholder="Description du virement" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <Label>Référence</Label>
            <Input placeholder="Référence (optionnel)" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea placeholder="Notes supplémentaires (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <SendHorizontal className="h-4 w-4 mr-2" />
            Effectuer le virement
          </Button>
        </div>
      </div>

      {/* Recent Transfers Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Virements récents
        </h2>

        {transfers.length === 0 ? (
          <div className="text-center py-16 rounded-lg border bg-card">
            <ArrowLeftRight className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Aucun virement</h3>
            <p className="text-muted-foreground">Les virements effectués apparaîtront ici</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">De</th>
                  <th className="text-left p-3 font-medium">Vers</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{tr.number}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(tr.date)}</td>
                    <td className="p-3">{tr.accountId?.name || "—"}</td>
                    <td className="p-3">{tr.toAccountId?.name || "—"}</td>
                    <td className="p-3 text-right font-bold">{fmtMoney(tr.amount)}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{tr.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
