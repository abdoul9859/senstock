import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShoppingBag, Trash2, Tag, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { QuantityPicker } from "./components/QuantityPicker";
import { PriceDisplay } from "./components/PriceDisplay";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, discount, total, promo, removeItem, updateQuantity, clearCart, setPromo } = useCart();
  const [promoCode, setPromoCode] = useState(promo?.code || "");
  const [promoLoading, setPromoLoading] = useState(false);

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch("/api/shop/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Code invalide");
        setPromo(null);
      } else {
        setPromo({ code: data.code, type: data.type, value: data.value, discount: data.discount });
        toast.success(`Code applique : ${data.label}`);
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setPromoLoading(false);
  }

  function removePromo() {
    setPromo(null);
    setPromoCode("");
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Votre panier est vide</h2>
        <p className="text-muted-foreground mt-2">Decouvrez nos produits et ajoutez-les au panier</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Voir les produits
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Panier <span className="text-muted-foreground font-normal text-lg">({itemCount})</span>
        </h1>
        <button onClick={clearCart} className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Vider le panier
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.cartKey}
              className="flex gap-4 rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-4 animate-list-item"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image ? (
                  <img
                    src={item.image.startsWith("http") ? item.image : `/uploads/${item.image}`}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div>
                  <Link to={`/shop/${item.slug}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                    {item.name}
                  </Link>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.variant}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <QuantityPicker value={item.quantity} onChange={(v) => updateQuantity(item.cartKey, v)} />
                  <div className="flex items-center gap-4">
                    <PriceDisplay amount={item.price * item.quantity} size="md" className="font-semibold text-foreground" />
                    <button onClick={() => removeItem(item.cartKey)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-foreground">Resume</h3>

            {/* Promo code */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                <Tag className="h-3 w-3" /> Code promo
              </label>
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  className="font-mono h-9 text-sm"
                />
                <button
                  onClick={validatePromo}
                  disabled={promoLoading || !promoCode.trim()}
                  className="shrink-0 rounded-[var(--shop-radius,0.5rem)] border border-border px-3 h-9 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
                >
                  OK
                </button>
              </div>
              {promo && (
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-emerald-600 font-medium">{promo.code} applique</span>
                  <button onClick={removePromo} className="text-destructive hover:underline">Retirer</button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <PriceDisplay amount={subtotal} size="sm" className="text-foreground" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Remise</span>
                  <span>-{discount.toLocaleString("fr-FR")} F</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <PriceDisplay amount={total} size="lg" className="text-foreground" />
              </div>
            </div>

            <button
              onClick={() => navigate("/shop/commande")}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Passer commande
              <ArrowRight className="h-4 w-4" />
            </button>

            <Link to="/shop" className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors">
              Continuer les achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
