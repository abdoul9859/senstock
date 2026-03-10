import { Lock, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_PROMOS, PlanType } from "@/config/planPermissions";

interface UpgradePromptProps {
  module: string;
}

const NEXT_PLAN: Record<string, { plan: PlanType; label: string; price: string }> = {
  essai: { plan: "premium", label: "Premium", price: "19 900 FCFA/mois" },
  revendeur: { plan: "premium", label: "Premium", price: "19 900 FCFA/mois" },
  premium: { plan: "entreprise", label: "Entreprise", price: "99 900 FCFA/mois" },
};

const PLAN_LABELS: Record<string, string> = {
  essai: "Essai Gratuit",
  premium: "Premium",
  revendeur: "Revendeur",
  entreprise: "Entreprise",
};

export default function UpgradePrompt({ module }: UpgradePromptProps) {
  const { tenant } = useAuth();
  const currentPlan = tenant?.plan || "essai";
  const next = NEXT_PLAN[currentPlan] || NEXT_PLAN.essai;
  const promo = MODULE_PROMOS[module];

  async function handleUpgrade() {
    const token = localStorage.getItem("senstock_token");
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: next.plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        window.location.reload();
      }
    } catch {}
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Lock className="h-8 w-8 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              {promo?.title || module}
            </h2>
            <p className="text-muted-foreground mt-2">
              {promo?.description || "Cette fonctionnalite necessite un plan superieur."}
            </p>
          </div>

          {promo?.features && (
            <div className="text-left mx-auto max-w-xs space-y-2">
              {promo.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              Plan actuel : {PLAN_LABELS[currentPlan] || currentPlan}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-primary text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {next.label}
            </Badge>
          </div>

          <div className="space-y-2">
            <Button onClick={handleUpgrade} size="lg" className="gap-2">
              Passer au plan {next.label}
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground">
              A partir de {next.price} · 14 jours d'essai gratuit
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
