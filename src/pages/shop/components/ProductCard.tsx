import { Link } from "react-router-dom";
import { ShoppingBag, Star, Tag } from "lucide-react";
import { PriceDisplay } from "./PriceDisplay";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

interface Product {
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

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const img = product.images?.[0] || product.image;
  const hasVariants = product.availableVariants != null;
  const hasPriceRange = product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice;
  const tags = product.tags?.slice(0, 2) || [];

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    if (hasVariants) return;
    addItem({
      productId: product._id,
      name: [product.name, product.brand, product.model].filter(Boolean).join(" "),
      price: product.price,
      image: img || "",
      slug: product.slug,
    });
    toast.success("Ajoute au panier");
  }

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--shop-radius,0.5rem)] border border-border bg-card transition-all duration-300 hover:shadow-lg hover:border-primary/20 transition-transform duration-200 hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {img ? (
          <img
            src={img.startsWith("http") ? img : `/uploads/${img}`}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              <Star className="h-3 w-3" /> Vedette
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-full bg-destructive/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
              Rupture
            </span>
          )}
        </div>

        {/* Quick add button — only for simple products */}
        {product.inStock && !hasVariants && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110"
            title="Ajouter au panier"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">
            {product.category.name}
          </span>
        )}
        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {[product.name, product.brand, product.model].filter(Boolean).join(" ")}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          {hasPriceRange ? (
            <span className="font-bold text-foreground text-base">
              <PriceDisplay amount={product.minPrice!} size="md" className="font-bold text-foreground" />
              {" — "}
              <PriceDisplay amount={product.maxPrice!} size="md" className="font-bold text-foreground" />
            </span>
          ) : (
            <PriceDisplay amount={product.price} size="md" className="font-bold text-foreground" />
          )}
        </div>
      </div>
    </Link>
  );
}
