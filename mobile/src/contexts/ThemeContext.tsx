import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { darkColors, lightColors, setActiveColors, type ThemeColors } from "../config/theme";

type ThemeMode = "dark" | "light";

const THEME_KEY = "stockflow_theme";

// ── Persistence helpers (same pattern as api.ts token storage) ──
async function loadTheme(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(THEME_KEY) as ThemeMode | null;
    }
    const SecureStore = await import("expo-secure-store");
    return (await SecureStore.getItemAsync(THEME_KEY)) as ThemeMode | null;
  } catch {
    return null;
  }
}

async function saveTheme(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(THEME_KEY, mode);
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(THEME_KEY, mode);
  } catch {
    // silent
  }
}

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  colors: darkColors,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  // Load saved theme on mount
  useEffect(() => {
    loadTheme().then((saved) => {
      if (saved === "dark" || saved === "light") setMode(saved);
    });
  }, []);

  const themeColors = mode === "dark" ? darkColors : lightColors;

  // Keep the global `colors` export in sync
  setActiveColors(themeColors);

  // Update <html> background on web to prevent white flash
  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.style.backgroundColor = themeColors.background;
    document.body.style.backgroundColor = themeColors.background;
  }

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, colors: themeColors, isDark: mode === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
