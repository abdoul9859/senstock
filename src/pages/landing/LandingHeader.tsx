import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Boxes, Menu, X, ArrowRight, Sun, Moon } from "lucide-react";

const navLinks = [
  { label: "Fonctionnalites", href: "#fonctionnalites" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return (localStorage.getItem("senstock_theme") || "dark") === "dark";
  });

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    localStorage.setItem("senstock_theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        loaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          scrolled
            ? "mt-3 max-w-3xl px-2"
            : "mt-0 max-w-7xl px-4 sm:px-6"
        }`}
      >
        <div
          className={`flex items-center justify-between rounded-2xl transition-all duration-500 ${
            scrolled
              ? "h-12 bg-card/70 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/10 px-4"
              : "h-16 bg-transparent px-0"
          }`}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center rounded-lg bg-primary transition-all duration-300 ${
                scrolled ? "h-7 w-7" : "h-9 w-9"
              }`}
            >
              <Boxes
                className={`text-primary-foreground transition-all duration-300 ${
                  scrolled ? "h-3.5 w-3.5" : "h-4.5 w-4.5"
                }`}
              />
            </div>
            <span
              className={`font-semibold text-foreground transition-all duration-300 ${
                scrolled ? "text-sm" : "text-lg"
              }`}
            >
              SenStock
            </span>
          </a>

          {/* Desktop Nav — center pill */}
          <nav
            className={`hidden items-center gap-1 md:flex transition-all duration-500 ${
              scrolled
                ? ""
                : "rounded-full border border-border/40 bg-card/40 backdrop-blur-md px-1.5 py-1"
            }`}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`rounded-full text-sm font-medium transition-all duration-200 hover:text-foreground ${
                  scrolled
                    ? "px-3 py-1 text-muted-foreground hover:bg-muted/50"
                    : "px-4 py-1.5 text-muted-foreground/80 hover:bg-white/5"
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:text-foreground hover:bg-muted/50 ${
                scrolled ? "h-7 w-7" : "h-9 w-9"
              }`}
              title={isDark ? "Thème clair" : "Thème sombre"}
            >
              {isDark ? (
                <Sun className={`transition-all duration-300 ${scrolled ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
              ) : (
                <Moon className={`transition-all duration-300 ${scrolled ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
              )}
            </button>
            {user ? (
              <Link
                to="/entrepot/dashboard"
                className={`rounded-full bg-primary font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 ${
                  scrolled ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm"
                }`}
              >
                Tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`rounded-full font-medium text-muted-foreground transition-all duration-300 hover:text-foreground ${
                    scrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  }`}
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className={`group inline-flex items-center gap-1.5 rounded-full bg-primary font-medium text-primary-foreground transition-all duration-300 hover:bg-primary/90 ${
                    scrolled ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm"
                  }`}
                >
                  Essai gratuit
                  <ArrowRight
                    className={`transition-all duration-300 group-hover:translate-x-0.5 ${
                      scrolled ? "h-3 w-3" : "h-3.5 w-3.5"
                    }`}
                  />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground md:hidden hover:bg-muted/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="mt-2 animate-fade-in rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-4 shadow-xl md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? "Thème clair" : "Thème sombre"}
              </button>
              {user ? (
                <Link
                  to="/entrepot/dashboard"
                  className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Tableau de bord
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                  >
                    Commencer gratuitement
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
