import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PlanType, PLAN_PERMISSIONS } from "../config/planPermissions";
import { apiFetch, getToken, setToken, removeToken, setOnUnauthorized } from "../config/api";
import type { User, TenantInfo } from "../types";

interface AuthContextType {
  user: User | null;
  tenant: TenantInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshTenant: () => Promise<void>;
  hasModule: (module: string) => boolean;
  hasFeature: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const doLogout = useCallback(() => {
    removeToken();
    setUser(null);
    setTenant(null);
  }, []);

  // Wire up the global 401 handler
  useEffect(() => {
    setOnUnauthorized(doLogout);
  }, [doLogout]);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        try {
          const res = await apiFetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            if (data.tenant) setTenant(data.tenant);
          } else {
            await removeToken();
          }
        } catch {
          await removeToken();
        }
      } catch {
        // getToken itself failed — just show login
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshTenant = useCallback(async () => {
    try {
      const res = await apiFetch("/api/onboarding/status");
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
      // silent
    }
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erreur de connexion" };
      }
      await setToken(data.token);
      setUser(data.user);
      if (data.tenant) setTenant(data.tenant);
      return { success: true };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, plan: "free" }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Erreur lors de l'inscription" };
      }
      await setToken(data.token);
      setUser(data.user);
      if (data.tenant) setTenant(data.tenant);
      return { success: true };
    } catch {
      return { success: false, error: "Impossible de contacter le serveur" };
    }
  }

  function logout() {
    doLogout();
  }

  function hasModule(_module: string): boolean {
    // Mobile self-hosted: all modules unlocked
    return true;
  }

  function hasFeature(_feature: string): boolean {
    // Mobile self-hosted: all features unlocked
    return true;
  }

  return (
    <AuthContext.Provider
      value={{ user, tenant, loading, login, register, logout, refreshTenant, hasModule, hasFeature }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
