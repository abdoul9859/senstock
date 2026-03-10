import { Link } from "react-router-dom";
import {
  Boxes,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Zap,
  Shield,
  Headphones,
  Globe,
  Heart,
} from "lucide-react";
import { useState } from "react";
import { useScrollReveal } from "./useScrollReveal";

const footerLinks = {
  Produit: [
    { label: "Fonctionnalites", href: "#fonctionnalites" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "FAQ", href: "#faq" },
    { label: "Nouveautes", href: "#" },
    { label: "Integrations", href: "#" },
    { label: "API", href: "#" },
  ],
  Solutions: [
    { label: "Commerce de detail", href: "#" },
    { label: "Grossistes", href: "#" },
    { label: "Restaurants", href: "#" },
    { label: "E-commerce", href: "#" },
    { label: "Franchises", href: "#" },
  ],
  Entreprise: [
    { label: "A propos", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carrieres", href: "#" },
    { label: "Presse", href: "#" },
    { label: "Partenaires", href: "#" },
  ],
  Support: [
    { label: "Centre d'aide", href: "#" },
    { label: "Documentation", href: "#" },
    { label: "Communaute", href: "#" },
    { label: "Contactez-nous", href: "mailto:contact@senstock.app" },
    { label: "Statut des services", href: "#" },
  ],
};

const highlights = [
  { icon: Zap, label: "Rapide a deployer", desc: "Operationnel en 5 minutes" },
  { icon: Shield, label: "Securise", desc: "Donnees chiffrees SSL" },
  { icon: Headphones, label: "Support 24/7", desc: "Equipe a votre ecoute" },
  { icon: Globe, label: "100% Cloud", desc: "Accessible partout" },
];

const socials = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
];

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
    <footer className="border-t border-border/50 bg-muted/20 relative overflow-hidden" ref={ref}>
      {/* Subtle gradient decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Highlights bar */}
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div
            className={`grid grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 ${
              revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {highlights.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-3 group"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-16">
        <div
          className={`grid gap-10 sm:grid-cols-2 lg:grid-cols-6 transition-all duration-700 delay-100 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Brand + newsletter — takes 2 columns on lg */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Boxes className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">SenStock</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              La plateforme de gestion tout-en-un pour les entreprises africaines.
              Stock, facturation, boutique en ligne et bien plus.
            </p>

            {/* Newsletter */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                Restez informe
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              {subscribed && (
                <p className="mt-2 text-xs text-primary animate-fade-in">
                  Merci ! Vous recevrez nos prochaines actualites.
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                Pas de spam. Desabonnement en un clic.
              </p>
            </div>

            {/* Social links */}
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        <div
          className={`mt-12 flex flex-wrap gap-6 sm:gap-10 transition-all duration-700 delay-300 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="mailto:contact@senstock.app"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4" />
            contact@senstock.app
          </a>
          <a
            href="tel:+221771234567"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            +221 77 123 45 67
          </a>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Dakar, Senegal
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={`mt-10 border-t border-border/50 pt-8 transition-all duration-700 delay-400 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} SenStock. Tous droits reserves.</p>
              <span className="hidden sm:inline text-border">|</span>
              <a href="#" className="hover:text-primary transition-colors">Conditions d'utilisation</a>
              <a href="#" className="hover:text-primary transition-colors">Politique de confidentialite</a>
              <a href="#" className="hover:text-primary transition-colors">Cookies</a>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="text-xs font-medium rounded-md bg-primary/10 text-primary px-3 py-1.5 hover:bg-primary/20 transition-colors"
              >
                Essai gratuit
              </Link>
            </div>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1 text-xs text-muted-foreground/50">
            Concu avec <Heart className="h-3 w-3 text-red-500/60" /> pour les entrepreneurs africains
          </p>
        </div>
      </div>
    </footer>
  );
}
