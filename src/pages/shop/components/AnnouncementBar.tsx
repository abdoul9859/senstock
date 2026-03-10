import { useState } from "react";
import { X } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

export function AnnouncementBar() {
  const { settings } = useShopSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!settings.announcement.enabled || !settings.announcement.text || dismissed) return null;

  const color = settings.announcement.color || settings.theme.primaryColor;

  return (
    <div
      className="relative flex items-center justify-center px-10 py-2.5 text-center text-sm font-medium text-white"
      style={{ backgroundColor: `hsl(${color})` }}
    >
      <span>{settings.announcement.text}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
