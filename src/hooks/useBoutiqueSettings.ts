import { useState, useEffect, useCallback } from "react";

export interface BoutiqueSettings {
  shopName: string;
  shopDescription: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
  shopLogo: string;
  defaultShipping: number;
  welcomeMessage: string;
  footerText: string;
}

const STORAGE_KEY = "senstock_boutique_settings";

const defaultSettings: BoutiqueSettings = {
  shopName: "MBaye Boutique",
  shopDescription: "Votre boutique en ligne",
  shopPhone: "",
  shopEmail: "",
  shopAddress: "",
  shopLogo: "",
  defaultShipping: 0,
  welcomeMessage: "Bienvenue dans notre boutique !",
  footerText: "",
};

export function getBoutiqueSettings(): BoutiqueSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

export function useBoutiqueSettings() {
  const [settings, setSettingsState] = useState<BoutiqueSettings>(getBoutiqueSettings);

  useEffect(() => {
    const handler = () => setSettingsState(getBoutiqueSettings());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setSettings = useCallback((updates: Partial<BoutiqueSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, setSettings };
}
