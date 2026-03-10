import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface ShopHero {
  enabled: boolean;
  image: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export interface ShopTheme {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  colorMode: "light" | "dark" | "auto";
}

export interface ShopContact {
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
}

export interface ShopSocialLinks {
  facebook: string;
  instagram: string;
  whatsapp: string;
  tiktok: string;
  twitter: string;
}

export interface ShopCommerce {
  currency: string;
  defaultShipping: number;
  freeShippingThreshold: number;
  paymentMethods: {
    cash_on_delivery: boolean;
    wave: boolean;
    orange_money: boolean;
    free_money: boolean;
    card: boolean;
  };
}

export interface ShopFooter {
  text: string;
  columns: { title: string; links: { label: string; url: string }[] }[];
}

export interface ShopAnnouncement {
  enabled: boolean;
  text: string;
  color: string;
}

export interface PublicShopSettings {
  shopName: string;
  shopDescription: string;
  shopLogo: string;
  shopFavicon: string;
  hero: ShopHero;
  theme: ShopTheme;
  contact: ShopContact;
  socialLinks: ShopSocialLinks;
  commerce: ShopCommerce;
  footer: ShopFooter;
  announcement: ShopAnnouncement;
}

const DEFAULT_SETTINGS: PublicShopSettings = {
  shopName: "Ma Boutique",
  shopDescription: "Bienvenue dans notre boutique en ligne",
  shopLogo: "",
  shopFavicon: "",
  hero: { enabled: true, image: "", title: "Bienvenue dans notre boutique", subtitle: "Decouvrez nos produits de qualite", ctaText: "Voir les produits", ctaLink: "/shop" },
  theme: { preset: "default", primaryColor: "142 70% 45%", secondaryColor: "0 0% 96%", accentColor: "0 0% 94%", fontFamily: "Inter", borderRadius: "0.5rem", colorMode: "light" },
  contact: { phone: "", email: "", address: "", whatsapp: "" },
  socialLinks: { facebook: "", instagram: "", whatsapp: "", tiktok: "", twitter: "" },
  commerce: { currency: " F", defaultShipping: 0, freeShippingThreshold: 0, paymentMethods: { cash_on_delivery: true, wave: false, orange_money: false, free_money: false, card: false } },
  footer: { text: "", columns: [] },
  announcement: { enabled: false, text: "", color: "142 70% 45%" },
};

interface ShopSettingsContextValue {
  settings: PublicShopSettings;
  loading: boolean;
  refetch: () => void;
}

const ShopSettingsContext = createContext<ShopSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refetch: () => {},
});

export function useShopSettings() {
  return useContext(ShopSettingsContext);
}

/** Load a Google Font dynamically */
function loadGoogleFont(family: string) {
  if (!family || family === "Inter") return; // Inter is already loaded
  const id = `gfont-${family.replace(/\s/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicShopSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/shop/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Load custom font
  useEffect(() => {
    loadGoogleFont(settings.theme.fontFamily);
  }, [settings.theme.fontFamily]);

  return (
    <ShopSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </ShopSettingsContext.Provider>
  );
}
