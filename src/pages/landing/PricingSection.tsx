import { Link } from "react-router-dom";
import { Check, X, Sparkles } from "lucide-react";
import { useStaggerReveal } from "./useScrollReveal";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  href: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Essai Gratuit",
    price: "0",
    period: "FCFA / 14 jours",
    description: "Decouvrez la plateforme sans engagement",
    features: [
      { text: "50 produits", included: true },
      { text: "20 factures / mois", included: true },
      { text: "1 utilisateur", included: true },
      { text: "Modules Entrepot & Commerce", included: true },
      { text: "500 Mo de stockage", included: true },
      { text: "Export CSV", included: true },
      { text: "Export PDF", included: false },
      { text: "Boutique en ligne", included: false },
      { text: "Personnel & Salaires", included: false },
      { text: "Analytique avancee", included: false },
    ],
    cta: "Commencer gratuitement",
    href: "/register?plan=essai",
  },
  {
    name: "Revendeur",
    price: "9 900",
    period: "FCFA / mois",
    description: "Ideal pour les petits commercants et revendeurs",
    features: [
      { text: "500 produits", included: true },
      { text: "200 factures / mois", included: true },
      { text: "3 utilisateurs", included: true },
      { text: "Modules Entrepot & Commerce", included: true },
      { text: "2 Go de stockage", included: true },
      { text: "Export CSV & PDF", included: true },
      { text: "Boutique en ligne", included: false },
      { text: "Personnel & Salaires", included: false },
      { text: "Analytique avancee", included: false },
      { text: "Pilotage & Taches", included: false },
    ],
    cta: "Demarrer a 9 900 FCFA",
    href: "/register?plan=revendeur",
  },
  {
    name: "Premium",
    price: "19 900",
    period: "FCFA / mois",
    description: "Pour les entreprises en pleine croissance",
    popular: true,
    features: [
      { text: "5 000 produits", included: true },
      { text: "1 000 factures / mois", included: true },
      { text: "10 utilisateurs", included: true },
      { text: "Tous les 8 modules", included: true },
      { text: "10 Go de stockage", included: true },
      { text: "Export CSV, PDF & Excel", included: true },
      { text: "Boutique en ligne", included: true },
      { text: "Personnel & Salaires", included: true },
      { text: "Banque & Tresorerie", included: true },
      { text: "Support prioritaire", included: true },
    ],
    cta: "Essai gratuit 14 jours",
    href: "/register?plan=premium",
  },
  {
    name: "Entreprise",
    price: "99 900",
    period: "FCFA / mois",
    description: "Pour les grandes structures et franchises",
    features: [
      { text: "Produits illimites", included: true },
      { text: "Factures illimitees", included: true },
      { text: "Utilisateurs illimites", included: true },
      { text: "Tous les 8 modules", included: true },
      { text: "100 Go de stockage", included: true },
      { text: "Export CSV, PDF & Excel", included: true },
      { text: "Multi-tenant & API", included: true },
      { text: "White-label", included: true },
      { text: "Support dedie 24/7", included: true },
    ],
    cta: "Contacter l'equipe",
    href: "/register?plan=entreprise",
  },
];

export default function PricingSection() {
  const { ref, revealed } = useStaggerReveal<HTMLDivElement>(0.05);

  return (
    <section id="tarifs" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.02] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6" ref={ref}>
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span
            className={`mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Tarifs
          </span>
          <h2
            className={`text-3xl font-bold tracking-tight text-foreground transition-all duration-700 delay-100 sm:text-4xl lg:text-5xl ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Des tarifs simples et{" "}
            <span className="text-primary">transparents</span>
          </h2>
          <p
            className={`mt-5 text-lg text-muted-foreground transition-all duration-700 delay-200 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Choisissez le plan adapté à la taille de votre entreprise. Changez à tout moment.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-1 lg:p-9 ${
                plan.popular
                  ? "border-primary/60 bg-card shadow-xl shadow-primary/10"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              } ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{ transitionDelay: revealed ? `${300 + i * 120}ms` : "0ms" }}
            >
              {/* Popular glow background */}
              {plan.popular && (
                <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl animate-glow-pulse" />
              )}

              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-px left-0 right-0 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-b-xl bg-primary px-5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30">
                    <Sparkles className="h-3 w-3" />
                    Le plus populaire
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div className={plan.popular ? "mt-4" : ""}>
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tracking-tight text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              {/* CTA */}
              <Link
                to={plan.href}
                className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
                    : "border border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {plan.cta}
              </Link>

              {/* Divider */}
              <div className="my-8 h-px bg-border/60" />

              {/* Features */}
              <ul className="flex-1 space-y-3.5">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    ) : (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
                        <X className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
