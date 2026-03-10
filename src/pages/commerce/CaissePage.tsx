import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, DollarSign,
  CreditCard, Smartphone, Banknote, X, Printer, Clock,
  PlayCircle, StopCircle, ChevronRight, Hash, User,
  Receipt, Package, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + getEntrepotSettings().currency;
}

// ─── Types ───

interface Product {
  _id: string;
  name: string;
  brand: string;
  model: string;
  barcode: string;
  image: string;
  sellingPrice: number;
  quantity: number;
  hasVariants: boolean;
  variants: { _id: string; serialNumber: string; condition: string; price: number }[];
  category: { _id: string; name: string } | null;
}

interface CartItem {
  id: string; // unique key for cart
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
}

interface CashSession {
  id: string;
  number: string;
  openedAt: string;
  openingAmount: number;
  status: string;
  sales: Sale[];
}

interface Sale {
  id: string;
  number: string;
  total: number;
  paymentMethod: string;
  clientName: string;
  createdAt: string;
  items: { id: string; description: string; quantity: number; unitPrice: number; total: number }[];
}

// ─── Payment Methods ───

const PAYMENT_METHODS = [
  { id: "especes", label: "Especes", icon: Banknote },
  { id: "wave", label: "Wave", icon: Smartphone },
  { id: "om", label: "Orange Money", icon: Smartphone },
  { id: "carte", label: "Carte", icon: CreditCard },
];

// ─── Main Component ───

export default function CaissePage() {
  // Session state
  const [session, setSession] = useState<CashSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // POS state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [clientName, setClientName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [amountPaid, setAmountPaid] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Receipt / last sale
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Stats
  const [todayStats, setTodayStats] = useState<{ total: number; count: number } | null>(null);

  // Variant selection
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // ─── Load session on mount ───
  const loadSession = useCallback(async () => {
    try {
      setLoadingSession(true);
      const res = await fetch("/api/caisse/session/current", { headers: getHeaders() });
      const data = await res.json();
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/caisse/stats/today", { headers: getHeaders() });
      const data = await res.json();
      setTodayStats(data.today);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadSession();
    loadStats();
  }, [loadSession, loadStats]);

  // ─── Search products ───
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/caisse/products/search?q=${encodeURIComponent(q)}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // ─── Open session ───
  const handleOpenSession = async () => {
    try {
      const res = await fetch("/api/caisse/session/open", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ openingAmount: parseFloat(openingAmount) || 0 }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const data = await res.json();
      setSession({ ...data, sales: [] });
      setOpeningAmount("");
    } catch {
      alert("Erreur lors de l'ouverture de la caisse");
    }
  };

  // ─── Close session ───
  const handleCloseSession = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/caisse/session/${session.id}/close`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          closingAmount: parseFloat(closingAmount) || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      setSession(null);
      setShowCloseDialog(false);
      setClosingAmount("");
      setCart([]);
      loadStats();
    } catch {
      alert("Erreur lors de la cloture");
    }
  };

  // ─── Add to cart ───
  const addToCart = (product: Product, variant?: { _id: string; serialNumber: string; price: number }) => {
    const key = variant ? `${product._id}-${variant._id}` : product._id;
    const existing = cart.find((c) => c.id === key);

    if (variant) {
      // Variants are unique, don't increase qty
      if (existing) return;
      setCart((prev) => [
        ...prev,
        {
          id: key,
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          variantLabel: variant.serialNumber,
          unitPrice: variant.price,
          quantity: 1,
        },
      ]);
    } else {
      if (existing) {
        setCart((prev) =>
          prev.map((c) => (c.id === key ? { ...c, quantity: c.quantity + 1 } : c))
        );
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: key,
            productId: product._id,
            name: product.name,
            unitPrice: product.sellingPrice,
            quantity: 1,
          },
        ]);
      }
    }
    setSearchQuery("");
    setSearchResults([]);
    setVariantProduct(null);
    searchRef.current?.focus();
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  // ─── Totals ───
  const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const paidNum = parseFloat(amountPaid) || 0;
  const change = paymentMethod === "especes" ? Math.max(0, paidNum - total) : 0;

  // ─── Submit sale ───
  const handleSubmitSale = async () => {
    if (!session || cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/caisse/sales", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          sessionId: session.id,
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            variantLabel: c.variantLabel,
            unitPrice: c.unitPrice,
            quantity: c.quantity,
          })),
          clientName,
          paymentMethod,
          amountPaid: paymentMethod === "especes" ? paidNum : total,
          discount,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        setProcessing(false);
        return;
      }
      const sale = await res.json();
      setLastSale(sale);
      setShowReceipt(true);

      // Reset
      setCart([]);
      setDiscount(0);
      setClientName("");
      setAmountPaid("");
      setPaymentMethod("especes");
      setShowPayment(false);

      // Reload session data
      loadSession();
      loadStats();
    } catch {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setProcessing(false);
    }
  };

  // ─── Loading state ───
  if (loadingSession) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement de la caisse...</div>
      </div>
    );
  }

  // ─── No session open → Open session screen ───
  if (!session) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PlayCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ouvrir la caisse</h1>
          <p className="text-sm text-muted-foreground">
            Entrez le montant du fond de caisse pour demarrer la session.
          </p>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Fond de caisse (FCFA)"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="text-center text-lg"
              aria-label="Montant du fond de caisse"
            />
            <Button onClick={handleOpenSession} className="w-full" size="lg">
              <PlayCircle className="mr-2 h-5 w-5" />
              Ouvrir la caisse
            </Button>
          </div>
          {todayStats && todayStats.count > 0 && (
            <p className="text-xs text-muted-foreground">
              Aujourd'hui : {todayStats.count} ventes — {formatFCFA(todayStats.total)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Session summary (for close dialog) ───
  const sessionSalesTotal = session.sales?.reduce((s, sale) => s + sale.total, 0) || 0;
  const sessionSalesCount = session.sales?.length || 0;
  const expectedClosing = session.openingAmount + sessionSalesTotal;

  // ─── Main POS Interface ───
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* LEFT: Product search + results */}
      <div className="flex flex-1 flex-col border-r border-border">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-foreground">{session.number}</span>
            <span>— Fond : {formatFCFA(session.openingAmount)}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {sessionSalesCount} vente{sessionSalesCount !== 1 ? "s" : ""} — {formatFCFA(sessionSalesTotal)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={() => setShowCloseDialog(true)}
            >
              <StopCircle className="mr-1 h-4 w-4" />
              Cloturer
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative border-b border-border bg-card px-4 py-3" role="search">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="Rechercher un produit (nom, code-barres, marque)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            autoFocus
            aria-label="Rechercher un produit"
          />
          {searching && (
            <div className="absolute right-7 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        {/* Search results / empty state */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((p) => (
                <button
                  key={p._id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                  onClick={() => {
                    if (p.hasVariants && p.variants.length > 0) {
                      setVariantProduct(p);
                    } else if (!p.hasVariants && p.quantity <= 0) {
                      // Out of stock
                    } else {
                      addToCart(p);
                    }
                  }}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.brand} {p.model}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">
                        {formatFCFA(p.sellingPrice)}
                      </span>
                      {p.hasVariants ? (
                        <span className="text-xs text-muted-foreground">
                          {p.variants.length} dispo
                        </span>
                      ) : (
                        <span className={`text-xs ${p.quantity <= 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          Qte: {p.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !searching ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Aucun produit trouve pour "{searchQuery}"</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">Recherchez un produit pour l'ajouter au panier</p>
              <p className="mt-1 text-xs">Scannez un code-barres ou tapez le nom du produit</p>
            </div>
          )}
        </div>

        {/* Recent sales (bottom) */}
        {session.sales && session.sales.length > 0 && !searchQuery && (
          <div className="border-t border-border bg-card">
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground">Ventes recentes</p>
            </div>
            <div className="max-h-32 overflow-y-auto px-4 pb-2">
              {session.sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{sale.number}</span>
                    {sale.clientName && (
                      <span className="text-xs text-muted-foreground">— {sale.clientName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{sale.paymentMethod}</span>
                    <span className="font-medium">{formatFCFA(sale.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Cart + payment */}
      <div className="flex w-[420px] flex-col bg-card">
        {/* Cart header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">Panier</h2>
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {cart.length}
          </span>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-red-500 hover:text-red-600"
              onClick={() => setCart([])}
            >
              Vider
            </Button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Panier vide
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-border p-2 animate-slide-in-right"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    {item.variantLabel && (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-primary">{formatFCFA(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQty(item.id, 1)}
                      disabled={!!item.variantId}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right text-sm font-bold">
                    {formatFCFA(item.unitPrice * item.quantity)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer: totals + payment */}
        {cart.length > 0 && (
          <div className="border-t border-border px-4 py-3 space-y-3">
            {/* Client name (optional) */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom du client (optionnel)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Remise</span>
              <Input
                type="number"
                className="h-7 w-28 text-right text-sm ml-auto"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">{formatFCFA(total)}</span>
            </div>

            {!showPayment ? (
              <Button className="w-full" size="lg" onClick={() => setShowPayment(true)}>
                <DollarSign className="mr-2 h-5 w-5" />
                Encaisser {formatFCFA(total)}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-background">
                {/* Payment method selection */}
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                        paymentMethod === m.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Amount paid (for cash) */}
                {paymentMethod === "especes" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Recu</span>
                      <Input
                        type="number"
                        className="h-8 text-right text-sm ml-auto w-32"
                        placeholder={String(total)}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {paidNum > 0 && paidNum >= total && (
                      <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm">
                        <span className="text-emerald-600">Rendu monnaie</span>
                        <span className="font-bold text-emerald-600">{formatFCFA(change)}</span>
                      </div>
                    )}
                    {/* Quick amount buttons */}
                    <div className="flex gap-1.5">
                      {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000]
                        .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
                        .slice(0, 4)
                        .map((v) => (
                          <button
                            key={v}
                            className="flex-1 rounded-md border border-border py-1 text-xs hover:bg-muted transition-colors"
                            onClick={() => setAmountPaid(String(v))}
                          >
                            {formatFCFA(v)}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPayment(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={
                      processing ||
                      (paymentMethod === "especes" && paidNum > 0 && paidNum < total)
                    }
                    onClick={handleSubmitSale}
                  >
                    {processing ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Valider
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Variant selection modal ─── */}
      {variantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setVariantProduct(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">{variantProduct.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setVariantProduct(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Selectionnez un article ({variantProduct.variants.length} disponible{variantProduct.variants.length !== 1 ? "s" : ""})
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {variantProduct.variants.map((v) => (
                <button
                  key={v._id}
                  className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors"
                  onClick={() => addToCart(variantProduct, v)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.serialNumber}</p>
                    <p className="text-xs text-muted-foreground">{v.condition}</p>
                  </div>
                  <span className="font-bold text-primary">{formatFCFA(v.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt modal ─── */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReceipt(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Receipt className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Vente enregistree !</h3>
              <p className="font-mono text-sm text-muted-foreground">{lastSale.number}</p>
            </div>
            <div className="space-y-2 border-y border-dashed border-border py-3 mb-3">
              {lastSale.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.description}
                  </span>
                  <span className="font-medium">{formatFCFA(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-lg font-bold mb-4">
              <span>Total</span>
              <span className="text-primary">{formatFCFA(lastSale.total)}</span>
            </div>
            {lastSale.paymentMethod === "especes" && (lastSale as any).changeGiven > 0 && (
              <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-3 py-2 mb-4 text-sm">
                <span className="text-emerald-600">Rendu monnaie</span>
                <span className="font-bold text-emerald-600">
                  {formatFCFA((lastSale as any).changeGiven)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>
                Fermer
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Close session dialog ─── */}
      {showCloseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCloseDialog(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Cloturer la caisse</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCloseDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fond de caisse</span>
                <span>{formatFCFA(session.openingAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ventes ({sessionSalesCount})</span>
                <span className="text-emerald-500">+{formatFCFA(sessionSalesTotal)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span>Montant attendu</span>
                <span className="text-primary">{formatFCFA(expectedClosing)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Montant reel en caisse</label>
                <Input
                  type="number"
                  placeholder={String(expectedClosing)}
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="mt-1"
                />
                {closingAmount && parseFloat(closingAmount) !== expectedClosing && (
                  <p className="mt-1 text-xs text-amber-500">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    Ecart de {formatFCFA(Math.abs(parseFloat(closingAmount) - expectedClosing))}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCloseDialog(false)}>
                  Annuler
                </Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600" onClick={handleCloseSession}>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Cloturer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
