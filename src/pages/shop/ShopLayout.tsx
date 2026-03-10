import { useRef, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ShopSettingsProvider, useShopSettings } from "@/contexts/ShopSettingsContext";
import { AnnouncementBar } from "./components/AnnouncementBar";
import { ShopHeader } from "./components/ShopHeader";
import { ShopFooter } from "./components/ShopFooter";
import { ShoppingBag, Clock } from "lucide-react";

// Set to false to enable the full shop
const COMING_SOON = true;

function ComingSoonPage() {
  const { settings } = useShopSettings();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <ShoppingBag className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bientot disponible</h1>
          <p className="text-muted-foreground text-lg">
            Notre boutique en ligne est en cours de preparation.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Nous travaillons pour vous offrir la meilleure experience.</span>
        </div>
        {settings.contact.whatsapp && (
          <a
            href={`https://wa.me/${settings.contact.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Contactez-nous sur WhatsApp
          </a>
        )}
        {settings.contact.phone && !settings.contact.whatsapp && (
          <a
            href={`tel:${settings.contact.phone}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Appelez-nous : {settings.contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}

function ShopShell() {
  const { settings, loading } = useShopSettings();
  const shellRef = useRef<HTMLDivElement>(null);

  // Apply theme CSS variables dynamically
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    el.style.setProperty("--shop-primary", settings.theme.primaryColor);
    el.style.setProperty("--shop-secondary", settings.theme.secondaryColor);
    el.style.setProperty("--shop-accent", settings.theme.accentColor);
    el.style.setProperty("--shop-radius", settings.theme.borderRadius);
    el.style.setProperty("--shop-font", `'${settings.theme.fontFamily}', sans-serif`);
  }, [settings.theme]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      data-shop-theme
      data-color-mode={settings.theme.colorMode === "auto" ? "light" : settings.theme.colorMode}
      className="min-h-screen flex flex-col"
    >
      {COMING_SOON ? (
        <ComingSoonPage />
      ) : (
        <>
          <AnnouncementBar />
          <ShopHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <ShopFooter />
        </>
      )}
    </div>
  );
}

export default function ShopLayout() {
  return (
    <ShopSettingsProvider>
      <ShopShell />
    </ShopSettingsProvider>
  );
}
