import { ProductCard } from "./ProductCard";

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

function Skeleton() {
  return (
    <div className="animate-pulse rounded-[var(--shop-radius,0.5rem)] border border-border overflow-hidden">
      <div className="aspect-square bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-5 w-20 rounded bg-muted mt-2" />
      </div>
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">Aucun produit trouve</p>
        <p className="text-sm text-muted-foreground mt-1">Essayez de modifier vos filtres</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
