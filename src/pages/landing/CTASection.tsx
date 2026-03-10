import { Link } from "react-router-dom";
import { ArrowRight, Boxes } from "lucide-react";
import { useScrollReveal } from "./useScrollReveal";

export default function CTASection() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>(0.2);

  return (
    <section className="relative py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/[0.02] px-8 py-16 text-center transition-all duration-700 sm:px-16 sm:py-20 ${
            revealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl animate-glow-pulse" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
            {/* Dotted ring */}
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/[0.06] animate-spin-slow" />
          </div>

          <div className="relative">
            {/* Icon */}
            <div
              className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-700 delay-200 ${
                revealed ? "opacity-100 scale-100" : "opacity-0 scale-75"
              }`}
            >
              <Boxes className="h-8 w-8 text-primary" />
            </div>

            <h2
              className={`text-3xl font-bold tracking-tight text-foreground transition-all duration-700 delay-300 sm:text-4xl lg:text-5xl ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Prêt à transformer
              <br />
              <span className="gradient-text">votre gestion ?</span>
            </h2>

            <p
              className={`mx-auto mt-5 max-w-xl text-lg text-muted-foreground transition-all duration-700 delay-400 ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Rejoignez des centaines d'entreprises qui ont déjà simplifié leur quotidien avec StockFlow.
              Commencez gratuitement en moins de 2 minutes.
            </p>

            <div
              className={`mt-10 flex flex-col items-center justify-center gap-4 transition-all duration-700 delay-500 sm:flex-row ${
                revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <Link
                to="/register"
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-primary px-10 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 sm:text-base"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
                <span className="relative">Créer mon compte gratuit</span>
                <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="#tarifs"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Comparer les plans
              </a>
            </div>

            <p
              className={`mt-6 text-xs text-muted-foreground transition-all duration-700 delay-[600ms] ${
                revealed ? "opacity-100" : "opacity-0"
              }`}
            >
              Aucune carte bancaire requise. Configuration en 2 minutes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
