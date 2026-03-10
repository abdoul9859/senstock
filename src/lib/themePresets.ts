export interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  colorMode: "light" | "dark";
  preview: { bg: string; primary: string; text: string };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Emeraude",
    primaryColor: "142 70% 45%",
    secondaryColor: "0 0% 96%",
    accentColor: "0 0% 94%",
    fontFamily: "Inter",
    borderRadius: "0.5rem",
    colorMode: "light",
    preview: { bg: "#ffffff", primary: "#22c55e", text: "#111827" },
  },
  {
    id: "ocean",
    name: "Ocean",
    primaryColor: "210 100% 50%",
    secondaryColor: "210 15% 96%",
    accentColor: "210 15% 92%",
    fontFamily: "Inter",
    borderRadius: "0.75rem",
    colorMode: "light",
    preview: { bg: "#ffffff", primary: "#0080ff", text: "#111827" },
  },
  {
    id: "sunset",
    name: "Coucher de soleil",
    primaryColor: "20 90% 52%",
    secondaryColor: "20 15% 96%",
    accentColor: "20 15% 92%",
    fontFamily: "Inter",
    borderRadius: "0.5rem",
    colorMode: "light",
    preview: { bg: "#ffffff", primary: "#e86423", text: "#111827" },
  },
  {
    id: "luxury",
    name: "Luxe",
    primaryColor: "45 80% 50%",
    secondaryColor: "0 0% 10%",
    accentColor: "0 0% 14%",
    fontFamily: "Playfair Display",
    borderRadius: "0.25rem",
    colorMode: "dark",
    preview: { bg: "#0a0a0a", primary: "#d4a017", text: "#fafafa" },
  },
  {
    id: "minimal",
    name: "Minimal",
    primaryColor: "0 0% 9%",
    secondaryColor: "0 0% 96%",
    accentColor: "0 0% 92%",
    fontFamily: "Inter",
    borderRadius: "0rem",
    colorMode: "light",
    preview: { bg: "#ffffff", primary: "#171717", text: "#111827" },
  },
];

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}
