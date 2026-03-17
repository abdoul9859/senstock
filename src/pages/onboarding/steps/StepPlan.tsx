import { useEffect, useState } from "react";
import { Check, Rocket, Gift, Shield, Clock, Zap, Star, ShoppingBag, Crown, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanType, LAUNCH_END_DATE, isLaunchPeriod } from "@/config/planPermissions";

interface StepPlanProps {
  selectedPlan: PlanType;
  onSelect: (plan: PlanType) => void;
  onNext: () => void;
  loading?: boolean;
}

/* ---- Countdown ---- */
function getTimeLeft() {
  const diff = Math.max(0, LAUNCH_END_DATE.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm sm:h-16 sm:w-16">
        <span className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/* ---- Launch features ---- */
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

/* ---- Paid plans (shown after launch) ---- */
const paidPlans = [
  {
    id: "essai" as PlanType,
    name: "Essai Gratuit",
    price: "0",
    period: "FCFA / 14 jours",
    description: "Testez la plateforme sans engagement",
    icon: Star,
    features: ["50 produits max", "20 factures / mois", "1 utilisateur", "Modules Entrepot & Commerce", "500 Mo de stockage", "Export CSV"],
  },
  {
    id: "revendeur" as PlanType,
    name: "Revendeur",
    price: "9 900",
    period: "FCFA / mois",
    description: "Pour les petits revendeurs",
    icon: ShoppingBag,
    trial: "14 jours d'essai gratuit",
    features: ["500 produits", "200 factures / mois", "3 utilisateurs", "Modules Entrepot & Commerce", "Export PDF & CSV", "2 Go de stockage"],
  },
  {
    id: "premium" as PlanType,
    name: "Premium",
    price: "19 900",
    period: "FCFA / mois",
    description: "Pour les PME en croissance",
    icon: Crown,
    popular: true,
    trial: "14 jours d'essai gratuit",
    features: ["5 000 produits", "1 000 factures / mois", "10 utilisateurs", "Tous les 8 modules", "Boutique en ligne", "Support prioritaire", "10 Go de stockage"],
  },
  {
    id: "entreprise" as PlanType,
    name: "Entreprise",
    price: "99 900",
    period: "FCFA / mois",
    description: "Pour les grandes structures",
    icon: Building2,
    trial: "14 jours d'essai gratuit",
    features: ["Produits illimites", "Factures illimitees", "Utilisateurs illimites", "Multi-tenant & API", "White-label", "Support dedie 24/7", "100 Go de stockage"],
  },
];

export default function StepPlan({ selectedPlan, onSelect, onNext, loading }: StepPlanProps) {
  const launch = isLaunchPeriod();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    if (!launch) return;
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [launch]);

  // Auto-select "lancement" during launch period
  useEffect(() => {
    if (launch && selectedPlan !== "lancement") {
      onSelect("lancement");
    }
  }, [launch]);

  /* ---- LAUNCH PERIOD: show free offer ---- */
  if (launch) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Rocket className="h-3.5 w-3.5" />
            Offre de lancement
          </span>
          <h2 className="text-2xl font-bold mt-2">
            Profitez de SenStock <span className="text-primary">gratuitement</span>
          </h2>
          <p className="text-muted-foreground mt-2">
            Acces complet a toutes les fonctionnalites, sans aucun frais jusqu'au 1er septembre 2026.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <CountdownUnit value={timeLeft.days} label="Jours" />
          <span className="text-xl font-bold text-muted-foreground/40 pb-4">:</span>
          <CountdownUnit value={timeLeft.hours} label="Heures" />
          <span className="text-xl font-bold text-muted-foreground/40 pb-4">:</span>
          <CountdownUnit value={timeLeft.minutes} label="Min" />
          <span className="text-xl font-bold text-muted-foreground/40 pb-4">:</span>
          <CountdownUnit value={timeLeft.seconds} label="Sec" />
        </div>
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Clock className="h-3 w-3" />
          Temps restant avant la fin de l'acces gratuit
        </p>

        {/* Main card */}
        <div className="overflow-hidden rounded-xl border border-primary/30 bg-card shadow-lg">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />
          <div className="grid gap-0 md:grid-cols-2">
            {/* Left: price */}
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary w-fit">
                <Zap className="h-3 w-3" />
                Acces complet
              </div>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">0</span>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-foreground">FCFA</span>
                  <span className="text-sm text-muted-foreground">jusqu'au 1er sept. 2026</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune carte bancaire requise. Tous les modules sont deverrouilles.
              </p>

              {/* After launch perks */}
              <div className="mt-6 space-y-3 border-t border-border/50 pt-4">
                <div className="flex items-start gap-2.5">
                  <Gift className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Tarif early-adopter a vie</p>
                    <p className="text-xs text-muted-foreground">-50% sur tous les plans apres le lancement</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">Donnees preservees</p>
                    <p className="text-xs text-muted-foreground">Tout votre historique reste intact</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: features */}
            <div className="border-t border-border/50 bg-muted/30 p-6 sm:p-8 md:border-l md:border-t-0">
              <h3 className="text-sm font-semibold text-foreground mb-4">Tout est inclus :</h3>
              <ul className="space-y-2.5">
                {launchFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={loading} size="lg">
            {loading ? "Chargement..." : "Continuer"}
          </Button>
        </div>
      </div>
    );
  }

  /* ---- POST-LAUNCH: show paid plans ---- */
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choisissez votre plan</h2>
        <p className="text-muted-foreground mt-2">
          Vous pourrez changer de plan a tout moment
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {paidPlans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 relative ${
                isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50"
              } ${plan.popular ? "md:-mt-2 md:mb-2" : ""}`}
              onClick={() => onSelect(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Populaire</Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1 text-sm">{plan.period}</span>
                </div>
                {plan.trial && (
                  <Badge variant="outline" className="mt-2 text-xs text-primary border-primary/30">
                    {plan.trial}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={loading} size="lg">
          {loading ? "Chargement..." : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
