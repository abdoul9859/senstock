import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Boxes, Crown, Building2, Sparkles, ShoppingBag, Mail, Loader2, ArrowLeft } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{ authorization: { id_token: string }; user?: unknown }>;
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || "";

const PLAN_INFO: Record<string, { label: string; price: string; icon: typeof Crown }> = {
  essai: { label: "Essai Gratuit", price: "0 FCFA", icon: Sparkles },
  revendeur: { label: "Revendeur", price: "9 900 FCFA/mois", icon: ShoppingBag },
  premium: { label: "Premium", price: "19 900 FCFA/mois", icon: Crown },
  entreprise: { label: "Entreprise", price: "99 900 FCFA/mois", icon: Building2 },
};

type AuthMode = "password" | "magic";

const RegisterPage = () => {
  const { register, socialLogin, sendMagicCode, verifyMagicCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan") || "essai";
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.essai;
  const PlanIcon = planInfo.icon;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>("password");
  const [magicSent, setMagicSent] = useState(false);
  const [magicCode, setMagicCode] = useState("");

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setError("");
    setSubmitting(true);
    const result = await socialLogin("google", { idToken: response.credential });
    setSubmitting(false);
    if (result.success) {
      navigate("/onboarding", { replace: true });
    } else {
      setError(result.error || "Erreur Google");
    }
  }, [socialLogin, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      const el = document.getElementById("google-signup-btn");
      if (el) {
        window.google?.accounts.id.renderButton(el, {
          theme: "filled_black",
          size: "large",
          width: "100%",
          text: "signup_with",
          locale: "fr",
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [handleGoogleResponse]);

  async function handleAppleLogin() {
    if (!window.AppleID) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await window.AppleID.auth.signIn();
      const result = await socialLogin("apple", {
        idToken: res.authorization.id_token,
        user: res.user,
      });
      if (result.success) {
        navigate("/onboarding", { replace: true });
      } else {
        setError(result.error || "Erreur Apple");
      }
    } catch {
      setError("Inscription Apple annulee");
    }
    setSubmitting(false);
  }

  useEffect(() => {
    if (!APPLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.onload = () => {
      window.AppleID?.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: "name email",
        redirectURI: window.location.origin + "/register",
        usePopup: true,
      });
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caracteres");
      return;
    }
    setSubmitting(true);
    const result = await register(name, email, password, plan);
    if (result.success) {
      navigate("/onboarding", { replace: true });
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
    setSubmitting(false);
  }

  async function handleSendMagicCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Entrez votre email"); return; }
    setSubmitting(true);
    const result = await sendMagicCode(email);
    setSubmitting(false);
    if (result.success) {
      setMagicSent(true);
    } else {
      setError(result.error || "Erreur d'envoi");
    }
  }

  async function handleVerifyMagicCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await verifyMagicCode(email, magicCode);
    setSubmitting(false);
    if (result.success) {
      navigate("/onboarding", { replace: true });
    } else {
      setError(result.error || "Code invalide");
    }
  }

  const inputClass = "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative">
      {/* Back to landing page */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Retour a l'accueil
      </Link>
      <div className="w-full max-w-sm space-y-6 animate-scale-in">
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Boxes className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">StockFlow</h1>
          <p className="text-sm text-muted-foreground">Creez votre compte</p>
        </div>

        {/* Plan badge */}
        {plan !== "essai" && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
            <PlanIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Plan {planInfo.label}</span>
            <span className="text-sm text-muted-foreground">—</span>
            <span className="text-sm text-muted-foreground">{planInfo.price}</span>
          </div>
        )}

        {/* Social login buttons */}
        <div className="space-y-2.5">
          {GOOGLE_CLIENT_ID ? (
            <div id="google-signup-btn" className="w-full flex justify-center" />
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setError("Google Sign-In non configure (ajoutez VITE_GOOGLE_CLIENT_ID)")}
              className="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              S'inscrire avec Google
            </button>
          )}

          {APPLE_CLIENT_ID && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleAppleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              S'inscrire avec Apple
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("password"); setMagicSent(false); setError(""); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            Mot de passe
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(""); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "magic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Mail className="h-3 w-3 inline mr-1" />
            Code par email
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Password mode */}
        {mode === "password" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">Nom complet</label>
              <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Moussa Mbaye" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="nom@exemple.com" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Mot de passe</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Creer un compte"}
            </button>
          </form>
        )}

        {/* Magic code mode */}
        {mode === "magic" && !magicSent && (
          <form onSubmit={handleSendMagicCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="magic-email" className="text-sm font-medium text-foreground">Email</label>
              <input id="magic-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="nom@exemple.com" />
            </div>
            <button type="submit" disabled={submitting} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Envoyer le code"}
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Un code a 6 chiffres sera envoye a votre adresse email
            </p>
          </form>
        )}

        {mode === "magic" && magicSent && (
          <form onSubmit={handleVerifyMagicCode} className="space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
              Code envoye a <strong>{email}</strong>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="magic-code" className="text-sm font-medium text-foreground">Code de verification</label>
              <input
                id="magic-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={magicCode}
                onChange={(e) => setMagicCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} text-center text-lg tracking-[0.5em] font-mono`}
                placeholder="000000"
              />
            </div>
            <button type="submit" disabled={submitting || magicCode.length < 6} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verifier et creer mon compte"}
            </button>
            <button type="button" onClick={() => { setMagicSent(false); setMagicCode(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              Renvoyer le code
            </button>
          </form>
        )}

        {plan !== "essai" && (
          <p className="text-center text-xs text-muted-foreground">
            Essai gratuit de 14 jours. Aucun prelevement immediat.
          </p>
        )}

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Deja un compte ?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
          {plan !== "essai" && (
            <Link to="/#tarifs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Changer de plan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
