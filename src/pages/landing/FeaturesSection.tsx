import {
  Boxes,
  Receipt,
  Store,
  UserCog,
  Building2,
  BarChart3,
  Truck,
  ClipboardCheck,
  Check,
  type LucideIcon,
} from "lucide-react";
import { useStaggerReveal } from "./useScrollReveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  highlights: string[];
  /** Grid placement class for bento layout */
  className: string;
}

const features: Feature[] = [
  {
    icon: Boxes,
    title: "Entrepot",
    description:
      "Suivez votre inventaire en temps reel, gerez les mouvements de stock et gardez le controle total sur vos produits.",
    color: "142 70% 45%",
    highlights: [
      "Suivi en temps reel",
      "Codes-barres & scan",
      "Detection de doublons",
      "Alertes de stock bas",
    ],
    className: "lg:col-span-2",
  },
  {
    icon: Receipt,
    title: "Commerce",
    description:
      "Facturez, devisez et livrez en quelques clics. Gerez vos clients et suivez vos creances facilement.",
    color: "210 100% 52%",
    highlights: [
      "Factures & devis pro",
      "Bons de livraison",
      "Gestion des creances",
    ],
    className: "lg:col-span-2",
  },
  {
    icon: Store,
    title: "Boutique en ligne",
    description:
      "Lancez votre e-commerce avec catalogue, promotions et paiements integres.",
    color: "280 70% 55%",
    highlights: [
      "Catalogue en ligne",
      "Promotions & codes promo",
      "Paiements Stripe & Paydunya",
    ],
    className: "lg:col-span-2",
  },
  {
    icon: UserCog,
    title: "Personnel",
    description:
      "Gerez vos employes, salaires, conges et presences depuis une seule interface.",
    color: "38 92% 50%",
    highlights: ["Fiches employes", "Calcul de salaires", "Suivi des conges"],
    className: "",
  },
  {
    icon: Building2,
    title: "Banque",
    description:
      "Suivez vos comptes, transactions et effectuez vos rapprochements bancaires.",
    color: "340 75% 55%",
    highlights: ["Multi-comptes", "Virements internes", "Import CSV"],
    className: "",
  },
  {
    icon: BarChart3,
    title: "Analytique",
    description:
      "Tableaux de bord visuels pour piloter votre activite avec des donnees claires.",
    color: "170 80% 45%",
    highlights: [
      "Tendances mensuelles",
      "Rentabilite produit",
      "Objectifs de vente",
    ],
    className: "",
  },
  {
    icon: Truck,
    title: "Logistique",
    description:
      "Pilotez vos fournisseurs, commandes d'achat et livraisons entrantes.",
    color: "25 85% 55%",
    highlights: ["Gestion fournisseurs", "Bons de commande", "Suivi livraisons"],
    className: "",
  },
  {
    icon: ClipboardCheck,
    title: "Taches",
    description:
      "Organisez votre travail en equipe avec des tableaux Kanban et un calendrier integre.",
    color: "260 65% 55%",
    highlights: ["Kanban boards", "Calendrier", "Checklists & priorites"],
    className: "lg:col-span-2",
  },
];

export default function FeaturesSection() {
  const { ref, revealed } = useStaggerReveal<HTMLDivElement>(0.05);

  return (
    <section id="fonctionnalites" className="relative py-24 sm:py-32">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6" ref={ref}>
        {/* Header */}
        <div
          className={`mx-auto max-w-2xl text-center landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            8 modules integres
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Tout ce dont vous avez besoin,{" "}
            <span className="text-primary">au meme endroit</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Des modules puissants et interconnectes pour piloter chaque aspect
            de votre activite.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={i}
              parentRevealed={revealed}
            />
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
  // Alternate slide direction: even from left, odd from right
  const direction = index % 2 === 0 ? "landing-reveal-left" : "landing-reveal-right";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card hover:border-transparent hover:shadow-xl hover:shadow-black/10 ${feature.className} ${direction} ${
        parentRevealed ? "revealed" : ""
      }`}
      style={{
        transitionDelay: parentRevealed ? `${400 + index * 120}ms` : "0ms",
      }}
    >
      {/* Gradient border on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, hsl(${feature.color} / 0.15), transparent 60%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute left-0 top-0 h-[2px] w-0 transition-all duration-500 group-hover:w-full"
        style={{ background: `hsl(${feature.color})` }}
      />

      <div className="relative z-10 p-6">
        {/* Icon */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
            style={{
              background: `hsl(${feature.color} / 0.12)`,
              boxShadow: `0 0 0 0 hsl(${feature.color} / 0)`,
            }}
          >
            <feature.icon
              className="h-5 w-5"
              style={{ color: `hsl(${feature.color})` }}
            />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {feature.title}
          </h3>
        </div>

        {/* Description */}
        <p
          className="text-sm leading-relaxed text-muted-foreground mb-4"
        >
          {feature.description}
        </p>

        {/* Feature highlights */}
        <ul className="space-y-2">
          {feature.highlights.map((highlight) => (
            <li key={highlight} className="flex items-center gap-2.5 text-sm">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `hsl(${feature.color} / 0.12)` }}
              >
                <Check
                  className="h-3 w-3"
                  style={{ color: `hsl(${feature.color})` }}
                />
              </span>
              <span className="text-muted-foreground/90">{highlight}</span>
            </li>
          ))}
        </ul>

        {/* Explore link */}
        <div className="mt-5 flex items-center gap-1.5 text-xs font-medium opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1"
          style={{ color: `hsl(${feature.color})` }}
        >
          Explorer
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
