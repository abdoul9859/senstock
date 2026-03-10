import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PlanType, PLAN_PERMISSIONS } from "@/config/planPermissions";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

export interface TenantInfo {
  plan: PlanType;
  subscriptionStatus: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  trialEndsAt: string | null;
}

interface AuthContextType {
  user: User | null;
  tenant: TenantInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, plan?: string) => Promise<{ success: boolean; error?: string; plan?: string }>;
  socialLogin: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; isNew?: boolean }>;
  sendMagicCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyMagicCode: (email: string, code: string) => Promise<{ success: boolean; error?: string; isNew?: boolean }>;
  updateProfile: (data: { name?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  refreshTenant: () => Promise<void>;
  logout: () => void;
  hasModule: (module: string) => boolean;
  hasFeature: (feature: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "senstock_token";
const REFRESH_KEY = "senstock_refresh";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTenant = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch("/api/onboarding/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTenant({
          plan: data.plan,
          subscriptionStatus: data.subscriptionStatus,
          onboardingCompleted: data.onboardingCompleted,
          onboardingStep: data.onboardingStep,
          trialEndsAt: data.trialEndsAt || null,
        });
      }
    } catch {
      // silently fail
    }
  }, []);

  // Try to refresh the access token using stored refresh token
  const tryRefreshToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        return false;
      }
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      setUser(data.user);
      if (data.tenant) setTenant(data.tenant);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        // If 401, try refresh
        if (res.status === 401) return tryRefreshToken().then((ok) => (ok ? "refreshed" : Promise.reject()));
        return Promise.reject();
      })
      .then((data) => {
        if (data === "refreshed") return; // Already set by tryRefreshToken
        setUser(data.user);
        if (data.tenant) setTenant(data.tenant);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
      })
      .finally(() => setLoading(false));
  }, [tryRefreshToken]);

  async function login(email: string, password: string) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erreur de connexion" };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      setUser(data.user);
      if (data.tenant) setTenant(data.tenant);
      return { success: true };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function register(name: string, email: string, password: string, plan?: string) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erreur lors de l'inscription" };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      setUser(data.user);
      if (data.tenant) setTenant(data.tenant);
      return { success: true, plan: data.plan };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function socialLogin(provider: string, data: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/auth/social/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || "Erreur d'authentification" };
      }
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      if (result.tenant) setTenant(result.tenant);
      return { success: true, isNew: result.isNew };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function sendMagicCode(email: string) {
    try {
      const res = await fetch("/api/auth/social/magic/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || "Erreur d'envoi" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function verifyMagicCode(email: string, code: string) {
    try {
      const res = await fetch("/api/auth/social/magic/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || "Code invalide" };
      }
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
      if (result.tenant) setTenant(result.tenant);
      return { success: true, isNew: result.isNew };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function updateProfile(data: { name?: string; password?: string }) {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        return { success: false, error: result.error || "Erreur de mise à jour" };
      }
      setUser(result.user);
      return { success: true };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  function logout() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setTenant(null);
  }

  function hasModule(module: string): boolean {
    if (!tenant) return false;
    const plan = PLAN_PERMISSIONS[tenant.plan];
    return plan ? plan.modules.includes(module) : false;
  }

  function hasFeature(feature: string): boolean {
    if (!tenant) return false;
    const plan = PLAN_PERMISSIONS[tenant.plan];
    return plan ? !!(plan.features as Record<string, boolean>)[feature] : false;
  }

  // Admin has all permissions. Gerant checks granular permissions.
  function hasPermission(permission: string): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    return !!(user.permissions && user.permissions[permission]);
  }

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, socialLogin, sendMagicCode, verifyMagicCode, updateProfile, refreshTenant, logout, hasModule, hasFeature, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
