import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, Users, ShoppingCart, MapPin, CalendarClock, ArrowRight, Phone, Mail,
} from "lucide-react";
import { StatCard } from "@/components/StockCard";
import { StockLoader } from "@/components/StockLoader";

const TOKEN_KEY = "mbayestock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface OrderStats {
  total: number;
  brouillon: number;
  envoyee: number;
  confirmee: number;
  en_transit: number;
  livree: number;
  totalValue: number;
  pendingValue: number;
}

const quickLinks = [
  { label: "Fournisseurs", url: "/logistique/fournisseurs", icon: Users },
  { label: "Commandes", url: "/logistique/commandes", icon: ShoppingCart },
  { label: "Livraisons", url: "/logistique/livraisons", icon: MapPin },
  { label: "Planification", url: "/logistique/planification", icon: CalendarClock },
];

const LogistiqueDashboard = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        fetch("/api/suppliers", { headers: getHeaders() }),
        fetch("/api/purchase-orders/stats", { headers: getHeaders() }),
      ]);
      if (sRes.ok) setSuppliers(await sRes.json());
      if (oRes.ok) setStats(await oRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recentSuppliers = suppliers.slice(0, 6);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Vue d'ensemble — Logistique</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Résumé de votre réseau fournisseurs</p>
      </div>

      {loading ? <StockLoader /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="animate-card"><StatCard label="Fournisseurs" value={String(suppliers.length)} icon={Truck} /></div>
            <div className="animate-card"><StatCard label="Commandes en cours" value={String((stats?.envoyee || 0) + (stats?.confirmee || 0) + (stats?.en_transit || 0))} icon={ShoppingCart} /></div>
            <div className="animate-card"><StatCard label="En transit" value={String(stats?.en_transit || 0)} icon={MapPin} /></div>
            <div className="animate-card"><StatCard label="Livrées" value={String(stats?.livree || 0)} icon={CalendarClock} /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Suppliers list */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Fournisseurs récents</h3>
                <button
                  onClick={() => navigate("/logistique/fournisseurs")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {recentSuppliers.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucun fournisseur enregistré
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentSuppliers.map((s) => (
                    <div key={s._id} className="flex items-center gap-3 px-5 py-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {s.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {s.phone}
                            </span>
                          )}
                          {s.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                              <Mail className="h-3 w-3" /> {s.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Accès rapides</h3>
              </div>
              <div className="p-3 space-y-1">
                {quickLinks.map(({ label, url, icon: Icon }) => (
                  <button
                    key={url}
                    onClick={() => navigate(url)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LogistiqueDashboard;
