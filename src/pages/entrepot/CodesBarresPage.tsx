import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, Printer, Settings2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { StockLoader } from "@/components/StockLoader";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import JsBarcode from "jsbarcode";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import type { BarcodeConfig } from "@/components/BarcodeDisplay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// ---- Types ----

interface Category {
  _id: string;
  name: string;
  hasVariants: boolean;
}

interface Variant {
  _id?: string;
  serialNumber: string;
  barcode: string;
  condition: "neuf" | "venant" | "occasion";
  sold: boolean;
  price?: number;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  category: Category | null;
  sellingPrice?: number;
  quantity: number;
  archived: boolean;
  variants: Variant[];
}

interface BarcodeItem {
  id: string;
  productName: string;
  brand: string;
  model: string;
  categoryName: string;
  categoryId: string;
  serialNumber: string;
  barcode: string;
  condition: string;
  price?: number;
  sold: boolean;
  archived: boolean;
}

// ---- Helpers ----

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatPrice(n?: number): string {
  if (n == null) return "";
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

// ---- Component ----

const CodesBarresPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterModel, setFilterModel] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCondition, setFilterCondition] = useState("all");
  const [filterHasBarcode, setFilterHasBarcode] = useState("all");
  const [excludeSold, setExcludeSold] = useState(true);
  const [excludeArchived, setExcludeArchived] = useState(true);

  // Barcode config (defaults from settings)
  const _s = getEntrepotSettings();
  const [configOpen, setConfigOpen] = useState(false);
  const [bcFormat, setBcFormat] = useState(_s.bcFormat);
  const [bcWidth, setBcWidth] = useState(_s.bcWidth);
  const [bcHeight, setBcHeight] = useState(_s.bcHeight);
  const [bcFontSize, setBcFontSize] = useState(_s.bcFontSize);
  const [bcShowValue, setBcShowValue] = useState(_s.bcShowValue);
  const [bcShowLabel, setBcShowLabel] = useState(_s.bcShowLabel);
  const [bcShowPrice, setBcShowPrice] = useState(_s.bcShowPrice);
  const [printColumns, setPrintColumns] = useState(_s.bcPrintColumns);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const barcodeConfig: BarcodeConfig = useMemo(() => ({
    format: bcFormat,
    width: bcWidth,
    height: bcHeight,
    fontSize: bcFontSize,
    displayValue: bcShowValue,
  }), [bcFormat, bcWidth, bcHeight, bcFontSize, bcShowValue]);

  // ---- Fetch ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products", { headers: getHeaders() }),
        fetch("/api/categories", { headers: getHeaders() }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Build flat barcode items ----

  const allItems: BarcodeItem[] = useMemo(() => {
    const items: BarcodeItem[] = [];
    for (const p of products) {
      if (p.category?.hasVariants) {
        for (const v of p.variants) {
          items.push({
            id: `${p._id}-${v._id || v.serialNumber}`,
            productName: p.name,
            brand: p.brand || "",
            model: p.model || "",
            categoryName: p.category?.name || "",
            categoryId: p.category?._id || "",
            serialNumber: v.serialNumber,
            barcode: v.barcode || "",
            condition: v.condition || "neuf",
            price: v.price ?? p.sellingPrice,
            sold: v.sold,
            archived: p.archived,
          });
        }
      }
    }
    return items;
  }, [products]);

  // ---- Filter ----

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (excludeSold && item.sold) return false;
      if (excludeArchived && item.archived) return false;
      if (filterCategory !== "all" && item.categoryId !== filterCategory) return false;
      if (filterCondition !== "all" && item.condition !== filterCondition) return false;
      if (filterHasBarcode === "with" && !item.barcode) return false;
      if (filterHasBarcode === "without" && item.barcode) return false;
      if (filterBrand.trim() && !item.brand.toLowerCase().includes(filterBrand.toLowerCase())) return false;
      if (filterModel.trim() && !item.model.toLowerCase().includes(filterModel.toLowerCase())) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.productName.toLowerCase().includes(q) &&
          !item.serialNumber.toLowerCase().includes(q) &&
          !item.barcode.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allItems, search, filterCategory, filterModel, filterBrand, filterCondition, filterHasBarcode, excludeSold, excludeArchived]);

  const printableFiltered = filteredItems.filter((i) => i.barcode);

  // ---- Selection ----

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = printableFiltered.map((i) => i.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  }

  const selectedCount = [...selected].filter((id) => printableFiltered.some((i) => i.id === id)).length;

  // ---- Print ----

  function handlePrint(items: BarcodeItem[]) {
    const toPrint = items.filter((i) => i.barcode);
    if (toPrint.length === 0) return;

    const svgs: string[] = [];
    for (const item of toPrint) {
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try {
        JsBarcode(svgEl, item.barcode, {
          format: bcFormat,
          width: bcWidth,
          height: bcHeight,
          displayValue: bcShowValue,
          fontSize: bcFontSize,
          margin: 5,
          background: "transparent",
        });
      } catch { continue; }
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const labelHtml = bcShowLabel ? `<div class="label">${item.productName}${item.serialNumber ? ` — ${item.serialNumber}` : ""}</div>` : "";
      const priceHtml = bcShowPrice && item.price != null ? `<div class="price">${formatPrice(item.price)}</div>` : "";
      svgs.push(`<div class="cell">${labelHtml}<div class="barcode">${svgData}</div>${priceHtml}</div>`);
    }

    const colWidth = Math.floor(100 / printColumns);
    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) return;

    pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Impression codes-barres (${toPrint.length})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 10mm; }
    .grid { display: flex; flex-wrap: wrap; }
    .cell { width: ${colWidth}%; padding: 4mm; text-align: center; page-break-inside: avoid; break-inside: avoid; }
    .label { font-size: 10px; font-weight: 600; margin-bottom: 2px; word-break: break-word; }
    .barcode svg { max-width: 100%; height: auto; }
    .price { font-size: 11px; font-weight: 700; margin-top: 2px; }
    @media print { body { padding: 5mm; } }
  </style>
</head>
<body>
  <div class="grid">${svgs.join("")}</div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};};</script>
</body>
</html>`);
    pw.document.close();
  }

  // ---- Preview ----

  const previewRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!previewRef.current) return;
    try {
      JsBarcode(previewRef.current, "0123456789012", {
        format: bcFormat === "EAN13" ? "EAN13" : bcFormat === "CODE39" ? "CODE39" : "CODE128",
        width: bcWidth,
        height: bcHeight,
        displayValue: bcShowValue,
        fontSize: bcFontSize,
        margin: 5,
        background: "transparent",
        lineColor: "#000000",
      });
    } catch {
      if (previewRef.current) previewRef.current.innerHTML = "";
    }
  }, [bcFormat, bcWidth, bcHeight, bcShowValue, bcFontSize]);

  return (
    <div className="pb-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Codes-barres</h2>
        <p className="text-sm text-muted-foreground mt-1">Conception, personnalisation et impression en masse</p>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher produit, N/S, code-barres..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes categories</SelectItem>
              {categories.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Marque" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="w-32" />
          <Input placeholder="Modele" value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="w-32" />
          <Select value={filterCondition} onValueChange={setFilterCondition}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous etats</SelectItem>
              <SelectItem value="neuf">Neuf</SelectItem>
              <SelectItem value="venant">Venant</SelectItem>
              <SelectItem value="occasion">Occasion</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterHasBarcode} onValueChange={setFilterHasBarcode}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="with">Avec code-barres</SelectItem>
              <SelectItem value="without">Sans code-barres</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={excludeSold} onCheckedChange={(v) => setExcludeSold(!!v)} />
            Exclure les vendus
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={excludeArchived} onCheckedChange={(v) => setExcludeArchived(!!v)} />
            Exclure les archives
          </label>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredItems.length} resultat{filteredItems.length > 1 ? "s" : ""} — {printableFiltered.length} avec code-barres
          </span>
        </div>
      </div>

      {/* Config panel */}
      <div className="mb-4 rounded-xl border border-border bg-card shadow-sm">
        <button className="w-full flex items-center justify-between p-4 text-sm font-medium" onClick={() => setConfigOpen(!configOpen)}>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Personnalisation du code-barres
          </div>
          {configOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {configOpen && (
          <div className="border-t border-border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Format</Label>
                  <Select value={bcFormat} onValueChange={setBcFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">CODE128 (defaut)</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="CODE39">CODE39</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Largeur des barres: {bcWidth}</Label>
                  <Slider value={[bcWidth]} min={0.5} max={3} step={0.1} onValueChange={([v]) => setBcWidth(v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hauteur: {bcHeight}px</Label>
                  <Slider value={[bcHeight]} min={30} max={100} step={5} onValueChange={([v]) => setBcHeight(v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Taille du texte: {bcFontSize}px</Label>
                  <Slider value={[bcFontSize]} min={8} max={18} step={1} onValueChange={([v]) => setBcFontSize(v)} />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={bcShowValue} onCheckedChange={(v) => setBcShowValue(!!v)} />
                    Afficher la valeur sous le code-barres
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={bcShowLabel} onCheckedChange={(v) => setBcShowLabel(!!v)} />
                    Afficher le label (nom produit + N/S)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={bcShowPrice} onCheckedChange={(v) => setBcShowPrice(!!v)} />
                    Afficher le prix
                  </label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Colonnes par page: {printColumns}</Label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((n) => (
                      <Button key={n} variant={printColumns === n ? "default" : "outline"} size="sm" onClick={() => setPrintColumns(n)}>
                        {n} colonnes
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 bg-background">
                <p className="text-xs text-muted-foreground mb-3">Apercu</p>
                {bcShowLabel && <p className="text-xs font-semibold mb-1">Produit exemple — SN001</p>}
                <svg ref={previewRef} className="barcode-themed text-foreground" />
                {bcShowPrice && <p className="text-xs font-bold mt-1">150 000 F</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <StockLoader />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Aucun resultat</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={printableFiltered.length > 0 && printableFiltered.every((i) => selected.has(i.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-44">Code-barres</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>N/S</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Etat</TableHead>
                <TableHead>Prix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className={item.sold ? "opacity-50" : ""}>
                  <TableCell>
                    {item.barcode ? (
                      <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                    ) : <span />}
                  </TableCell>
                  <TableCell>
                    {item.barcode ? (
                      <BarcodeDisplay value={item.barcode} showPrint={false} config={barcodeConfig} />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pas de code-barres</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{item.productName}</span>
                    {item.brand && <span className="text-xs text-muted-foreground ml-1.5">{item.brand}{item.model ? ` · ${item.model}` : ""}</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{item.serialNumber || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">{item.categoryName || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.condition ? (
                      <Badge className={`text-xs ${
                        item.condition === "neuf" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                          : item.condition === "venant" ? "bg-blue-500/15 text-blue-600 border-blue-500/20"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/20"
                      }`}>{item.condition}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{item.price != null ? formatPrice(item.price) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sticky action bar */}
      {!loading && printableFiltered.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 py-3">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedCount > 0
                ? `${selectedCount} code${selectedCount > 1 ? "s" : ""}-barres selectionne${selectedCount > 1 ? "s" : ""}`
                : `${printableFiltered.length} code${printableFiltered.length > 1 ? "s" : ""}-barres disponible${printableFiltered.length > 1 ? "s" : ""}`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handlePrint(printableFiltered)}>
                <Printer className="h-4 w-4" />
                Tout imprimer ({printableFiltered.length})
              </Button>
              {selectedCount > 0 && (
                <Button onClick={() => handlePrint(printableFiltered.filter((i) => selected.has(i.id)))}>
                  <Printer className="h-4 w-4" />
                  Imprimer la selection ({selectedCount})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodesBarresPage;
