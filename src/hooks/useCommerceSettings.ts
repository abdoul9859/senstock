import { useState, useCallback } from "react";

export interface CommerceSettings {
  // Template
  invoiceTemplate: "lbp" | "techzone" | "minimal";
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

const STORAGE_KEY = "mbayestock_commerce_settings";

function loadSettings(): CommerceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COMMERCE_SETTINGS };
    return { ...DEFAULT_COMMERCE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COMMERCE_SETTINGS };
  }
}

function saveSettings(settings: CommerceSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useCommerceSettings() {
  const [settings, setSettings] = useState<CommerceSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<CommerceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_COMMERCE_SETTINGS };
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  return { settings, updateSettings, resetSettings };
}

/** Read settings once (non-reactive) */
export function getCommerceSettings(): CommerceSettings {
  return loadSettings();
}
