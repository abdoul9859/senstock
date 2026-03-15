import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Receipt,
  Store,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Rotating words                                                    */
/* ------------------------------------------------------------------ */
const WORDS = ["inventaire", "facturation", "equipe", "tresorerie", "boutique"];
const WORD_INTERVAL = 2800;

function useRotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), WORD_INTERVAL);
    return () => clearInterval(id);
  }, []);
  return { word: WORDS[index], index };
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                  */
/* ------------------------------------------------------------------ */
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }

    const timeout = setTimeout(
      () => (frame = requestAnimationFrame(animate)),
      600,
    );
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

/* ------------------------------------------------------------------ */
/*  Floating feature pills                                            */
/* ------------------------------------------------------------------ */
const PILLS = [
  { icon: Boxes, label: "Stock", x: "8%", y: "22%", delay: "0s" },
  { icon: Receipt, label: "Factures", x: "82%", y: "18%", delay: "1.5s" },
  { icon: Store, label: "Boutique", x: "88%", y: "62%", delay: "3s" },
  { icon: BarChart3, label: "Analytics", x: "5%", y: "68%", delay: "2s" },
];

/* ------------------------------------------------------------------ */
/*  Particle field                                                    */
/* ------------------------------------------------------------------ */
function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2,
        delay: `${Math.random() * 6}s`,
        duration: `${4 + Math.random() * 4}s`,
      })),
    [],
  );

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary/20 animate-float"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  const { word, index: wordIndex } = useRotatingWord();

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden landing-gradient-bg">
      {/* ---- Background layers ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial spotlight */}
        <div className="absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[160px]" />
        <div className="absolute -left-40 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-[120px] animate-float-slow" />
        <div className="absolute -right-40 top-20 h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[100px] animate-float" style={{ animationDelay: "3s" }} />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Rotating rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
          <div className="h-[600px] w-[600px] animate-spin-slow rounded-full border border-primary/[0.06]" />
          <div
            className="absolute inset-8 animate-spin-slow rounded-full border border-dashed border-primary/[0.04]"
            style={{ animationDirection: "reverse", animationDuration: "35s" }}
          />
          <div
            className="absolute inset-20 animate-spin-slow rounded-full border border-primary/[0.03]"
            style={{ animationDuration: "45s" }}
          />
        </div>

        {/* Particles */}
        <Particles />
      </div>

      {/* ---- Floating pills (desktop only) ---- */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {PILLS.map((pill) => (
          <div
            key={pill.label}
            className={`absolute animate-float transition-all duration-1000 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: pill.x,
              top: pill.y,
              animationDelay: pill.delay,
              transitionDelay: "1.2s",
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 shadow-lg">
              <pill.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground/80">
                {pill.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Content ---- */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-0">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div
            className={`mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-primary/[0.08] px-5 py-2.5 transition-all duration-700 ${
              loaded
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-4 scale-95"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary sm:text-sm">
              Lancement — Acces gratuit a tous les modules
            </span>
            <ArrowRight className="h-3 w-3 text-primary" />
          </div>

          {/* Heading */}
          <h1
            className={`text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground transition-all duration-700 delay-150 sm:text-5xl lg:text-7xl ${
              loaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            Gerez votre{" "}
            <span className="relative inline-block">
              <span
                key={word}
                className="gradient-text inline-block animate-word-in"
              >
                {word}
              </span>
            </span>
            <br className="hidden sm:block" />
            <span
              className={`transition-all duration-700 delay-300 ${
                loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              en toute simplicite
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground transition-all duration-700 delay-[400ms] sm:mt-8 sm:text-lg lg:text-xl ${
              loaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            SenStock centralise votre inventaire, vos ventes, vos employes et
            vos finances dans une seule application intuitive.{" "}
            <span className="text-foreground font-medium">
              100% gratuit pendant le lancement.
            </span>
          </p>

          {/* CTAs */}
          <div
            className={`mt-10 flex flex-col items-center justify-center gap-4 transition-all duration-700 delay-500 sm:mt-12 sm:flex-row sm:gap-5 ${
              loaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 sm:text-base"
            >
              {/* Shimmer */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
                style={{ backgroundSize: "200% 100%" }}
              />
              <Zap className="relative h-4 w-4" />
              <span className="relative">Commencer gratuitement</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <a
              href="#fonctionnalites"
              className="group inline-flex items-center gap-2.5 rounded-full border border-border/60 px-8 py-4 text-sm font-semibold text-foreground transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 sm:text-base"
            >
              Decouvrir les modules
            </a>
          </div>

          {/* Trust badges */}
          <div
            className={`mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground transition-all duration-700 delay-700 sm:gap-8 ${
              loaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Aucune carte bancaire
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Pret en 30 secondes
            </span>
            <span className="flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5 text-primary" />
              8 modules inclus
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className={`mx-auto mt-16 max-w-3xl transition-all duration-700 delay-[800ms] sm:mt-20 ${
            loaded
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <div className="glass-card flex flex-col items-center justify-center gap-8 rounded-2xl px-8 py-6 sm:flex-row sm:gap-0 sm:divide-x sm:divide-border/50 sm:px-4">
            {[
              { value: 500, suffix: "+", label: "Entreprises" },
              { value: 12000, suffix: "+", label: "Factures creees" },
              { value: 98, suffix: "%", label: "Satisfaction" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center px-8"
              >
                <span className="text-2xl font-bold text-foreground sm:text-3xl">
                  {loaded && (
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                    />
                  )}
                </span>
                <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Bottom fade to next section ---- */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
