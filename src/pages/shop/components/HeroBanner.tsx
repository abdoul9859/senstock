import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

export function HeroBanner() {
  const { settings } = useShopSettings();
  const { hero } = settings;

  if (!hero.enabled) return null;

  return (
    <section className="relative overflow-hidden bg-muted/40">
      {hero.image ? (
        /* With background image */
        <div className="relative min-h-[400px] sm:min-h-[500px] flex items-center">
          <img
            src={hero.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-20">
            <h1 className="text-3xl sm:text-5xl font-bold text-white max-w-2xl leading-tight">
              {hero.title}
            </h1>
            {hero.subtitle && (
              <p className="mt-4 text-lg text-white/80 max-w-xl">{hero.subtitle}</p>
            )}
            {hero.ctaText && (
              <Link
                to={hero.ctaLink || "/shop"}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-gray-100 transition-colors"
              >
                {hero.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Without background image — gradient */
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground max-w-2xl leading-tight">
            {hero.title}
          </h1>
          {hero.subtitle && (
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">{hero.subtitle}</p>
          )}
          {hero.ctaText && (
            <Link
              to={hero.ctaLink || "/shop"}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            >
              {hero.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
