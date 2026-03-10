import {
  Boxes,
  Receipt,
  Store,
  UserCog,
  Building2,
  BarChart3,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useStaggerReveal } from "./useScrollReveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: Boxes,
    title: "Entrepôt",
    description:
      "Suivez votre inventaire en temps réel, gérez les mouvements de stock, générez des codes-barres et détectez les doublons.",
    color: "142 70% 45%",
  },
  {
    icon: Receipt,
    title: "Commerce",
    description:
      "Créez des factures, devis et bons de livraison professionnels. Gérez vos clients et suivez vos créances.",
    color: "210 100% 52%",
  },
  {
    icon: Store,
    title: "Boutique en ligne",
    description:
      "Lancez votre e-commerce avec catalogue, promotions et gestion des commandes intégrée.",
    color: "280 70% 55%",
  },
  {
    icon: UserCog,
    title: "Personnel",
    description:
      "Gérez vos employés, calculez les salaires et administrez les contrats depuis une interface centralisée.",
    color: "38 92% 50%",
  },
  {
    icon: Building2,
    title: "Banque",
    description:
      "Suivez vos comptes, transactions, virements et effectuez vos rapprochements bancaires.",
    color: "340 75% 55%",
  },
  {
    icon: BarChart3,
    title: "Analytique",
    description:
      "Analysez vos tendances, visualisez la répartition de vos données et suivez vos objectifs.",
    color: "170 80% 45%",
  },
  {
    icon: Truck,
    title: "Logistique",
    description:
      "Gérez vos fournisseurs, commandes d'achat, livraisons et planification d'approvisionnement.",
    color: "25 85% 55%",
  },
];

export default function FeaturesSection() {
  const { ref, revealed } = useStaggerReveal<HTMLDivElement>(0.05);

  return (
    <section id="fonctionnalites" className="relative py-24 sm:py-32">
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="scroll-reveal mx-auto max-w-2xl text-center" ref={ref}>
          <span
            className={`mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            7 modules
          </span>
          <h2
            className={`text-3xl font-bold tracking-tight text-foreground transition-all duration-700 delay-100 sm:text-4xl lg:text-5xl ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Tout ce dont vous avez besoin,{" "}
            <span className="text-primary">au même endroit</span>
          </h2>
          <p
            className={`mt-5 text-lg text-muted-foreground transition-all duration-700 delay-200 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Des modules puissants et interconnectés pour piloter chaque aspect de votre activité.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} parentRevealed={revealed} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  parentRevealed,
}: {
  feature: Feature;
  index: number;
  parentRevealed: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-7 transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${
        parentRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: parentRevealed ? `${300 + index * 80}ms` : "0ms" }}
    >
      {/* Hover glow background */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: `hsl(${feature.color} / 0.08)` }} />

      {/* Icon */}
      <div
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: `hsl(${feature.color} / 0.1)` }}
      >
        <feature.icon className="h-6 w-6" style={{ color: `hsl(${feature.color})` }} />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {feature.description}
      </p>

      {/* Arrow indicator */}
      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
        En savoir plus
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
