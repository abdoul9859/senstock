import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, CreditCard, Truck, ShieldCheck } from "lucide-react";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

function SocialIcon({ type }: { type: string }) {
  const paths: Record<string, string> = {
    facebook: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
    instagram: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z",
    tiktok: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z",
  };
  const d = paths[type];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  cash_on_delivery: "Paiement a la livraison",
  wave: "Wave",
  orange_money: "Orange Money",
  free_money: "Free Money",
  card: "Carte bancaire",
};

export function ShopFooter() {
  const { settings } = useShopSettings();
  const { contact, socialLinks, footer, commerce } = settings;

  const socials = Object.entries(socialLinks).filter(([, url]) => url);
  const hasContact = contact.phone || contact.email || contact.address;
  const activePayments = Object.entries(commerce.paymentMethods)
    .filter(([, enabled]) => enabled)
    .map(([key]) => PAYMENT_LABELS[key] || key);

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      {/* Trust bar */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {commerce.freeShippingThreshold > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Livraison gratuite</p>
                  <p className="text-xs text-muted-foreground">
                    A partir de {commerce.freeShippingThreshold.toLocaleString("fr-FR")}{commerce.currency}
                  </p>
                </div>
              </div>
            )}
            {activePayments.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Paiement securise</p>
                  <p className="text-xs text-muted-foreground">{activePayments.join(", ")}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Achat en confiance</p>
                <p className="text-xs text-muted-foreground">Service client disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            {settings.shopLogo ? (
              <img src={settings.shopLogo} alt={settings.shopName} className="h-8 mb-4 object-contain" />
            ) : (
              <h3 className="text-lg font-bold text-foreground mb-4">{settings.shopName}</h3>
            )}
            {settings.shopDescription && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {settings.shopDescription}
              </p>
            )}
            {socials.length > 0 && (
              <div className="flex gap-3">
                {socials.map(([type, url]) => (
                  <a
                    key={type}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    <SocialIcon type={type} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Boutique
                </Link>
              </li>
              <li>
                <Link to="/shop/panier" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Panier
                </Link>
              </li>
            </ul>
          </div>

          {/* Footer columns from settings */}
          {footer.columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.url}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact column */}
          {hasContact && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-3">
                {contact.phone && (
                  <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                      {contact.phone}
                    </a>
                  </li>
                )}
                {contact.email && (
                  <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.address && (
                  <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{contact.address}</span>
                  </li>
                )}
                {contact.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      <SocialIcon type="whatsapp" />
                      Contacter sur WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {footer.text || `\u00a9 ${new Date().getFullYear()} ${settings.shopName}. Tous droits reserves.`}
          </p>
          {activePayments.length > 0 && (
            <div className="flex items-center gap-2">
              {activePayments.map((p) => (
                <span key={p} className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
