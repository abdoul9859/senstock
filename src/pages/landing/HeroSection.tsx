import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    // Small delay before starting
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <span>
      {count.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  return (
    <section className="relative overflow-hidden landing-gradient-bg">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large floating orbs */}
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[100px] animate-float-slow" />
        <div className="absolute -bottom-48 -right-32 h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[120px] animate-float" />
        <div className="absolute left-1/3 top-1/4 h-[300px] w-[300px] rounded-full bg-primary/[0.03] blur-[80px] animate-float-slow" style={{ animationDelay: "2s" }} />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Rotating ring decoration */}
        <div className="absolute right-[10%] top-[20%] hidden lg:block">
          <div className="h-72 w-72 animate-spin-slow rounded-full border border-primary/[0.08]" />
          <div className="absolute inset-4 animate-spin-slow rounded-full border border-dashed border-primary/[0.05]" style={{ animationDirection: "reverse", animationDuration: "35s" }} />
        </div>

        {/* Small floating dots */}
        <div className="absolute left-[15%] top-[30%] h-2 w-2 rounded-full bg-primary/30 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute left-[75%] top-[20%] h-1.5 w-1.5 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute left-[60%] top-[70%] h-2.5 w-2.5 rounded-full bg-primary/25 animate-float-slow" style={{ animationDelay: "3s" }} />
        <div className="absolute left-[25%] top-[65%] h-1.5 w-1.5 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:pb-32 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div
            className={`mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 transition-all duration-700 ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
          >
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </div>
            <span className="text-xs font-medium text-primary sm:text-sm">
              Nouveau — Essai gratuit 14 jours sur le plan Premium
            </span>
          </div>

          {/* Heading */}
          <h1
            className={`text-4xl font-bold leading-[1.1] tracking-tight text-foreground transition-all duration-700 delay-100 sm:text-5xl lg:text-7xl ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Gérez votre entreprise
            <br />
            <span className="gradient-text">en toute simplicité</span>
          </h1>

          {/* Subtitle */}
          <p
            className={`mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground transition-all duration-700 delay-200 sm:mt-8 sm:text-lg lg:text-xl ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            StockFlow centralise votre inventaire, vos ventes, vos employés et vos finances
            dans une seule application intuitive. Démarrez gratuitement, sans carte bancaire.
          </p>

          {/* CTAs */}
          <div
            className={`mt-10 flex flex-col items-center justify-center gap-4 transition-all duration-700 delay-300 sm:mt-12 sm:flex-row sm:gap-5 ${
              loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 sm:text-base"
            >
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              <span className="relative">Commencer gratuitement</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#fonctionnalites"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border/60 px-8 py-4 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 sm:text-base"
            >
              <Play className="h-4 w-4 text-primary" />
              Découvrir les modules
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className={`mx-auto mt-16 max-w-3xl transition-all duration-700 delay-500 sm:mt-20 ${
            loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="glass-card flex flex-col items-center justify-center gap-8 rounded-2xl px-8 py-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border/50 sm:px-4">
            {[
              { value: 500, suffix: "+", label: "Entreprises" },
              { value: 12000, suffix: "+", label: "Factures créées" },
              { value: 98, suffix: "%", label: "Satisfaction" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center px-8">
                <span className="text-2xl font-bold text-foreground sm:text-3xl">
                  {loaded && <AnimatedCounter target={stat.value} suffix={stat.suffix} />}
                </span>
                <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
