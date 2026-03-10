import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { StockLoader } from "@/components/StockLoader";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function fmtMoney(n: number) {
  return Number(n).toLocaleString("fr-FR") + " F";
}

interface BankAccount {
  _id: string;
  name: string;
}

interface ParsedRow {
  date: string;
  type: string;
  description: string;
  montant: string;
  reference: string;
  categorie: string;
  valid: boolean;
  error?: string;
}

const VALID_TYPES = ["entree", "sortie"];
const VALID_CATEGORIES = [
  "vente",
  "salaire",
  "fournisseur",
  "loyer",
  "charge",
  "autre",
];

const TEMPLATE_CSV =
  "date,type,description,montant,reference,categorie\n2025-01-15,entree,Vente produits,150000,REF-001,vente\n2025-01-16,sortie,Paiement fournisseur,85000,REF-002,fournisseur\n2025-01-17,sortie,Loyer boutique,200000,REF-003,loyer";

function parseCsvRows(csv: string): ParsedRow[] {
  const lines = csv
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  // Skip header if it looks like one
  const first = lines[0].toLowerCase();
  const startIdx =
    first.includes("date") && first.includes("type") ? 1 : 0;

  return lines.slice(startIdx).map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    const [date, type, description, montant, reference, categorie] = parts;

    const errors: string[] = [];
    if (!date) errors.push("date manquante");
    if (!VALID_TYPES.includes(type)) errors.push("type invalide");
    if (!description) errors.push("description manquante");
    if (!montant || isNaN(Number(montant))) errors.push("montant invalide");
    if (categorie && !VALID_CATEGORIES.includes(categorie))
      errors.push("categorie invalide");

    return {
      date: date || "",
      type: type || "",
      description: description || "",
      montant: montant || "",
      reference: reference || "",
      categorie: categorie || "",
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  });
}

export default function ImportBanquePage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-accounts", {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) setAccountId(data[0]._id);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Parse CSV whenever text changes
  useEffect(() => {
    if (csvText.trim()) {
      setParsedRows(parseCsvRows(csvText));
    } else {
      setParsedRows([]);
    }
    setResult(null);
  }, [csvText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text || "");
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!accountId) {
      toast.error("Veuillez selectionner un compte");
      return;
    }
    if (!csvText.trim()) {
      toast.error("Veuillez coller ou importer un fichier CSV");
      return;
    }
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide a importer");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/import-export/import-bank-transactions", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ csv: csvText, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'import");
      setResult({
        imported: data.imported || data.count || 0,
        errors: data.errors || [],
      });
      toast.success(
        `${data.imported || data.count || 0} transaction(s) importee(s)`
      );
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'import");
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_transactions_bancaires.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <StockLoader />;

  const validCount = parsedRows.filter((r) => r.valid).length;
  const errorCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold text-foreground">
          Import transactions bancaires
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Importez vos transactions bancaires via fichier CSV
        </p>
      </div>

      {/* Account selector + template */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 animate-card">
        <div className="w-full sm:w-72 space-y-2">
          <Label>Compte bancaire</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un compte" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc._id} value={acc._id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Telecharger le modele
        </Button>
      </div>

      {/* CSV Input */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Donnees CSV
          </h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Charger un fichier
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Format: date,type,description,montant,reference,categorie
          </Label>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`date,type,description,montant,reference,categorie\n2025-01-15,entree,Vente produits,150000,REF-001,vente\n2025-01-16,sortie,Paiement fournisseur,85000,REF-002,fournisseur`}
            rows={8}
            className="font-mono text-xs"
          />
        </div>

        {/* Types and categories hint */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Types:</span> entree, sortie
          </div>
          <div>
            <span className="font-medium">Categories:</span> vente, salaire,
            fournisseur, loyer, charge, autre
          </div>
        </div>
      </div>

      {/* Preview */}
      {parsedRows.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Apercu ({parsedRows.length} ligne{parsedRows.length > 1 ? "s" : ""})
            </h3>
            <div className="flex items-center gap-3 text-xs">
              {validCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validCount} valide{validCount > 1 ? "s" : ""}
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorCount} erreur{errorCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    #
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Date
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Type
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Description
                  </th>
                  <th className="text-right p-2 font-medium text-muted-foreground text-xs">
                    Montant
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Reference
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Categorie
                  </th>
                  <th className="text-left p-2 font-medium text-muted-foreground text-xs">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-t border-border ${
                      row.valid
                        ? "hover:bg-muted/30"
                        : "bg-red-500/5"
                    }`}
                  >
                    <td className="p-2 text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="p-2 text-xs">{row.date}</td>
                    <td className="p-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.type === "entree"
                            ? "bg-green-500/15 text-green-700 dark:text-green-400"
                            : row.type === "sortie"
                            ? "bg-red-500/15 text-red-700 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.type || "—"}
                      </span>
                    </td>
                    <td className="p-2 text-xs max-w-[180px] truncate">
                      {row.description}
                    </td>
                    <td className="p-2 text-xs text-right font-medium">
                      {row.montant && !isNaN(Number(row.montant))
                        ? fmtMoney(Number(row.montant))
                        : row.montant}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {row.reference || "—"}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {row.categorie || "—"}
                    </td>
                    <td className="p-2 text-xs">
                      {row.valid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <span
                          className="text-red-500 cursor-help"
                          title={row.error}
                        >
                          <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                          {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {parsedRows.length > 0 && !result && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importer {validCount} transaction{validCount > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-border bg-card p-5 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Import termine
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {result.imported} transaction{result.imported > 1 ? "s" : ""}{" "}
            importee{result.imported > 1 ? "s" : ""} avec succes.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                {result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}:
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCsvText("");
              setParsedRows([]);
              setResult(null);
            }}
          >
            Nouvel import
          </Button>
        </div>
      )}
    </div>
  );
}
