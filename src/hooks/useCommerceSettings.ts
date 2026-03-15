import { useState, useCallback, useEffect, useRef } from "react";

export interface CommerceSettings {
  // Template
  invoiceTemplate: "lbp" | "techzone" | "minimal" | "classique";
  accentColor: string;
  // Business info
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessNinea: string;
  businessLogo: string; // base64
  // Defaults
  defaultNotes: string;
  defaultWarrantyText: string;
  showPurchasePrice: boolean;
}

export const DEFAULT_COMMERCE_SETTINGS: CommerceSettings = {
  invoiceTemplate: "lbp",
  accentColor: "#0070c0",
  businessName: "",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  businessNinea: "",
  businessLogo: "",
  defaultNotes: "",
  defaultWarrantyText: "",
  showPurchasePrice: false,
};

// Only these keys are valid settings fields
const SETTING_KEYS: (keyof CommerceSettings)[] = [
  "invoiceTemplate", "accentColor", "businessName", "businessAddress",
  "businessPhone", "businessEmail", "businessNinea", "businessLogo",
  "defaultNotes", "defaultWarrantyText", "showPurchasePrice",
];

const STORAGE_KEY = "senstock_commerce_settings";
const TOKEN_KEY = "senstock_token";

function loadLocal(): CommerceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COMMERCE_SETTINGS };
    return { ...DEFAULT_COMMERCE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COMMERCE_SETTINGS };
  }
}

function saveLocal(settings: CommerceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Pick only valid setting keys from an object (strip id, tenantId, createdAt, etc.) */
function pickSettings(obj: Record<string, unknown>): Partial<CommerceSettings> {
  const result: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result as Partial<CommerceSettings>;
}

export function useCommerceSettings() {
  const [settings, setSettings] = useState<CommerceSettings>(loadLocal);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverLoaded = useRef(false);

  // On mount: load from server (source of truth) and merge into local
  useEffect(() => {
    if (serverLoaded.current) return;
    serverLoaded.current = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch("/api/commerce-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (!raw) return;
        const serverData = pickSettings(raw);
        // Server is source of truth — use server values, fallback to defaults
        const merged: CommerceSettings = { ...DEFAULT_COMMERCE_SETTINGS, ...serverData };
        setSettings(merged);
        saveLocal(merged);
      })
      .catch(() => {});
  }, []);

  const updateSettings = useCallback((patch: Partial<CommerceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      // Debounced sync to server
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        fetch("/api/commerce-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(pickSettings(next as unknown as Record<string, unknown>)),
        }).catch(() => {});
      }, 1500);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_COMMERCE_SETTINGS };
    saveLocal(defaults);
    setSettings(defaults);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch("/api/commerce-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(pickSettings(defaults as unknown as Record<string, unknown>)),
      }).catch(() => {});
    }
  }, []);

  // Force immediate save to server
  const saveNow = useCallback(async () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Non authentifie");
    const current = loadLocal();
    const res = await fetch("/api/commerce-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(pickSettings(current as unknown as Record<string, unknown>)),
    });
    if (!res.ok) throw new Error("Erreur serveur");
  }, []);

  return { settings, updateSettings, resetSettings, saveNow };
}

/** Read settings once (non-reactive) */
export function getCommerceSettings(): CommerceSettings {
  return loadLocal();
}
