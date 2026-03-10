import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search,
  Package,
  Loader2,
  Globe,
  GlobeLock,
  Star,
  Pencil,
  Eye,
  ImagePlus,
  X,
  Plus,
  GripVertical,
  Tag,
  Sparkles,
  FileText,
  Settings2,
  Upload,
} from "lucide-react";

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  sellingPrice: number;
  quantity: number;
  category?: { _id: string; name: string; hasVariants?: boolean };
  variants?: { _id: string; sold: boolean; serialNumber: string; price?: number; condition: string; attributes?: Record<string, string> }[];
  published: boolean;
  slug: string;
  onlineDescription: string;
  onlineImages: string[];
  onlinePrice: number;
  onlineMinPrice: number | null;
  onlineMaxPrice: number | null;
  onlineTags: string[];
  onlineHighlights: string[];
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  archived: boolean;
  attributes: Record<string, string>;
}

interface EditForm {
  onlineDescription: string;
  onlineImages: string[];
  onlinePrice: string;
  onlineMinPrice: string;
  onlineMaxPrice: string;
  onlineTags: string[];
  onlineHighlights: string[];
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  attributes: Record<string, string>;
}

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newHighlight, setNewHighlight] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrVal, setNewAttrVal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    onlineDescription: "",
    onlineImages: [],
    onlinePrice: "",
    onlineMinPrice: "",
    onlineMaxPrice: "",
    onlineTags: [],
    onlineHighlights: [],
    seoTitle: "",
    seoDescription: "",
    featured: false,
    attributes: {},
  });
  const token = localStorage.getItem("mbayestock_token");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.filter((p: Product) => !p.archived));
      }
    } catch {
      toast.error("Erreur de chargement");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const togglePublish = async (product: Product) => {
    try {
      const res = await fetch(`/api/boutique/products/${product._id}/publish`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p._id === updated._id ? { ...p, published: updated.published, slug: updated.slug } : p))
      );
      toast.success(updated.published ? "Produit publie" : "Produit retire de la boutique");
    } catch {
      toast.error("Erreur");
    }
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    const attrs = typeof p.attributes === "object" && p.attributes ? p.attributes : {};
    setEditForm({
      onlineDescription: p.onlineDescription || "",
      onlineImages: p.onlineImages || [],
      onlinePrice: p.onlinePrice ? String(p.onlinePrice) : "",
      onlineMinPrice: p.onlineMinPrice ? String(p.onlineMinPrice) : "",
      onlineMaxPrice: p.onlineMaxPrice ? String(p.onlineMaxPrice) : "",
      onlineTags: p.onlineTags || [],
      onlineHighlights: p.onlineHighlights || [],
      seoTitle: p.seoTitle || "",
      seoDescription: p.seoDescription || "",
      featured: p.featured || false,
      attributes: attrs as Record<string, string>,
    });
    setNewTag("");
    setNewHighlight("");
    setNewAttrKey("");
    setNewAttrVal("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const newImages = [...editForm.onlineImages];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          newImages.push(data.url);
        } else {
          toast.error(`Erreur upload: ${files[i].name}`);
        }
      } catch {
        toast.error(`Erreur upload: ${files[i].name}`);
      }
    }
    setEditForm((f) => ({ ...f, onlineImages: newImages }));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setEditForm((f) => ({
      ...f,
      onlineImages: f.onlineImages.filter((_, i) => i !== index),
    }));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= editForm.onlineImages.length) return;
    const imgs = [...editForm.onlineImages];
    const [moved] = imgs.splice(from, 1);
    imgs.splice(to, 0, moved);
    setEditForm((f) => ({ ...f, onlineImages: imgs }));
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || editForm.onlineTags.includes(tag)) return;
    setEditForm((f) => ({ ...f, onlineTags: [...f.onlineTags, tag] }));
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setEditForm((f) => ({ ...f, onlineTags: f.onlineTags.filter((t) => t !== tag) }));
  };

  const addHighlight = () => {
    const h = newHighlight.trim();
    if (!h) return;
    setEditForm((f) => ({ ...f, onlineHighlights: [...f.onlineHighlights, h] }));
    setNewHighlight("");
  };

  const removeHighlight = (index: number) => {
    setEditForm((f) => ({
      ...f,
      onlineHighlights: f.onlineHighlights.filter((_, i) => i !== index),
    }));
  };

  const addAttribute = () => {
    const key = newAttrKey.trim();
    const val = newAttrVal.trim();
    if (!key || !val) return;
    setEditForm((f) => ({ ...f, attributes: { ...f.attributes, [key]: val } }));
    setNewAttrKey("");
    setNewAttrVal("");
  };

  const removeAttribute = (key: string) => {
    setEditForm((f) => {
      const { [key]: _, ...rest } = f.attributes;
      return { ...f, attributes: rest };
    });
  };

  const saveEdit = async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/boutique/products/${editProduct._id}/online-info`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          onlineDescription: editForm.onlineDescription,
          onlineImages: editForm.onlineImages,
          onlinePrice: editForm.onlinePrice ? Number(editForm.onlinePrice) : null,
          onlineMinPrice: editForm.onlineMinPrice ? Number(editForm.onlineMinPrice) : null,
          onlineMaxPrice: editForm.onlineMaxPrice ? Number(editForm.onlineMaxPrice) : null,
          onlineTags: editForm.onlineTags,
          onlineHighlights: editForm.onlineHighlights,
          seoTitle: editForm.seoTitle,
          seoDescription: editForm.seoDescription,
          featured: editForm.featured,
          attributes: editForm.attributes,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
      );
      toast.success("Informations mises a jour");
      setEditProduct(null);
    } catch {
      toast.error("Erreur de sauvegarde");
    }
    setSaving(false);
  };

  const getStock = (p: Product) => {
    if (p.category?.hasVariants) {
      return (p.variants || []).filter((v) => !v.sold).length;
    }
    return p.quantity || 0;
  };

  const filtered = products.filter((p) => {
    if (filter === "published" && !p.published) return false;
    if (filter === "unpublished" && p.published) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.model || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const publishedCount = products.filter((p) => p.published).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catalogue en ligne</h1>
        <p className="text-muted-foreground mt-1">
          Publiez des produits de votre inventaire sur la boutique en ligne
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{products.length}</div>
          <div className="text-sm text-muted-foreground">Produits totaux</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
          <div className="text-sm text-muted-foreground">Publies</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">
            {products.length - publishedCount}
          </div>
          <div className="text-sm text-muted-foreground">Non publies</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="published">Publies</SelectItem>
            <SelectItem value="unpublished">Non publies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold">Aucun produit trouve</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p._id}
              className={`rounded-lg border bg-card px-4 py-3 flex items-center gap-4 transition-colors ${
                p.published ? "border-green-500/30" : ""
              }`}
            >
              {/* Image */}
              {p.image ? (
                <img
                  src={p.image.startsWith("http") ? p.image : `/${p.image}`}
                  alt={p.name}
                  className="h-12 w-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{p.name}</span>
                  {p.featured && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  {(p.onlineImages?.length > 0 || p.onlineTags?.length > 0) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">enrichi</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {p.brand && <span>{p.brand}</span>}
                  {p.category && (
                    <>
                      <span>·</span>
                      <span>{p.category.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>Stock : {getStock(p)}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-sm text-right shrink-0">
                {p.onlineMinPrice && p.onlineMaxPrice ? (
                  <div className="font-medium">
                    {p.onlineMinPrice.toLocaleString("fr-FR")} - {p.onlineMaxPrice.toLocaleString("fr-FR")} F
                  </div>
                ) : (
                  <div className="font-medium">
                    {(p.onlinePrice || p.sellingPrice || 0).toLocaleString("fr-FR")} F
                  </div>
                )}
                {p.onlinePrice && p.onlinePrice !== p.sellingPrice && (
                  <div className="text-xs text-muted-foreground line-through">
                    {(p.sellingPrice || 0).toLocaleString("fr-FR")} F
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Modifier infos en ligne"
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {p.published && p.slug && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Voir sur la vitrine"
                    onClick={() => window.open(`/shop/${p.slug}`, "_blank")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-2 pl-2 border-l">
                  {p.published ? (
                    <Globe className="h-4 w-4 text-green-500" />
                  ) : (
                    <GlobeLock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={p.published}
                    onCheckedChange={() => togglePublish(p)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rich edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={(o) => !o && setEditProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editeur boutique — {editProduct?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="images" className="mt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="images" className="text-xs gap-1">
                <ImagePlus className="h-3.5 w-3.5" />
                Images
              </TabsTrigger>
              <TabsTrigger value="description" className="text-xs gap-1">
                <FileText className="h-3.5 w-3.5" />
                Description
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs gap-1">
                <Tag className="h-3.5 w-3.5" />
                Prix
              </TabsTrigger>
              <TabsTrigger value="attributes" className="text-xs gap-1">
                <Settings2 className="h-3.5 w-3.5" />
                Attributs
              </TabsTrigger>
              <TabsTrigger value="seo" className="text-xs gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                SEO
              </TabsTrigger>
            </TabsList>

            {/* ── Images Tab ── */}
            <TabsContent value="images" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium">Photos du produit</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Ajoutez jusqu'a 10 images. La premiere sera l'image principale.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {editForm.onlineImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative group rounded-lg border bg-muted overflow-hidden aspect-square"
                    >
                      <img
                        src={img.startsWith("http") ? img : img}
                        alt={`Image ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {i > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={() => moveImage(i, i - 1)}
                            title="Deplacer a gauche"
                          >
                            <GripVertical className="h-3.5 w-3.5 rotate-90" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                          onClick={() => removeImage(i)}
                          title="Supprimer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {i === 0 && (
                        <Badge className="absolute top-1 left-1 text-[10px] px-1.5 py-0">
                          Principale
                        </Badge>
                      )}
                    </div>
                  ))}
                  {editForm.onlineImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="rounded-lg border-2 border-dashed border-muted-foreground/30 aspect-square flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span className="text-[10px]">Ajouter</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </TabsContent>

            {/* ── Description Tab ── */}
            <TabsContent value="description" className="space-y-4 mt-4">
              <div>
                <Label>Description en ligne</Label>
                <Textarea
                  value={editForm.onlineDescription}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, onlineDescription: e.target.value }))
                  }
                  placeholder="Description detaillee visible sur la boutique en ligne..."
                  rows={8}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editForm.onlineDescription.length} caracteres
                </p>
              </div>

              {/* Highlights */}
              <div>
                <Label>Points forts</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Ajoutez les avantages cles du produit
                </p>
                <div className="space-y-2">
                  {editForm.onlineHighlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="flex-1 text-sm">{h}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeHighlight(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      placeholder="Ex: Garantie 2 ans"
                      className="text-sm"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHighlight())}
                    />
                    <Button variant="outline" size="sm" onClick={addHighlight} disabled={!newHighlight.trim()}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Mots-cles pour faciliter la recherche
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editForm.onlineTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajouter un tag..."
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Produit vedette</Label>
                  <p className="text-xs text-muted-foreground">
                    Mis en avant sur la vitrine
                  </p>
                </div>
                <Switch
                  checked={editForm.featured}
                  onCheckedChange={(v) => setEditForm((f) => ({ ...f, featured: v }))}
                />
              </div>
            </TabsContent>

            {/* ── Pricing Tab ── */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <span className="text-muted-foreground">Prix inventaire : </span>
                <strong>{(editProduct?.sellingPrice || 0).toLocaleString("fr-FR")} F</strong>
              </div>

              <div>
                <Label>Prix en ligne (F)</Label>
                <Input
                  type="number"
                  value={editForm.onlinePrice}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, onlinePrice: e.target.value }))
                  }
                  placeholder="Laissez vide pour utiliser le prix inventaire"
                  className="mt-1"
                />
              </div>

              <div className="border-t pt-4">
                <Label>Tranche de prix (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Pour les produits avec variantes a prix differents
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Prix minimum (F)</Label>
                    <Input
                      type="number"
                      value={editForm.onlineMinPrice}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, onlineMinPrice: e.target.value }))
                      }
                      placeholder="Ex: 15000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Prix maximum (F)</Label>
                    <Input
                      type="number"
                      value={editForm.onlineMaxPrice}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, onlineMaxPrice: e.target.value }))
                      }
                      placeholder="Ex: 45000"
                    />
                  </div>
                </div>
              </div>

              {/* Show variants if product has them */}
              {editProduct?.variants && editProduct.variants.length > 0 && (
                <div className="border-t pt-4">
                  <Label>Variantes disponibles</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {editProduct.variants.filter((v) => !v.sold).length} en stock sur {editProduct.variants.length} total
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {editProduct.variants.filter((v) => !v.sold).slice(0, 20).map((v) => (
                      <div key={v._id} className="flex items-center justify-between text-sm rounded-md border px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{v.serialNumber}</span>
                          <Badge variant="outline" className="text-[10px]">{v.condition}</Badge>
                        </div>
                        {v.price && (
                          <span className="text-muted-foreground">{v.price.toLocaleString("fr-FR")} F</span>
                        )}
                      </div>
                    ))}
                    {editProduct.variants.filter((v) => !v.sold).length > 20 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        +{editProduct.variants.filter((v) => !v.sold).length - 20} autres variantes
                      </p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Attributes Tab ── */}
            <TabsContent value="attributes" className="space-y-4 mt-4">
              <div>
                <Label>Attributs du produit</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Caracteristiques techniques affichees sur la fiche produit
                </p>
                <div className="space-y-2">
                  {Object.entries(editForm.attributes).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm">{key}</div>
                        <div className="rounded-md border bg-muted/50 px-3 py-1.5 text-sm">{val}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeAttribute(key)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={newAttrKey}
                        onChange={(e) => setNewAttrKey(e.target.value)}
                        placeholder="Nom (ex: Memoire)"
                        className="text-sm"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
                      />
                      <Input
                        value={newAttrVal}
                        onChange={(e) => setNewAttrVal(e.target.value)}
                        placeholder="Valeur (ex: 128 Go)"
                        className="text-sm"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={addAttribute}
                      disabled={!newAttrKey.trim() || !newAttrVal.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── SEO Tab ── */}
            <TabsContent value="seo" className="space-y-4 mt-4">
              <div>
                <Label>Titre SEO</Label>
                <Input
                  value={editForm.seoTitle}
                  onChange={(e) => setEditForm((f) => ({ ...f, seoTitle: e.target.value }))}
                  placeholder={editProduct?.name || "Titre pour les moteurs de recherche"}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editForm.seoTitle.length}/60 caracteres recommandes
                </p>
              </div>
              <div>
                <Label>Meta description</Label>
                <Textarea
                  value={editForm.seoDescription}
                  onChange={(e) => setEditForm((f) => ({ ...f, seoDescription: e.target.value }))}
                  placeholder="Description courte pour Google..."
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editForm.seoDescription.length}/160 caracteres recommandes
                </p>
              </div>

              {/* SEO Preview */}
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-2">Apercu Google</p>
                <div className="space-y-0.5">
                  <div className="text-blue-600 text-sm font-medium truncate">
                    {editForm.seoTitle || editProduct?.name || "Titre du produit"}
                  </div>
                  <div className="text-green-700 text-xs truncate">
                    votreboutique.com/shop/{editProduct?.slug || "produit"}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {editForm.seoDescription || editForm.onlineDescription.slice(0, 160) || "Description du produit..."}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Annuler
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
