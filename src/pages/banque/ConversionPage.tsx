import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft, RefreshCw } from "lucide-react";

// Use relative URLs — Vite proxy routes /api to the server

interface Account {
  _id: string;
  name: string;
  currency: string;
  balance: number;
}

const CURRENCIES = [
  { code: "FCFA", label: "Franc CFA (FCFA)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "Dollar US (USD)" },
  { code: "GBP", label: "Livre Sterling (GBP)" },
  { code: "MAD", label: "Dirham Marocain (MAD)" },
  { code: "GNF", label: "Franc Guinéen (GNF)" },
];

// Approximate rates vs FCFA
const RATES_TO_FCFA: Record<string, number> = {
  FCFA: 1,
  EUR: 655.957,
  USD: 600,
  GBP: 760,
  MAD: 60,
  GNF: 0.07,
};

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export default function ConversionPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromCurrency, setFromCurrency] = useState("FCFA");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [amount, setAmount] = useState<number>(0);
  const [result, setResult] = useState<number | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  useEffect(() => {
    fetch(`/api/bank-accounts`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const convert = () => {
    if (!amount || amount <= 0) return;
    const inFcfa = amount * (RATES_TO_FCFA[fromCurrency] || 1);
    const converted = inFcfa / (RATES_TO_FCFA[toCurrency] || 1);
    setResult(converted);
  };

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  const rate =
    (RATES_TO_FCFA[fromCurrency] || 1) / (RATES_TO_FCFA[toCurrency] || 1);

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
        <h1 className="text-2xl font-bold">Conversion de devises</h1>
        <p className="text-muted-foreground">
          Convertir entre les principales devises
        </p>
      </div>

      {/* Converter card */}
      <div className="max-w-xl mx-auto rounded-lg border bg-card p-6 space-y-5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <Label>De</Label>
            <Select value={fromCurrency} onValueChange={(v) => { setFromCurrency(v); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={swap} className="mb-0.5">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <div>
            <Label>Vers</Label>
            <Select value={toCurrency} onValueChange={(v) => { setToCurrency(v); setResult(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Montant</Label>
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => { setAmount(Number(e.target.value) || 0); setResult(null); }}
            placeholder="0"
            min={0}
          />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          1 {fromCurrency} = {fmtMoney(rate)} {toCurrency}
        </div>

        <Button className="w-full" onClick={convert} disabled={!amount || amount <= 0}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Convertir
        </Button>

        {result !== null && (
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">
              {fmtMoney(amount)} {fromCurrency} =
            </div>
            <div className="text-3xl font-bold mt-1">
              {fmtMoney(result)} {toCurrency}
            </div>
          </div>
        )}
      </div>

      {/* Account balances reference */}
      {accounts.length > 0 && (
        <div className="max-w-xl mx-auto rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Soldes de vos comptes</h3>
          </div>
          <div className="divide-y">
            {accounts.map((acc) => (
              <div key={acc._id} className="flex items-center justify-between p-3">
                <span className="text-sm">{acc.name}</span>
                <span className="text-sm font-medium">
                  {fmtMoney(acc.balance)} {acc.currency}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Taux indicatifs. Les taux réels peuvent varier.
      </p>
    </div>
  );
}
