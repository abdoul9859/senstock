import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingBag, Check, X, Package, Star, Truck, ShieldCheck,
  ChevronRight, Share2, Heart, CheckCircle2, Tag,
} from "lucide-react";
import { BreadcrumbNav } from "./components/BreadcrumbNav";
import { ImageGallery } from "./components/ImageGallery";
import { QuantityPicker } from "./components/QuantityPicker";
import { PriceDisplay } from "./components/PriceDisplay";
import { ProductGrid } from "./components/ProductGrid";
import { useCart } from "@/hooks/useCart";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

interface Variant {
  _id: string;
  serialNumber: string;
  condition: string;
  price: number;
}

interface ProductDetail {
  _id: string;
  name: string;
  brand: string;
  model: string;
  slug: string;
  image: string;
  images: string[];
  description: string;
  price: number;
  minPrice: number | null;
  maxPrice: number | null;
  tags: string[];
  highlights: string[];
  attributes: Record<string, string>;
  seoTitle: string;
  seoDescription: string;
  category: { _id: string; name: string } | null;
  featured: boolean;
  inStock: boolean;
  quantity: number | null;
  variants: Variant[];
  hasVariants: boolean;
}

interface RelatedProduct {
  _id: string;
  name: string;
  brand?: string;
  model?: string;
  slug: string;
  image?: string;
  images?: string[];
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  tags?: string[];
  category?: { _id: string; name: string };
  featured?: boolean;
  inStock?: boolean;
  quantity?: number | null;
  availableVariants?: number | null;
}

const conditionLabels: Record<string, string> = {
  neuf: "Neuf",
  venant: "Venant",
  occasion: "Occasion",
};

type DetailTab = "description" | "attributes" | "shipping";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { settings } = useShopSettings();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<DetailTab>("description");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setQuantity(1);
      setSelectedVariant("");
      setActiveTab("description");
      try {
        const res = await fetch(`/api/shop/products/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
          if (data.variants?.length > 0) {
            setSelectedVariant(data.variants[0]._id);
          }
          // SEO meta tags
          if (data.seoTitle || data.name) {
            document.title = data.seoTitle || data.name;
          }
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && (data.seoDescription || data.description)) {
            metaDesc.setAttribute("content", (data.seoDescription || data.description).slice(0, 160));
          }
          try {
            const relRes = await fetch(`/api/shop/products/${slug}/related`);
            if (relRes.ok) setRelated(await relRes.json());
          } catch {}
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [slug]);

  function handleAddToCart() {
    if (!product) return;
    const variant = product.hasVariants
      ? product.variants.find((v) => v._id === selectedVariant)
      : null;
    if (product.hasVariants && !variant) {
      toast.error("Veuillez selectionner une variante");
      return;
    }
    addItem({
      productId: product._id,
      name: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      price: variant?.price || product.price,
      image: product.image || product.images?.[0] || "",
      slug: product.slug,
      variant: variant?.serialNumber || undefined,
      quantity: product.hasVariants ? 1 : quantity,
    });
    toast.success("Ajoute au panier");
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copie");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">Produit introuvable</h2>
        <Link to="/shop" className="text-primary hover:underline mt-2 inline-block">
          Retour a la boutique
        </Link>
      </div>
    );
  }

  const selectedVar = product.variants.find((v) => v._id === selectedVariant);
  const displayPrice = selectedVar?.price || product.price;
  const allImages = [product.image, ...(product.images || [])].filter(Boolean);
  const fullName = [product.name, product.brand, product.model].filter(Boolean).join(" ");
  const hasAttributes = product.attributes && Object.keys(product.attributes).length > 0;
  const hasHighlights = product.highlights && product.highlights.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 animate-fade-in">
      <BreadcrumbNav
        crumbs={[
          { label: "Boutique", to: "/shop" },
          ...(product.category ? [{ label: product.category.name, to: `/shop?category=${product.category._id}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Images */}
        <ImageGallery images={allImages} alt={fullName} />

        {/* Product info */}
        <div className="space-y-5 animate-slide-in-right">
          {/* Category + badges */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {product.category && (
                <Link
                  to={`/shop?category=${product.category._id}`}
                  className="text-xs font-medium uppercase tracking-wider text-primary hover:underline"
                >
                  {product.category.name}
                </Link>
              )}
              {product.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Star className="h-3 w-3" /> Vedette
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">{fullName}</h1>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            {product.minPrice && product.maxPrice ? (
              <div className="flex items-baseline gap-1">
                <PriceDisplay amount={product.minPrice} size="xl" className="text-foreground" />
                <span className="text-lg text-muted-foreground">—</span>
                <PriceDisplay amount={product.maxPrice} size="xl" className="text-foreground" />
              </div>
            ) : (
              <PriceDisplay amount={displayPrice} size="xl" className="text-foreground" />
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2">
            {product.inStock ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">En stock</span>
                {product.quantity && product.quantity <= 5 && (
                  <span className="text-xs text-amber-600">— Plus que {product.quantity} en stock</span>
                )}
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Rupture de stock</span>
              </>
            )}
          </div>

          {/* Highlights */}
          {hasHighlights && (
            <div className="space-y-1.5">
              {product.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Variant selector */}
          {product.hasVariants && product.variants.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Choisir une variante ({product.variants.length} disponibles)
              </label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.serialNumber} — {conditionLabels[v.condition] || v.condition}
                      {v.price ? ` — ${v.price.toLocaleString("fr-FR")} F` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center gap-3">
            {!product.hasVariants && (
              <QuantityPicker value={quantity} onChange={setQuantity} />
            )}
            <button
              disabled={!product.inStock}
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              Ajouter au panier
            </button>
            <button
              onClick={handleShare}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--shop-radius,0.5rem)] border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
              title="Partager"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* WhatsApp order */}
          {settings.contact.whatsapp && (
            <a
              href={`https://wa.me/${settings.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, je suis interesse par: ${fullName} (${displayPrice.toLocaleString("fr-FR")} F)\n${window.location.href}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] border-2 border-emerald-500 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              Commander via WhatsApp
            </a>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2.5 rounded-[var(--shop-radius,0.5rem)] border border-border p-3">
              <Truck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs font-medium text-foreground block">Livraison</span>
                <span className="text-[10px] text-muted-foreground">
                  {settings.commerce.freeShippingThreshold > 0
                    ? `Gratuite des ${settings.commerce.freeShippingThreshold.toLocaleString("fr-FR")} F`
                    : "Disponible"
                  }
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-[var(--shop-radius,0.5rem)] border border-border p-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <span className="text-xs font-medium text-foreground block">Paiement</span>
                <span className="text-[10px] text-muted-foreground">Securise</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs section: Description / Attributes / Livraison */}
      <div className="mt-12 border-t border-border pt-8">
        <div className="flex gap-6 border-b border-border mb-6">
          {[
            { key: "description" as DetailTab, label: "Description" },
            ...(hasAttributes ? [{ key: "attributes" as DetailTab, label: "Caracteristiques" }] : []),
            { key: "shipping" as DetailTab, label: "Livraison" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Description tab */}
        {activeTab === "description" && (
          <div className="max-w-3xl">
            {product.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucune description disponible</p>
            )}
          </div>
        )}

        {/* Attributes tab */}
        {activeTab === "attributes" && hasAttributes && (
          <div className="max-w-2xl">
            <div className="rounded-[var(--shop-radius,0.5rem)] border border-border overflow-hidden">
              {Object.entries(product.attributes).map(([key, val], i) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 px-4 py-3 text-sm ${
                    i % 2 === 0 ? "bg-muted/30" : "bg-background"
                  }`}
                >
                  <span className="font-medium text-foreground w-1/3">{key}</span>
                  <span className="text-muted-foreground flex-1">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipping tab */}
        {activeTab === "shipping" && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground">Livraison</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {settings.commerce.defaultShipping > 0
                    ? `Frais de livraison : ${settings.commerce.defaultShipping.toLocaleString("fr-FR")} F`
                    : "Livraison gratuite"
                  }
                  {settings.commerce.freeShippingThreshold > 0 && settings.commerce.defaultShipping > 0 && (
                    <span className="block text-emerald-600 mt-1">
                      Gratuite a partir de {settings.commerce.freeShippingThreshold.toLocaleString("fr-FR")} F d'achat
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-foreground">Paiement securise</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Modes de paiement acceptes :{" "}
                  {[
                    settings.commerce.paymentMethods.cash_on_delivery && "Paiement a la livraison",
                    settings.commerce.paymentMethods.wave && "Wave",
                    settings.commerce.paymentMethods.orange_money && "Orange Money",
                    settings.commerce.paymentMethods.free_money && "Free Money",
                    settings.commerce.paymentMethods.card && "Carte bancaire",
                  ].filter(Boolean).join(", ") || "Paiement a la livraison"}
                </p>
              </div>
            </div>
            {settings.contact.whatsapp && (
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-primary mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-foreground">Questions ?</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Contactez-nous sur WhatsApp pour toute question
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Produits similaires</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
