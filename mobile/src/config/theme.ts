export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryDark: string;
  primaryForeground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDimmed: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  warning: string;
  info: string;
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  overlay: string;
}

export const darkColors: ThemeColors = {
  background: "#0a0a0a",
  card: "#111111",
  cardAlt: "#191919",
  border: "#262626",
  borderLight: "#333333",
  primary: "#10b981",
  primaryDark: "#059669",
  primaryForeground: "#ffffff",
  text: "#fafafa",
  textSecondary: "#d4d4d8",
  textMuted: "#a1a1aa",
  textDimmed: "#71717a",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  success: "#22c55e",
  warning: "#f59e0b",
  info: "#3b82f6",
  inputBackground: "#1a1a1a",
  inputBorder: "#333333",
  placeholder: "#71717a",
  tabBarBackground: "#111111",
  tabBarBorder: "#262626",
  tabBarActive: "#10b981",
  tabBarInactive: "#71717a",
  overlay: "rgba(0,0,0,0.6)",
};

export const lightColors: ThemeColors = {
  background: "#f8fafc",
  card: "#ffffff",
  cardAlt: "#f1f5f9",
  border: "#e2e8f0",
  borderLight: "#cbd5e1",
  primary: "#059669",
  primaryDark: "#047857",
  primaryForeground: "#ffffff",
  text: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textDimmed: "#94a3b8",
  destructive: "#dc2626",
  destructiveForeground: "#ffffff",
  success: "#16a34a",
  warning: "#d97706",
  info: "#2563eb",
  inputBackground: "#ffffff",
  inputBorder: "#cbd5e1",
  placeholder: "#94a3b8",
  tabBarBackground: "#ffffff",
  tabBarBorder: "#e2e8f0",
  tabBarActive: "#059669",
  tabBarInactive: "#94a3b8",
  overlay: "rgba(0,0,0,0.4)",
};

// Default export for backward compat — will be overridden by ThemeContext
export let colors = darkColors;

export function setActiveColors(c: ThemeColors) {
  colors = c;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
