import { Link } from "react-router-dom";
import {
  Boxes,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Zap,
  Shield,
  Headphones,
  Globe,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { useScrollReveal } from "./useScrollReveal";

/* ------------------------------------------------------------------ */
/*  Footer link columns                                               */
/*  - href = anchor (#xxx) or route (/xxx) → rendered as <a> / <Link> */
/*  - href = undefined → rendered as plain text (not clickable)        */
/* ------------------------------------------------------------------ */
interface FooterItem {
  label: string;
  href?: string;
}

const footerColumns: { title: string; items: FooterItem[] }[] = [
  {
    title: "Produit",
    items: [
      { label: "Fonctionnalites", href: "#fonctionnalites" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Ideal pour",
    items: [
      { label: "Commerce de detail" },
      { label: "Grossistes" },
      { label: "Restaurants" },
      { label: "E-commerce" },
      { label: "Prestataires de services" },
    ],
  },
  {
    title: "Ressources",
    items: [
      { label: "Contactez-nous", href: "mailto:contact@senstock.app" },
    ],
  },
];

const highlights = [
  { icon: Zap, label: "Rapide a deployer", desc: "Operationnel en 5 minutes" },
  { icon: Shield, label: "Securise", desc: "Donnees chiffrees SSL" },
  {
    icon: Headphones,
    label: "Support reactif",
    desc: "Equipe a votre ecoute",
  },
  { icon: Globe, label: "100% Cloud", desc: "Accessible partout" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function LandingFooter() {
  const { ref, revealed } = useScrollReveal<HTMLElement>(0.05);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  }

  return (
    <footer
      className="relative overflow-hidden border-t border-border/50 bg-muted/20"
      ref={ref}
    >
      {/* Subtle gradient decoration */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />

      {/* ---- Highlights bar ---- */}
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {highlights.map((item, i) => (
              <div
                key={item.label}
                className={`landing-reveal-scale group flex items-center gap-3 ${
                  revealed ? "revealed" : ""
                }`}
                style={{ transitionDelay: revealed ? `${i * 120}ms` : "0ms" }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Main footer content ---- */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div
          className={`grid gap-10 sm:grid-cols-2 lg:grid-cols-6 landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
          style={{ transitionDelay: revealed ? "300ms" : "0ms" }}
        >
          {/* Brand + newsletter — 2 cols on lg */}
          <div className="space-y-6 lg:col-span-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Boxes className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                SenStock
              </span>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              La plateforme de gestion tout-en-un pour les entreprises
              africaines. Stock, facturation, boutique en ligne et bien plus.
            </p>

            {/* Newsletter */}
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">
                Restez informe
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              {subscribed && (
                <p className="mt-2 animate-fade-in text-xs text-primary">
                  Merci ! Vous recevrez nos prochaines actualites.
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                Pas de spam. Desabonnement en un clic.
              </p>
            </div>
          </div>

          {/* Link / text columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      item.href.startsWith("mailto:") ||
                      item.href.startsWith("http") ? (
                        <a
                          href={item.href}
                          className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                        >
                          {item.label}
                        </a>
                      ) : item.href.startsWith("/") ? (
                        <Link
                          to={item.href}
                          className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          href={item.href}
                          className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                        >
                          {item.label}
                        </a>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---- Contact row ---- */}
        <div
          className={`mt-12 flex flex-wrap gap-6 sm:gap-10 landing-reveal-left ${
            revealed ? "revealed" : ""
          }`}
          style={{ transitionDelay: revealed ? "500ms" : "0ms" }}
        >
          <a
            href="mailto:contact@senstock.app"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            contact@senstock.app
          </a>
          <a
            href="tel:+221771234567"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            +221 77 123 45 67
          </a>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Dakar, Senegal
          </span>
        </div>

        {/* ---- Bottom bar ---- */}
        <div
          className={`mt-10 border-t border-border/50 pt-8 landing-reveal-up ${
            revealed ? "revealed" : ""
          }`}
          style={{ transitionDelay: revealed ? "600ms" : "0ms" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SenStock. Tous droits reserves.
            </p>

            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Essai gratuit
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/50">
            Concu avec{" "}
            <Heart className="h-3 w-3 text-red-500/60" /> pour les
            entrepreneurs africains
          </p>
        </div>
      </div>
    </footer>
  );
}
