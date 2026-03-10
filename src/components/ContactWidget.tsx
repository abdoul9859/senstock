import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export function ContactWidget() {
  const [open, setOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/company-settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWhatsapp(data.supportWhatsapp || "");
        setEmail(data.supportEmail || "");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Don't render if no contact info configured
  if (!whatsapp && !email) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Popup menu */}
      {open && (
        <div className="mb-2 rounded-xl border border-border bg-background shadow-lg p-3 space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-200 min-w-[200px]">
          <p className="text-xs font-medium text-muted-foreground px-1">Contactez-nous</p>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 text-primary"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          )}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
          open
            ? "bg-muted text-foreground"
            : "bg-green-500 text-white hover:bg-green-600"
        )}
        title="Contactez-nous"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
