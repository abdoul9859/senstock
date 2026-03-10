import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Barcode, Truck, Users, X } from "lucide-react";

const TOKEN_KEY = "mbayestock_token";

interface ProductResult {
  _id: string;
  name: string;
  brand: string;
  model: string;
  image: string;
  category?: { name: string };
  supplier?: { name: string };
  sellingPrice?: number;
  archived: boolean;
}

interface VariantResult {
  _id: string;
  serialNumber: string;
  barcode: string;
  condition: string;
  sold: boolean;
  price?: number;
  productId: string;
  productName: string;
  productBrand: string;
  productImage: string;
  category: string;
}

interface SupplierResult {
  _id: string;
  name: string;
  phone: string;
  email: string;
}

interface ClientResult {
  _id: string;
  name: string;
  phone: string;
  email: string;
}

interface SearchResults {
  products: ProductResult[];
  variants: VariantResult[];
  suppliers: SupplierResult[];
  clients: ClientResult[];
}

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(true);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  }

  function clear() {
    setQuery("");
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  }

  const hasResults = results && (results.products.length > 0 || results.variants.length > 0 || results.suppliers.length > 0 || results.clients?.length > 0);
  const noResults = results && !hasResults && query.length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher produit, IMEI, code-barres, fournisseur..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (e.target.value.length >= 2) setOpen(true); }}
          onFocus={() => { if (results && query.length >= 2) setOpen(true); }}
          className="h-9 w-full rounded-md border border-border bg-muted/50 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-colors"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (hasResults || noResults) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
          {noResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun resultat pour "{query}"
            </div>
          )}

          {/* Products */}
          {results && results.products.length > 0 && (
            <div>
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                Produits ({results.products.length})
              </div>
              {results.products.map((p, i) => (
                <button
                  key={p._id}
                  onClick={() => handleSelect(`/entrepot/inventaire?product=${p._id}`)}
                  className="animate-list-item flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {p.image ? (
                    <img src={p.image} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name}
                      {p.archived && <span className="ml-1.5 text-xs text-muted-foreground">(archive)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[p.brand, p.model, p.category?.name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {p.sellingPrice != null && (
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {p.sellingPrice.toLocaleString("fr-FR")} F
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Variants */}
          {results && results.variants.length > 0 && (
            <div>
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                <Barcode className="h-3 w-3" />
                Variantes / IMEI ({results.variants.length})
              </div>
              {results.variants.map((v, i) => (
                <button
                  key={v._id}
                  onClick={() => handleSelect(`/entrepot/inventaire?product=${v.productId}`)}
                  className="animate-list-item flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {v.serialNumber}
                      {v.sold && <span className="ml-1.5 text-xs text-amber-500">(vendu)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.productName}{v.productBrand ? ` · ${v.productBrand}` : ""}{v.category ? ` · ${v.category}` : ""}
                    </p>
                  </div>
                  {v.barcode && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {v.barcode}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Suppliers */}
          {results && results.suppliers.length > 0 && (
            <div>
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                <Truck className="h-3 w-3" />
                Fournisseurs ({results.suppliers.length})
              </div>
              {results.suppliers.map((s, i) => (
                <button
                  key={s._id}
                  onClick={() => handleSelect(`/logistique/fournisseurs?q=${encodeURIComponent(s.name)}`)}
                  className="animate-list-item flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">{s.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[s.phone, s.email].filter(Boolean).join(" · ") || "Fournisseur"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Clients */}
          {results && results.clients?.length > 0 && (
            <div>
              <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Clients ({results.clients.length})
              </div>
              {results.clients.map((c, i) => (
                <button
                  key={c._id}
                  onClick={() => handleSelect(`/commerce/clients?q=${encodeURIComponent(c.name)}`)}
                  className="animate-list-item flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-blue-500">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "Client"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
