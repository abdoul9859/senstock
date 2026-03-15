import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Rocket,
  Gift,
  Users,
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import { useStaggerReveal } from "./useScrollReveal";

/* ------------------------------------------------------------------ */
/*  Countdown target: 1er septembre 2025                              */
/* ------------------------------------------------------------------ */
const LAUNCH_END = new Date("2025-09-01T00:00:00").getTime();

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

function getTimeLeft() {
  const diff = Math.max(0, LAUNCH_END - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/* ------------------------------------------------------------------ */
/*  Features included in the free launch                              */
/* ------------------------------------------------------------------ */
const launchFeatures = [
  "Tous les 8 modules sans restriction",
  "Produits illimites",
  "Factures illimitees",
  "Jusqu'a 10 utilisateurs",
  "Boutique en ligne incluse",
  "Export CSV, PDF & Excel",
  "Personnel & Salaires",
  "Banque & Tresorerie",
  "Analytique & Tableaux de bord",
  "Support par email",
];

/* ------------------------------------------------------------------ */
/*  What happens after launch period                                  */
/* ------------------------------------------------------------------ */
const afterLaunchPerks = [
  {
    icon: Gift,
    title: "Tarif early-adopter a vie",
    description: "Les inscrits pendant le lancement beneficieront d'une reduction de -50% sur tous les plans, a vie.",
  },
  {
    icon: Users,
    title: "Vos donnees preservees",
    description: "Tout votre historique, vos factures et votre inventaire restent intacts. Rien n'est perdu.",
  },
  {
    icon: Shield,
    title: "Aucune carte bancaire requise",
    description: "Inscrivez-vous et utilisez la plateforme sans aucune information de paiement.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function PricingSection() {
  const { ref, revealed } = useStaggerReveal<HTMLDivElement>(0.05);
  const countdown = useCountdown();

  return (
    <section id="tarifs" className="relative py-24 sm:py-32">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute -right-32 top-20 h-64 w-64 rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6" ref={ref}>
        {/* ---- Header ---- */}
        <div
          className={`mx-auto max-w-2xl text-center landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Rocket className="h-3.5 w-3.5" />
            Offre de lancement
          </span>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Gratuit pendant le{" "}
            <span className="text-primary">lancement</span>
          </h2>

          <p className="mt-5 text-lg text-muted-foreground">
            Profitez de l'acces complet a SenStock sans aucun frais.
            L'offre se termine le 1er septembre 2025.
          </p>
        </div>

        {/* ---- Countdown ---- */}
        <div
          className={`mt-12 landing-reveal-scale ${
            revealed ? "revealed" : ""
          }`}
          style={{ transitionDelay: revealed ? "300ms" : "0ms" }}
        >
          <div className="mx-auto flex max-w-lg items-center justify-center gap-3 sm:gap-4">
            <CountdownUnit value={countdown.days} label="Jours" />
            <span className="text-2xl font-bold text-muted-foreground/40 pb-5">:</span>
            <CountdownUnit value={countdown.hours} label="Heures" />
            <span className="text-2xl font-bold text-muted-foreground/40 pb-5">:</span>
            <CountdownUnit value={countdown.minutes} label="Minutes" />
            <span className="text-2xl font-bold text-muted-foreground/40 pb-5">:</span>
            <CountdownUnit value={countdown.seconds} label="Secondes" />
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Temps restant avant la fin de l'acces gratuit
          </p>
        </div>

        {/* ---- Main Card ---- */}
        <div
          className={`mt-12 overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/5 landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
          style={{ transitionDelay: revealed ? "500ms" : "0ms" }}
        >
          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />

          <div className="grid gap-0 lg:grid-cols-2">
            {/* Left: Price + CTA */}
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary w-fit">
                <Zap className="h-3 w-3" />
                Acces complet
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-6xl font-extrabold tracking-tight text-foreground sm:text-7xl">
                  0
                </span>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-foreground">FCFA</span>
                  <span className="text-sm text-muted-foreground">
                    jusqu'au 1er sept. 2025
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Aucune carte bancaire requise. Creez votre compte et
                commencez a gerer votre activite immediatement.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5"
                >
                  <Rocket className="h-4 w-4" />
                  Commencer gratuitement
                </Link>
                <span className="text-xs text-muted-foreground text-center sm:text-left">
                  Inscription en 30 secondes
                </span>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-3 border-t border-border/50 pt-6">
                <div className="flex -space-x-2">
                  {[
                    "bg-emerald-500",
                    "bg-blue-500",
                    "bg-amber-500",
                    "bg-purple-500",
                  ].map((color, i) => (
                    <div
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-[10px] font-bold text-white ring-2 ring-card`}
                    >
                      {["AM", "FS", "ND", "KB"][i]}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">+120 entreprises</span> inscrites
                  cette semaine
                </p>
              </div>
            </div>

            {/* Right: Features checklist */}
            <div className="border-t border-border/50 bg-muted/30 p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <h3 className="text-lg font-semibold text-foreground mb-6">
                Tout est inclus :
              </h3>
              <ul className="space-y-4">
                {launchFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ---- After Launch Perks ---- */}
        <div className="mt-16">
          <h3
            className={`text-center text-lg font-semibold text-foreground mb-8 landing-reveal-up ${
              revealed ? "revealed" : ""
            }`}
            style={{ transitionDelay: revealed ? "700ms" : "0ms" }}
          >
            Et apres le 1er septembre ?
          </h3>

          <div className="grid gap-5 sm:grid-cols-3">
            {afterLaunchPerks.map((perk, i) => (
              <div
                key={perk.title}
                className={`landing-reveal-scale group rounded-xl border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 ${
                  revealed ? "revealed" : ""
                }`}
                style={{ transitionDelay: revealed ? `${800 + i * 150}ms` : "0ms" }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <perk.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">
                  {perk.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown digit                                                   */
/* ------------------------------------------------------------------ */
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-border/60 bg-card shadow-lg sm:h-20 sm:w-20 sm:rounded-2xl">
        {/* Subtle glow */}
        <div className="absolute inset-0 rounded-xl bg-primary/[0.03] sm:rounded-2xl" />
        <span className="relative text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
