import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  ShoppingBag,
  Truck,
  Smartphone,
  Banknote,
  CreditCard,
  Wallet,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import { PriceDisplay } from "./components/PriceDisplay";

const PAYMENT_OPTIONS = [
  { key: "cash_on_delivery", label: "Paiement a la livraison", icon: Truck, online: false },
  { key: "wave", label: "Wave", icon: Smartphone, online: true },
  { key: "orange_money", label: "Orange Money", icon: Wallet, online: true },
  { key: "free_money", label: "Free Money", icon: Smartphone, online: true },
  { key: "card", label: "Carte bancaire", icon: CreditCard, online: true },
] as const;

type Step = "info" | "payment" | "confirm";

export default function CheckoutPage() {
  const { settings } = useShopSettings();
  const { items, subtotal, discount, promo, total, clearCart } = useCart();
  const [step, setStep] = useState<Step>("info");
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    paymentMethod: "",
  });

  const shipping = settings.commerce.defaultShipping || 0;
  const freeThreshold = settings.commerce.freeShippingThreshold || 0;
  const actualShipping = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : shipping;
  const grandTotal = Math.max(0, total + actualShipping);

  // Build available payment methods from settings
  const availableMethods = PAYMENT_OPTIONS.filter(
    (m) => settings.commerce.paymentMethods[m.key as keyof typeof settings.commerce.paymentMethods]
  );

  // Default to first available method if none selected
  const selectedMethod = form.paymentMethod || availableMethods[0]?.key || "cash_on_delivery";

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function goToPayment() {
    if (!form.name.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Veuillez entrer votre telephone");
      return;
    }
    if (!form.paymentMethod && availableMethods.length > 0) {
      setForm((f) => ({ ...f, paymentMethod: availableMethods[0].key }));
    }
    setStep("payment");
  }

  function goToConfirm() {
    setStep("confirm");
  }

  async function handleSubmit() {
    if (items.length === 0) {
      toast.error("Panier vide");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create the order
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
          },
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            variant: i.variant,
          })),
          promoCode: promo?.code || "",
          paymentMethod: selectedMethod,
          notes: form.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      const data = await res.json();

      // 2) For online payments (Wave, OM, card…), redirect to PayDunya
      const isOnlinePayment = PAYMENT_OPTIONS.find(
        (m) => m.key === selectedMethod
      )?.online;

      if (isOnlinePayment && data._id) {
        const payRes = await fetch("/api/paydunya/create-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data._id }),
        });
        const payData = await payRes.json();

        if (payRes.ok && payData.url) {
          clearCart();
          window.location.href = payData.url;
          return;
        }
        // PayDunya not configured or error — fall back to normal confirmation
        console.warn("PayDunya unavailable, showing confirmation page");
      }

      // 3) Cash on delivery or PayDunya fallback → show confirmation
      setOrderNumber(data.number);
      clearCart();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la commande");
    }
    setSubmitting(false);
  }

  // ── Success page ──
  if (orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Commande confirmee !</h1>
        <p className="mt-2 text-muted-foreground">
          Votre commande <span className="font-mono font-bold text-foreground">{orderNumber}</span> a
          ete enregistree avec succes.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nous vous contacterons au <span className="font-medium text-foreground">{form.phone}</span> pour
          confirmer la livraison.
        </p>

        <div className="mt-6 rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total paye</span>
              <PriceDisplay amount={grandTotal} size="md" className="font-bold text-foreground" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paiement</span>
              <span className="text-foreground">
                {PAYMENT_OPTIONS.find((m) => m.key === selectedMethod)?.label || selectedMethod}
              </span>
            </div>
            {form.address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span className="text-foreground text-right max-w-[60%]">{form.address}</span>
              </div>
            )}
          </div>
        </div>

        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Continuer les achats
        </Link>
      </div>
    );
  }

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
        <h2 className="text-xl font-semibold text-foreground">Panier vide</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ajoutez des produits avant de commander</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Voir les produits
        </Link>
      </div>
    );
  }

  // ── Steps ──
  const steps: { key: Step; label: string }[] = [
    { key: "info", label: "Informations" },
    { key: "payment", label: "Paiement" },
    { key: "confirm", label: "Confirmation" },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        to="/shop/panier"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au panier
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-2">Finaliser la commande</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i < stepIdx) setStep(s.key);
              }}
              disabled={i > stepIdx}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === stepIdx
                  ? "bg-primary text-primary-foreground"
                  : i < stepIdx
                  ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border border-current/20">
                {i < stepIdx ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${i < stepIdx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Customer info */}
          {step === "info" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Vos informations</h2>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Nom complet <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Telephone <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+221 77 000 00 00"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <Input
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Adresse de livraison
                  </label>
                  <Textarea
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Adresse complete"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Notes (optionnel)
                  </label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Instructions speciales..."
                    rows={2}
                  />
                </div>
              </div>

              <button
                onClick={goToPayment}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Payment method */}
          {step === "payment" && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Mode de paiement</h2>

                {availableMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Paiement a la livraison uniquement
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableMethods.map((m) => {
                      const Icon = m.icon;
                      const isSelected = selectedMethod === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => updateField("paymentMethod", m.key)}
                          className={`flex items-center gap-3 rounded-[var(--shop-radius,0.5rem)] border p-4 text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:bg-muted/30"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{m.label}</div>
                          </div>
                          {isSelected && (
                            <Check className="ml-auto h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("info")}
                  className="flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </button>
                <button
                  onClick={goToConfirm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Verifier la commande
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && (
            <div className="space-y-5 animate-fade-in">
              {/* Customer summary */}
              <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">Vos informations</h2>
                  <button
                    onClick={() => setStep("info")}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom</span>
                    <p className="font-medium text-foreground">{form.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telephone</span>
                    <p className="font-medium text-foreground">{form.phone}</p>
                  </div>
                  {form.email && (
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium text-foreground">{form.email}</p>
                    </div>
                  )}
                  {form.address && (
                    <div>
                      <span className="text-muted-foreground">Adresse</span>
                      <p className="font-medium text-foreground">{form.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment summary */}
              <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">Paiement</h2>
                  <button
                    onClick={() => setStep("payment")}
                    className="text-xs text-primary hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const method = PAYMENT_OPTIONS.find((m) => m.key === selectedMethod);
                    const Icon = method?.icon || Banknote;
                    return (
                      <>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {method?.label || selectedMethod}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Items summary */}
              <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5">
                <h2 className="font-semibold text-foreground mb-3">
                  Articles ({items.reduce((s, i) => s + i.quantity, 0)})
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.cartKey} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.image ? (
                          <img
                            src={item.image.startsWith("http") ? item.image : `/uploads/${item.image}`}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground font-mono">{item.variant}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <PriceDisplay
                          amount={item.price * item.quantity}
                          size="sm"
                          className="font-medium text-foreground"
                        />
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {form.notes && (
                <div className="rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{form.notes}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("payment")}
                  className="flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirmer la commande
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-[var(--shop-radius,0.5rem)] border border-border bg-card p-5 space-y-4 animate-scale-in">
            <h3 className="font-semibold text-foreground">Recapitulatif</h3>

            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.cartKey} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {item.name}
                    {item.variant ? ` (${item.variant})` : ""}
                    {item.quantity > 1 ? ` x${item.quantity}` : ""}
                  </span>
                  <PriceDisplay
                    amount={item.price * item.quantity}
                    size="sm"
                    className="shrink-0 text-foreground"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <PriceDisplay amount={subtotal} size="sm" className="text-foreground" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Remise ({promo?.code})</span>
                  <span>-{discount.toLocaleString("fr-FR")}{settings.commerce.currency}</span>
                </div>
              )}
              {actualShipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <PriceDisplay amount={actualShipping} size="sm" className="text-foreground" />
                </div>
              )}
              {freeThreshold > 0 && subtotal < freeThreshold && shipping > 0 && (
                <p className="text-xs text-muted-foreground">
                  Livraison gratuite a partir de {freeThreshold.toLocaleString("fr-FR")}{settings.commerce.currency}
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-bold text-foreground">Total</span>
                <PriceDisplay amount={grandTotal} size="lg" className="text-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
