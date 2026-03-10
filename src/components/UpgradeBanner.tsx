import { useState } from "react";
import { ArrowRight, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UPGRADE_BANNERS, PlanType } from "@/config/planPermissions";

interface UpgradeBannerProps {
  className?: string;
}

const PLAN_PRICES: Record<string, string> = {
  revendeur: "9 900",
  premium: "19 900",
  entreprise: "99 900",
};

export default function UpgradeBanner({ className = "" }: UpgradeBannerProps) {
  const { tenant } = useAuth();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentPlan = (tenant?.plan || "essai") as PlanType;

  // Don't show if enterprise (top plan)
  if (currentPlan === "entreprise") return null;

  // Get banners for current plan
  const banners = UPGRADE_BANNERS.filter((b) => b.fromPlan === currentPlan);
  if (banners.length === 0) return null;

  // Pick a random banner (but consistent per session)
  const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % banners.length; // changes hourly
  const banner = banners[idx];

  if (dismissed === banner.title) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    const token = localStorage.getItem("mbayestock_token");
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: banner.targetPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        window.location.reload();
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div
      className={`relative rounded-lg border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 ${className}`}
    >
      <button
        onClick={() => setDismissed(banner.title)}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted/50 text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-4 pr-6">
        <div className="shrink-0 rounded-full bg-primary/10 p-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-semibold text-sm">{banner.title}</h4>
            {banner.highlight && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                {banner.highlight}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{banner.description}</p>
        </div>
        <Button
          size="sm"
          onClick={handleUpgrade}
          disabled={loading}
          className="shrink-0 gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              {banner.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {PLAN_PRICES[banner.targetPlan] && (
        <p className="text-[10px] text-muted-foreground mt-2 ml-12">
          A partir de {PLAN_PRICES[banner.targetPlan]} FCFA/mois · 14 jours d'essai gratuit
        </p>
      )}
    </div>
  );
}
