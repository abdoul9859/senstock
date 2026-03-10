import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  Trash2,
  Eye,
  Package,
  Loader2,
  SlidersHorizontal,
  Copy,
  Merge,
  ArrowRight,
  Layers,
  Hash,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Use relative URLs — Vite proxy routes /api to the server

interface Variant {
  _id: string;
  serialNumber: string;
  sold: boolean;
  condition?: string;
  price?: number;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  category?: { _id: string; name: string; hasVariants?: boolean };
  sellingPrice: number;
  quantity: number;
  variants?: Variant[];
  createdAt: string;
  archived?: boolean;
}

interface DuplicateGroup {
  key: string;
  products: Product[];
  similarity: number;
  matchReason: string;
}

// Dice coefficient on bigrams for string similarity
function bigrams(str: string): Set<string> {
  const s = str.toLowerCase().trim();
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.substring(i, i + 2));
  }
  return set;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return 1;
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;
  let intersection = 0;
  bigramsA.forEach((bg) => {
    if (bigramsB.has(bg)) intersection++;
  });
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function computeSimilarity(a: Product, b: Product): { score: number; reason: string } {
  const nameSim = diceCoefficient(a.name, b.name);
  const brandSim = diceCoefficient(a.brand || "", b.brand || "");
  const modelSim = diceCoefficient(a.model || "", b.model || "");

  let score = nameSim * 0.5;
  let reasons: string[] = [];

  if (nameSim > 0.6) reasons.push(`nom ${Math.round(nameSim * 100)}%`);

  if (a.brand && b.brand) {
    score += brandSim * 0.25;
    if (brandSim > 0.6) reasons.push(`marque ${Math.round(brandSim * 100)}%`);
  } else {
    score += nameSim * 0.25;
  }

  if (a.model && b.model) {
    score += modelSim * 0.25;
    if (modelSim > 0.6) reasons.push(`modèle ${Math.round(modelSim * 100)}%`);
  } else {
    score += nameSim * 0.25;
  }

  if (a.category?._id && b.category?._id && a.category._id === b.category._id) {
    score = Math.min(1, score + 0.05);
    reasons.push("même catégorie");
  }

  if (a.name.toLowerCase().trim() === b.name.toLowerCase().trim()) {
    score = Math.max(score, 0.95);
    reasons = ["nom identique"];
    if (a.brand && b.brand && a.brand.toLowerCase() === b.brand.toLowerCase()) {
      reasons.push("marque identique");
    }
  }

  return { score, reason: reasons.join(", ") || `ressemblance ${Math.round(score * 100)}%` };
}

function findDuplicates(products: Product[], threshold: number): DuplicateGroup[] {
  const groups: Map<string, DuplicateGroup> = new Map();
  const assigned = new Set<string>();

  for (let i = 0; i < products.length; i++) {
    if (assigned.has(products[i]._id)) continue;

    const group: Product[] = [products[i]];
    let bestSim = 0;
    let bestReason = "";

    for (let j = i + 1; j < products.length; j++) {
      if (assigned.has(products[j]._id)) continue;
      const { score, reason } = computeSimilarity(products[i], products[j]);
      if (score >= threshold) {
        group.push(products[j]);
        if (score > bestSim) {
          bestSim = score;
          bestReason = reason;
        }
      }
    }

    if (group.length > 1) {
      const key = group.map((p) => p._id).sort().join("-");
      group.forEach((p) => assigned.add(p._id));
      groups.set(key, { key, products: group, similarity: bestSim, matchReason: bestReason });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.similarity - a.similarity);
}

export default function DoublonsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null);
  const [mergeKeep, setMergeKeep] = useState<string>("");
  const [merging, setMerging] = useState(false);
  const [optTransferVariants, setOptTransferVariants] = useState(true);
  const [optAddQuantities, setOptAddQuantities] = useState(true);
  const token = localStorage.getItem("mbayestock_token");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      setProducts(data.filter((p: Product) => !p.archived));
    } catch {
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const duplicates = useMemo(
    () => findDuplicates(products, threshold / 100),
    [products, threshold]
  );

  const totalDuplicates = duplicates.reduce((s, g) => s + g.products.length, 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/products/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Produit supprimé");
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getVariantCount = (p: Product) => {
    if (!p.variants) return 0;
    return p.variants.filter((v) => !v.sold).length;
  };

  const getTotalVariants = (p: Product) => p.variants?.length || 0;

  const openMerge = (group: DuplicateGroup) => {
    setMergeGroup(group);
    setOptTransferVariants(true);
    setOptAddQuantities(true);
    // Default: keep the one with most variants/quantity
    const sorted = [...group.products].sort((a, b) => {
      const aScore = getTotalVariants(a) + (a.quantity || 0);
      const bScore = getTotalVariants(b) + (b.quantity || 0);
      return bScore - aScore;
    });
    setMergeKeep(sorted[0]._id);
  };

  // Compute preview of what will happen
  const mergePreview = useMemo(() => {
    if (!mergeGroup || !mergeKeep) return null;
    const kept = mergeGroup.products.find((p) => p._id === mergeKeep);
    const sources = mergeGroup.products.filter((p) => p._id !== mergeKeep);
    if (!kept) return null;

    let variantsToTransfer = 0;
    let quantityToAdd = 0;
    const existingSNs = new Set(
      (kept.variants || []).map((v) => v.serialNumber?.toLowerCase())
    );

    for (const src of sources) {
      if (optTransferVariants && src.variants) {
        variantsToTransfer += src.variants.filter(
          (v) => !existingSNs.has(v.serialNumber?.toLowerCase())
        ).length;
      }
      if (optAddQuantities) {
        quantityToAdd += src.quantity || 0;
      }
    }

    const hasVariants = kept.category?.hasVariants;
    return { variantsToTransfer, quantityToAdd, sourcesCount: sources.length, hasVariants };
  }, [mergeGroup, mergeKeep, optTransferVariants, optAddQuantities]);

  const handleMerge = async () => {
    if (!mergeGroup || !mergeKeep) return;
    const mergeIds = mergeGroup.products
      .filter((p) => p._id !== mergeKeep)
      .map((p) => p._id);

    setMerging(true);
    try {
      const res = await fetch(`/api/products/merge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keepId: mergeKeep,
          mergeIds,
          options: {
            transferVariants: optTransferVariants,
            addQuantities: optAddQuantities,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      const data = await res.json();
      const parts: string[] = [`${data.merged} produit(s) fusionné(s)`];
      if (data.variantsTransferred > 0)
        parts.push(`${data.variantsTransferred} variante(s) transférée(s)`);
      if (data.quantityAdded > 0) parts.push(`+${data.quantityAdded} unités`);
      toast.success(parts.join(" — "));
      setMergeGroup(null);
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la fusion");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Copy className="h-6 w-6 text-orange-500" />
            Gestionnaire de doublons
          </h1>
          <p className="text-muted-foreground mt-1">
            Détectez et gérez les produits en doublon dans votre inventaire
          </p>
        </div>
        <Button variant="outline" onClick={fetchProducts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Similarity slider */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <SlidersHorizontal className="h-5 w-5 text-orange-500" />
          <h2 className="font-semibold">Seuil de ressemblance</h2>
          <Badge variant="secondary" className="ml-auto text-base px-3">
            {threshold}%
          </Badge>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={(v) => setThreshold(v[0])}
          min={30}
          max={100}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>30% — Plus de résultats</span>
          <span>100% — Correspondance exacte</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{products.length}</div>
          <div className="text-sm text-muted-foreground">Produits analysés</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{duplicates.length}</div>
          <div className="text-sm text-muted-foreground">Groupes de doublons</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{totalDuplicates}</div>
          <div className="text-sm text-muted-foreground">Produits concernés</div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : duplicates.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-lg">Aucun doublon détecté</h3>
          <p className="text-muted-foreground mt-1">
            Essayez de réduire le seuil de ressemblance pour élargir la recherche
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.map((group) => (
            <div key={group.key} className="rounded-lg border bg-card overflow-hidden">
              <div className="bg-orange-500/10 border-b px-4 py-2.5 flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-orange-500/50 text-orange-600 bg-orange-500/10"
                >
                  {Math.round(group.similarity * 100)}% similaire
                </Badge>
                <span className="text-sm text-muted-foreground">{group.matchReason}</span>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => openMerge(group)}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    Fusionner
                  </Button>
                </div>
              </div>
              <div className="divide-y">
                {group.products.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        {p.brand && <span>{p.brand}</span>}
                        {p.model && (
                          <>
                            <span>·</span>
                            <span>{p.model}</span>
                          </>
                        )}
                        {p.category && (
                          <>
                            <span>·</span>
                            <span>{p.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm shrink-0">
                      {p.category?.hasVariants ? (
                        <span>{getVariantCount(p)} variante(s) dispo</span>
                      ) : (
                        <span>Qté : {p.quantity}</span>
                      )}
                      {p.sellingPrice > 0 && (
                        <div className="text-muted-foreground">
                          {p.sellingPrice.toLocaleString("fr-FR")} F
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Voir le produit"
                        onClick={() => navigate("/entrepot/inventaire")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer ce produit"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le produit <strong>{deleteTarget?.name}</strong> sera supprimé définitivement.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge dialog */}
      <Dialog open={!!mergeGroup} onOpenChange={(o) => !o && setMergeGroup(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-orange-500" />
              Fusionner les produits
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Sélectionnez le produit à conserver. Les données des autres produits seront
            transférées selon les options choisies, puis les doublons seront supprimés.
          </p>

          {/* Product selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Produit à conserver
            </Label>
            {mergeGroup?.products.map((p) => (
              <div
                key={p._id}
                onClick={() => setMergeKeep(p._id)}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  mergeKeep === p._id
                    ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500"
                    : "hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  {mergeKeep === p._id && (
                    <Badge className="bg-orange-500 text-white">Conserver</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {p.brand && <span>{p.brand}</span>}
                  {p.model && <span>{p.model}</span>}
                  {p.category && <span>{p.category.name}</span>}
                  <span className="ml-auto">
                    {p.category?.hasVariants
                      ? `${getTotalVariants(p)} variante(s)`
                      : `Qté : ${p.quantity}`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Merge options */}
          <div className="space-y-3 mt-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Options de fusion
            </Label>
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Transférer les variantes</div>
                    <div className="text-xs text-muted-foreground">
                      Les variantes des produits supprimés seront importées (sans doublons de N° de série)
                    </div>
                  </div>
                </div>
                <Switch
                  checked={optTransferVariants}
                  onCheckedChange={setOptTransferVariants}
                />
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Additionner les quantités</div>
                    <div className="text-xs text-muted-foreground">
                      Les quantités en stock seront cumulées sur le produit conservé
                    </div>
                  </div>
                </div>
                <Switch
                  checked={optAddQuantities}
                  onCheckedChange={setOptAddQuantities}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {mergePreview && (
            <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Résultat de la fusion
              </div>
              <div className="text-muted-foreground pl-5 space-y-0.5">
                <div>{mergePreview.sourcesCount} produit(s) sera/seront supprimé(s)</div>
                {optTransferVariants && mergePreview.variantsToTransfer > 0 && (
                  <div className="text-orange-600">
                    +{mergePreview.variantsToTransfer} variante(s) transférée(s)
                  </div>
                )}
                {optAddQuantities && mergePreview.quantityToAdd > 0 && (
                  <div className="text-orange-600">
                    +{mergePreview.quantityToAdd} unité(s) ajoutée(s) au stock
                  </div>
                )}
                {!optTransferVariants && !optAddQuantities && (
                  <div className="text-amber-600">
                    Les variantes et quantités des doublons seront perdues
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeGroup(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {merging ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Merge className="h-4 w-4 mr-2" />
              )}
              Fusionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
