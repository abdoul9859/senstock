import { Link } from "react-router-dom";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/useCart";
import { QuantityPicker } from "./QuantityPicker";
import { PriceDisplay } from "./PriceDisplay";

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const { items, itemCount, subtotal, removeItem, updateQuantity } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md" side="right">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ShoppingBag className="h-5 w-5" />
            Panier ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Votre panier est vide</p>
            <Link
              to="/shop"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Continuer les achats
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.cartKey} className="flex gap-3 animate-slide-in-right">
                    {/* Image */}
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

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <h4 className="text-sm font-medium text-foreground line-clamp-1">
                          {item.name}
                        </h4>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {item.variant}
                          </p>
                        )}
                        <PriceDisplay amount={item.price} size="sm" className="text-primary font-semibold mt-1 block" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <QuantityPicker
                          value={item.quantity}
                          onChange={(v) => updateQuantity(item.cartKey, v)}
                        />
                        <button
                          onClick={() => removeItem(item.cartKey)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <PriceDisplay amount={subtotal} size="md" className="font-semibold text-foreground" />
              </div>
              <Link
                to="/shop/panier"
                className="flex w-full items-center justify-center rounded-[var(--shop-radius,0.5rem)] border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Voir le panier
              </Link>
              <Link
                to="/shop/commande"
                className="flex w-full items-center justify-center rounded-[var(--shop-radius,0.5rem)] bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Commander
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
