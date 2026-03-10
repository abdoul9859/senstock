import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Category {
  _id: string;
  name: string;
  productCount?: number;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Categories</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/shop?category=${cat._id}`}
              className="group flex items-center justify-between rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm animate-card"
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                {cat.productCount != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.productCount} produit{cat.productCount > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
