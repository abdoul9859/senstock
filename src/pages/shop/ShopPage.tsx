import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowUpDown, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroBanner } from "./components/HeroBanner";
import { FeaturedProducts } from "./components/FeaturedProducts";
import { CategoryGrid } from "./components/CategoryGrid";
import { ProductGrid } from "./components/ProductGrid";
import { ProductCard } from "./components/ProductCard";

interface ShopProduct {
  _id: string;
  name: string;
  brand: string;
  model: string;
  slug: string;
  image: string;
  images: string[];
  description: string;
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  tags?: string[];
  category: { _id: string; name: string } | null;
  featured: boolean;
  inStock: boolean;
  availableVariants: number | null;
  quantity: number | null;
}

interface Category {
  _id: string;
  name: string;
  productCount?: number;
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [catFilter, setCatFilter] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/shop/products"),
          fetch("/api/shop/categories"),
        ]);
        if (prodRes.ok) setProducts(await prodRes.json());
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        }
      } catch {
        // keep empty
      }
      setLoading(false);
    }
    load();
  }, []);

  // Sync filters with URL
  useEffect(() => {
    const urlCat = searchParams.get("category");
    const urlSearch = searchParams.get("search");
    if (urlCat) setCatFilter(urlCat);
    if (urlSearch) setSearch(urlSearch);
  }, [searchParams]);

  function handleCatChange(val: string) {
    setCatFilter(val);
    if (val === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", val);
    }
    setSearchParams(searchParams, { replace: true });
  }

  // Filter & sort
  const filtered = products
    .filter((p) => {
      if (catFilter !== "all" && p.category?._id !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q) ||
          (p.model || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0; // newest = API default order
      }
    });

  const featured = products.filter((p) => p.featured && p.inStock);
  const newArrivals = products.filter((p) => p.inStock).slice(0, 8);
  const isFiltering = search || catFilter !== "all";

  // Count products per category
  const catsWithCount = categories.map((c) => ({
    ...c,
    productCount: products.filter((p) => p.category?._id === c._id).length,
  }));

  return (
    <div>
      {/* Hero — only on unfiltered view */}
      {!isFiltering && <div className="animate-fade-in"><HeroBanner /></div>}

      {/* Featured products */}
      {!isFiltering && featured.length > 0 && <FeaturedProducts products={featured} />}

      {/* Categories */}
      {!isFiltering && catsWithCount.length > 0 && <CategoryGrid categories={catsWithCount} />}

      {/* New Arrivals — only on unfiltered view */}
      {!isFiltering && newArrivals.length > 0 && (
        <section className="py-12 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Nouveautes</h2>
              </div>
              <Link
                to="/shop"
                onClick={() => { setSort("newest"); setCatFilter("all"); setSearch(""); }}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
              >
                Voir tout
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {newArrivals.map((p) => (
                <div key={p._id} className="animate-card">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All products section */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {isFiltering ? "Resultats" : "Tous les produits"}
              </h2>
              {isFiltering && (
                <p className="text-sm text-muted-foreground mt-1">
                  {filtered.length} produit{filtered.length !== 1 ? "s" : ""} trouve{filtered.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-background"
                />
              </div>

              {/* Category filter */}
              {categories.length > 0 && (
                <Select value={catFilter} onValueChange={handleCatChange}>
                  <SelectTrigger className="w-40 h-9">
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-40 h-9">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Plus recents</SelectItem>
                  <SelectItem value="price_asc">Prix croissant</SelectItem>
                  <SelectItem value="price_desc">Prix decroissant</SelectItem>
                  <SelectItem value="name">Nom A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ProductGrid products={filtered} loading={loading} />
        </div>
      </section>
    </div>
  );
}
