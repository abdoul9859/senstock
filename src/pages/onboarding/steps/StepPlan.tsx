import { Check, Crown, Building2, Star, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanType } from "@/config/planPermissions";

interface StepPlanProps {
  selectedPlan: PlanType;
  onSelect: (plan: PlanType) => void;
  onNext: () => void;
  loading?: boolean;
}

const plans = [
  {
    id: "essai" as PlanType,
    name: "Essai Gratuit",
    price: "0",
    period: "FCFA / 14 jours",
    description: "Testez la plateforme sans engagement",
    icon: Star,
    features: [
      "50 produits max",
      "20 factures / mois",
      "1 utilisateur",
      "Modules Entrepot & Commerce",
      "500 Mo de stockage",
      "Export CSV",
    ],
  },
  {
    id: "revendeur" as PlanType,
    name: "Revendeur",
    price: "9 900",
    period: "FCFA / mois",
    description: "Pour les petits revendeurs qui demarrent",
    icon: ShoppingBag,
    trial: "14 jours d'essai gratuit",
    features: [
      "500 produits",
      "200 factures / mois",
      "3 utilisateurs",
      "Modules Entrepot & Commerce",
      "Export PDF & CSV",
      "2 Go de stockage",
    ],
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
    features: [
      "5 000 produits",
      "1 000 factures / mois",
      "10 utilisateurs",
      "Tous les 8 modules",
      "Boutique en ligne",
      "Pilotage & Taches Kanban",
      "Analytique avancee",
      "Export PDF & Excel",
      "Support prioritaire",
      "10 Go de stockage",
    ],
  },
  {
    id: "entreprise" as PlanType,
    name: "Entreprise",
    price: "99 900",
    period: "FCFA / mois",
    description: "Pour les grandes structures",
    icon: Building2,
    trial: "14 jours d'essai gratuit",
    features: [
      "Produits illimites",
      "Factures illimitees",
      "Utilisateurs illimites",
      "Tous les 8 modules",
      "Multi-tenant & API",
      "White-label",
      "Support dedie 24/7",
      "100 Go de stockage",
    ],
  },
];

export default function StepPlan({ selectedPlan, onSelect, onNext, loading }: StepPlanProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choisissez votre plan</h2>
        <p className="text-muted-foreground mt-2">
          Vous pourrez changer de plan a tout moment
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 relative ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-primary/50"
              } ${plan.popular ? "md:-mt-2 md:mb-2" : ""}`}
              onClick={() => onSelect(plan.id)}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  Populaire
                </Badge>
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
