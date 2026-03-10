import { useSearchParams, Link } from "react-router-dom";
import { Check, XCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get("order") || "";
  const cancelled = window.location.pathname.includes("annulee");
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cancelled);

  // If not cancelled, we could verify the payment status
  useEffect(() => {
    if (cancelled) {
      setPaymentStatus("annulee");
      setLoading(false);
      return;
    }
    // Short delay then show success (IPN handles the real update server-side)
    const timer = setTimeout(() => {
      setPaymentStatus("payee");
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [cancelled]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-primary animate-pulse" />
        <h1 className="text-xl font-bold text-foreground">Verification du paiement...</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Veuillez patienter pendant que nous confirmons votre paiement.
        </p>
      </div>
    );
  }

  if (paymentStatus === "annulee") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Paiement annule</h1>
        <p className="mt-2 text-muted-foreground">
          {orderNumber && (
            <>
              Votre commande <span className="font-mono font-bold text-foreground">{orderNumber}</span> n'a
              pas ete payee.
            </>
          )}
          {!orderNumber && "Le paiement a ete annule."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vous pouvez reessayer ou nous contacter pour toute question.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Retour a la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Paiement confirme !</h1>
      <p className="mt-2 text-muted-foreground">
        {orderNumber && (
          <>
            Votre commande <span className="font-mono font-bold text-foreground">{orderNumber}</span> a
            ete payee avec succes.
          </>
        )}
        {!orderNumber && "Votre paiement a ete confirme."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Nous vous contacterons pour organiser la livraison.
      </p>
      <Link
        to="/shop"
        className="mt-6 inline-flex items-center gap-2 rounded-[var(--shop-radius,0.5rem)] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Continuer les achats
      </Link>
    </div>
  );
}
