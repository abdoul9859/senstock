import { useState, useRef } from "react";
import {
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatFCFA(n?: number): string {
  if (n == null) return "0 F";
  return Number(n).toLocaleString("fr-FR") + " F";
}

const EXPECTED_COLUMNS = ["nom", "categorie", "marque", "modele", "prix_achat", "prix_vente", "quantite", "code_barres"];

const SAMPLE_CSV = `nom,categorie,marque,modele,prix_achat,prix_vente,quantite,code_barres
Ecran 24 pouces,Moniteurs,Samsung,S24F350,85000,120000,10,6001234567890
Clavier mecanique,Peripheriques,Logitech,G413,25000,38000,20,6009876543210
Souris sans fil,Peripheriques,Logitech,M185,5000,8500,50,6005551234567`;

interface ParsedRow {
  nom: string;
  categorie: string;
  marque: string;
  modele: string;
  prix_achat: string;
  prix_vente: string;
  quantite: string;
  code_barres: string;
}

interface ImportResult {
  imported: number;
  errors: string[];
}

export default function ImportProduitsPage() {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCsv(text: string) {
    setResult(null);
    setParseError("");
    setCsvText(text);

    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsed([]);
      if (text.trim()) setParseError("Le CSV doit contenir un en-tete et au moins une ligne de donnees.");
      return;
    }

    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    const missing = EXPECTED_COLUMNS.filter(c => !header.includes(c));
    if (missing.length > 0) {
      setParseError(`Colonnes manquantes: ${missing.join(", ")}`);
      setParsed([]);
      return;
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      EXPECTED_COLUMNS.forEach(col => {
        const idx = header.indexOf(col);
        row[col] = idx >= 0 && idx < vals.length ? vals[idx] : "";
      });
      rows.push(row as ParsedRow);
    }
    setParsed(rows);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (parsed.length === 0) {
      toast.error("Aucune donnee a importer");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/import-export/import-products", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ csv: csvText }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult({ imported: data.imported ?? 0, errors: data.errors ?? [] });
      if (data.imported > 0) toast.success(`${data.imported} produit(s) importe(s)`);
      if (data.errors?.length) toast.error(`${data.errors.length} erreur(s) rencontree(s)`);
    } catch {
      toast.error("Erreur lors de l'importation");
    }
    setImporting(false);
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele_produits.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Importer des produits</h1>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" /> Telecharger le modele
        </Button>
      </div>

      {/* Upload section */}
      <Card className="animate-card">
        <CardHeader>
          <CardTitle className="text-lg">Donnees CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Format attendu: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
              {EXPECTED_COLUMNS.join(",")}
            </code>
          </div>

          <div className="space-y-1.5">
            <Label>Coller le CSV</Label>
            <Textarea
              value={csvText}
              onChange={e => parseCsv(e.target.value)}
              placeholder="Collez vos donnees CSV ici..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">ou</div>
            <div>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-auto"
              />
            </div>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsed.length > 0 && (
        <Card className="animate-card">
          <CardHeader>
            <CardTitle className="text-lg">
              Apercu ({parsed.length} ligne{parsed.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Modele</TableHead>
                    <TableHead className="text-right">Prix achat</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Quantite</TableHead>
                    <TableHead>Code barres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((row, idx) => (
                    <TableRow key={idx} className="animate-row" style={{ animationDelay: `${idx * 30}ms` }}>
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell>{row.categorie}</TableCell>
                      <TableCell>{row.marque}</TableCell>
                      <TableCell>{row.modele}</TableCell>
                      <TableCell className="text-right">{formatFCFA(Number(row.prix_achat))}</TableCell>
                      <TableCell className="text-right">{formatFCFA(Number(row.prix_vente))}</TableCell>
                      <TableCell className="text-right">{row.quantite}</TableCell>
                      <TableCell className="font-mono text-xs">{row.code_barres}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importer {parsed.length} produit{parsed.length > 1 ? "s" : ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-lg">Resultat de l'importation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{result.imported} produit{result.imported > 1 ? "s" : ""} importe{result.imported > 1 ? "s" : ""} avec succes</span>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{result.errors.length} erreur{result.errors.length > 1 ? "s" : ""}:</span>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive/80 ml-6 space-y-0.5">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
