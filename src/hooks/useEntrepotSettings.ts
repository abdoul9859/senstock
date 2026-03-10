import { useState, useCallback } from "react";

export interface EntrepotSettings {
  // Inventaire
  lowStockThresholdVariants: number;
  lowStockThresholdSimple: number;
  defaultView: "grid" | "list";
  currency: string;
  // Mouvements
  movementsPageSize: number;
  // Codes-barres
  bcFormat: string;
  bcWidth: number;
  bcHeight: number;
  bcFontSize: number;
  bcShowValue: boolean;
  bcShowLabel: boolean;
  bcShowPrice: boolean;
  bcPrintColumns: number;
}

export const DEFAULT_SETTINGS: EntrepotSettings = {
  lowStockThresholdVariants: 2,
  lowStockThresholdSimple: 5,
  defaultView: "grid",
  currency: " F",
  movementsPageSize: 50,
  bcFormat: "CODE128",
  bcWidth: 1.5,
  bcHeight: 50,
  bcFontSize: 12,
  bcShowValue: true,
  bcShowLabel: true,
  bcShowPrice: false,
  bcPrintColumns: 3,
};

const STORAGE_KEY = "senstock_entrepot_settings";

function loadSettings(): EntrepotSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: EntrepotSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useEntrepotSettings() {
  const [settings, setSettings] = useState<EntrepotSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<EntrepotSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS };
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  return { settings, updateSettings, resetSettings };
}

/** Read settings once (non-reactive, for initial values) */
export function getEntrepotSettings(): EntrepotSettings {
  return loadSettings();
}
