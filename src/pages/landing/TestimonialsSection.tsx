import { useStaggerReveal } from "./useScrollReveal";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "SenStock a transformé la gestion de mon magasin. Je sais exactement ce que j'ai en stock et mes factures sont prêtes en quelques clics.",
    name: "Aminata Diallo",
    role: "Gérante, Diallo Textiles",
    initials: "AD",
  },
  {
    quote:
      "Avant SenStock, je perdais des heures sur Excel. Maintenant, je gère mes 3 boutiques depuis une seule interface. Le module analytique est un vrai plus.",
    name: "Moussa Ndiaye",
    role: "Directeur, Ndiaye Distribution",
    initials: "MN",
  },
  {
    quote:
      "La boutique en ligne intégrée m'a permis de lancer mon e-commerce sans aucune compétence technique. Mes clients commandent directement en ligne.",
    name: "Fatou Sow",
    role: "Fondatrice, Sow Cosmétiques",
    initials: "FS",
  },
];

export default function TestimonialsSection() {
  const { ref, revealed } = useStaggerReveal<HTMLDivElement>(0.08);

  return (
    <section className="relative border-t border-border/50 bg-muted/20 py-24 sm:py-32" ref={ref}>
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary/[0.02] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div
          className={`mx-auto max-w-2xl text-center landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Témoignages
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Ils nous font <span className="text-primary">confiance</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Des entrepreneurs comme vous utilisent SenStock au quotidien.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {testimonials.map((t, i) => {
            // Alternate: first from left, middle from bottom, last from right
            const directions = ["landing-reveal-left", "landing-reveal-up", "landing-reveal-right"];
            const direction = directions[i % 3];

            return (
              <div
                key={t.name}
                className={`${direction} group relative flex flex-col rounded-2xl border border-border/60 bg-card p-7 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 ${
                  revealed ? "revealed" : ""
                }`}
                style={{ transitionDelay: revealed ? `${400 + i * 200}ms` : "0ms" }}
              >
                {/* Quote icon */}
                <Quote className="mb-4 h-8 w-8 text-primary/20" />

                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, si) => (
                    <svg
                      key={si}
                      className="h-4 w-4 fill-primary text-primary"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote text */}
                <p className="mt-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary ring-2 ring-primary/10">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
