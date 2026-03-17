import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Users, Building2, Settings, BarChart3, Shield, Rocket, Save, Loader2,
  CreditCard, Server, Database, Wifi, Activity, CheckCircle2, AlertTriangle,
  XCircle, Calendar, RefreshCw, Tag, Plus, Trash2, Pencil, Globe,
  Megaphone, ToggleLeft, Eye, TrendingUp, Crown, Gift,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Tab = "dashboard" | "subscriptions" | "promos" | "landing" | "system";

export default function SuperAdminPage() {
  const { loading: authLoading } = useAuth();
  const token = localStorage.getItem("senstock_token");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [checked, setChecked] = useState(false);
  const [isSA, setIsSA] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cache, setCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const api = useCallback(async (path: string, method = "GET", body?: unknown) => {
    const res = await fetch(`/api/super-admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Erreur");
    return res.json();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setIsSA(!!d.user?.isSuperAdmin); setChecked(true); })
      .catch(() => setChecked(true));
  }, [token]);

  const endpoints: Record<Tab, string> = {
    dashboard: "/stats", subscriptions: "/subscriptions", promos: "/promos",
    landing: "/config", system: "/health",
  };

  const load = useCallback(async (t?: Tab) => {
    const target = t || tab;
    if (!checked || !isSA) return;
    setLoading(true);
    try {
      const result = await api(endpoints[target]);
      setCache((prev) => ({ ...prev, [target]: result }));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [tab, checked, isSA, api]);

  useEffect(() => {
    if (checked && isSA && !cache[tab]) load();
  }, [tab, checked, isSA]);

  const reload = () => { setCache((p) => ({ ...p, [tab]: undefined })); load(); };
  const data = cache[tab] || null;

  if (!checked || authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isSA) return <Navigate to="/" replace />;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "subscriptions", label: "Abonnements", icon: CreditCard },
    { id: "promos", label: "Codes promo", icon: Tag },
    { id: "landing", label: "Landing page", icon: Globe },
    { id: "system", label: "Systeme", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Administration</h1>
              <p className="text-xs text-muted-foreground">Gestion de la plateforme SenStock</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/entrepot/inventaire")}>
              Retour a l'app
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 flex gap-6">
        <div className="w-52 shrink-0 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {loading && !data ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {tab === "dashboard" && data && <DashboardTab data={data} />}
              {tab === "subscriptions" && data && <SubscriptionsTab data={data} api={api} reload={reload} />}
              {tab === "promos" && data && <PromosTab data={data} api={api} reload={reload} />}
              {tab === "landing" && data && <LandingTab data={data} api={api} />}
              {tab === "system" && data && <SystemTab data={data} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DashboardTab({ data }: { data: any }) {
  const cards = [
    { label: "Entreprises", value: data.totals.tenants, icon: Building2, color: "text-blue-500" },
    { label: "Actives", value: data.totals.activeTenants, icon: CheckCircle2, color: "text-green-500" },
    { label: "Utilisateurs", value: data.totals.users, icon: Users, color: "text-emerald-500" },
    { label: "Codes promo", value: data.totals.activePromos, icon: Tag, color: "text-purple-500" },
  ];

  const months = Object.keys(data.monthlySignups || {}).sort();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Vue d'ensemble</h2>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{fmt(c.value)}</p>
                </div>
                <c.icon className={`h-7 w-7 ${c.color} opacity-40`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Repartition des plans</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.planDistribution.map((p: { plan: string; count: number }) => {
                const colors: Record<string, string> = { lancement: "bg-green-500", essai: "bg-blue-500", premium: "bg-purple-500", revendeur: "bg-amber-500", entreprise: "bg-red-500" };
                return (
                  <div key={p.plan} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${colors[p.plan] || "bg-gray-500"}`} />
                      <span className="font-medium capitalize">{p.plan}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary/20 w-20">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (p.count / data.totals.tenants) * 100)}%` }} />
                      </div>
                      <span className="text-muted-foreground w-6 text-right">{p.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Monthly signups */}
        {months.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Inscriptions mensuelles</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {months.slice(-6).map((m) => (
                  <div key={m} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-20">{m}</span>
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <div className="h-2 rounded-full bg-primary/20 flex-1">
                        <div className="h-2 rounded-full bg-primary" style={{
                          width: `${Math.min(100, (data.monthlySignups[m] / Math.max(...Object.values(data.monthlySignups) as number[])) * 100)}%`
                        }} />
                      </div>
                      <span className="font-medium w-6 text-right">{data.monthlySignups[m]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent signups */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dernieres inscriptions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.latestSignups?.map((t: { id: string; name: string; plan: string; subscriptionStatus: string; createdAt: string; _count: { users: number } }) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t._count.users} utilisateur(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize text-xs">{t.plan}</Badge>
                    <Badge variant={t.subscriptionStatus === "active" ? "default" : "outline"} className="text-xs">{t.subscriptionStatus}</Badge>
                    <span className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// ABONNEMENTS
// ════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubscriptionsTab({ data, api, reload }: { data: any[]; api: any; reload: () => void }) {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const filtered = data.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan && t.plan !== filterPlan) return false;
    return true;
  });

  const changePlan = async (id: string, plan: string) => {
    try { await api(`/subscriptions/${id}`, "PUT", { plan }); toast.success("Plan mis a jour"); reload(); }
    catch { toast.error("Erreur"); }
  };

  const changeStatus = async (id: string, status: string) => {
    try { await api(`/subscriptions/${id}`, "PUT", { subscriptionStatus: status }); toast.success("Statut mis a jour"); reload(); }
    catch { toast.error("Erreur"); }
  };

  const suspend = async (id: string, isDeleted: boolean) => {
    try { await api(`/subscriptions/${id}`, "PUT", { deleted: !isDeleted }); toast.success(isDeleted ? "Reactive" : "Suspendu"); reload(); }
    catch { toast.error("Erreur"); }
  };

  const plans = ["lancement", "essai", "revendeur", "premium", "entreprise"];
  const statuses = ["active", "trialing", "past_due", "canceled"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Abonnements ({data.length})</h2>
        <div className="flex gap-2">
          <select className="text-sm rounded-md border bg-background px-2 py-1.5" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
            <option value="">Tous les plans</option>
            {plans.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
          <Input placeholder="Rechercher..." className="w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium">Entreprise</th>
              <th className="px-3 py-2.5 text-left font-medium">Plan</th>
              <th className="px-3 py-2.5 text-left font-medium">Statut</th>
              <th className="px-3 py-2.5 text-center font-medium">Users</th>
              <th className="px-3 py-2.5 text-left font-medium">Inscription</th>
              <th className="px-3 py-2.5 text-left font-medium">Fin essai</th>
              <th className="px-3 py-2.5 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className={`border-b hover:bg-muted/30 ${t.deleted ? "opacity-40" : ""}`}>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{t.name}</p>
                  {!t.onboardingCompleted && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500">Onboarding</Badge>}
                </td>
                <td className="px-3 py-2.5">
                  <select className="text-xs rounded border bg-background px-1.5 py-1 capitalize"
                    value={t.plan} onChange={(e) => changePlan(t.id, e.target.value)}>
                    {plans.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <select className="text-xs rounded border bg-background px-1.5 py-1"
                    value={t.subscriptionStatus} onChange={(e) => changeStatus(t.id, e.target.value)}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-center">{t._count.users}</td>
                <td className="px-3 py-2.5 text-xs">{fmtDate(t.createdAt)}</td>
                <td className="px-3 py-2.5 text-xs">{t.trialEndsAt ? fmtDate(t.trialEndsAt) : "—"}</td>
                <td className="px-3 py-2.5 text-center">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => suspend(t.id, t.deleted)}>
                    {t.deleted ? "Reactiver" : "Suspendre"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// CODES PROMO
// ════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PromosTab({ data, api, reload }: { data: any[]; api: any; reload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", discountPercent: 20, discountMonths: 1, maxUses: 0, validUntil: "", planFilter: "" });
  const [saving, setSaving] = useState(false);

  const createPromo = async () => {
    if (!form.code.trim()) { toast.error("Le code est requis"); return; }
    setSaving(true);
    try {
      await api("/promos", "POST", { ...form, validUntil: form.validUntil || null });
      toast.success("Code promo cree");
      setForm({ code: "", description: "", discountPercent: 20, discountMonths: 1, maxUses: 0, validUntil: "", planFilter: "" });
      setShowForm(false);
      reload();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    try { await api(`/promos/${id}`, "PUT", { active: !active }); reload(); }
    catch { toast.error("Erreur"); }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    try { await api(`/promos/${id}`, "DELETE"); toast.success("Supprime"); reload(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Codes promo ({data.length})</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau code
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input placeholder="SENSTOCK50" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="50% de reduction pendant 3 mois" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Reduction (%)</Label>
                <Input type="number" min={0} max={100} value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mois offerts / reduits</Label>
                <Input type="number" min={1} value={form.discountMonths}
                  onChange={(e) => setForm({ ...form, discountMonths: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Utilisations max (0 = illimite)</Label>
                <Input type="number" min={0} value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Valide jusqu'au</Label>
                <Input type="date" value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createPromo} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Creer
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 text-left font-medium">Code</th>
              <th className="px-3 py-2.5 text-left font-medium">Description</th>
              <th className="px-3 py-2.5 text-center font-medium">Reduction</th>
              <th className="px-3 py-2.5 text-center font-medium">Mois</th>
              <th className="px-3 py-2.5 text-center font-medium">Utilise</th>
              <th className="px-3 py-2.5 text-left font-medium">Expire</th>
              <th className="px-3 py-2.5 text-center font-medium">Actif</th>
              <th className="px-3 py-2.5 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Aucun code promo</td></tr>
            )}
            {data.map((p) => (
              <tr key={p.id} className={`border-b hover:bg-muted/30 ${!p.active ? "opacity-50" : ""}`}>
                <td className="px-3 py-2.5">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-bold">{p.code}</code>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{p.description || "—"}</td>
                <td className="px-3 py-2.5 text-center font-medium">{p.discountPercent}%</td>
                <td className="px-3 py-2.5 text-center">{p.discountMonths}</td>
                <td className="px-3 py-2.5 text-center">
                  {p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : ""}
                </td>
                <td className="px-3 py-2.5 text-xs">{p.validUntil ? fmtDate(p.validUntil) : "Illimite"}</td>
                <td className="px-3 py-2.5 text-center">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p.id, p.active)} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePromo(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// LANDING PAGE
// ════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LandingTab({ data, api }: { data: any; api: any }) {
  const [config, setConfig] = useState(data);
  const [saving, setSaving] = useState(false);
  const u = (key: string, value: unknown) => setConfig({ ...config, [key]: value });

  const save = async () => {
    setSaving(true);
    try { await api("/config", "PUT", config); toast.success("Configuration sauvegardee"); }
    catch { toast.error("Erreur"); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Landing page & Configuration</h2>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Sauvegarder
        </Button>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom de l'application</Label>
              <Input value={config.appName || ""} onChange={(e) => u("appName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email de support</Label>
              <Input value={config.supportEmail || ""} onChange={(e) => u("supportEmail", e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Mode maintenance</p>
              <p className="text-xs text-muted-foreground">Affiche une page de maintenance pour tous les utilisateurs</p>
            </div>
            <Switch checked={config.maintenanceMode} onCheckedChange={(v) => u("maintenanceMode", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Hero */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Hero & Banniere</CardTitle>
          <CardDescription>Textes affiches sur la page d'accueil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre principal</Label>
            <Input value={config.heroTitle || ""} onChange={(e) => u("heroTitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sous-titre</Label>
            <Input value={config.heroSubtitle || ""} onChange={(e) => u("heroSubtitle", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Texte du bouton CTA</Label>
              <Input value={config.heroCtaText || ""} onChange={(e) => u("heroCtaText", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bandeau d'annonce (vide = masque)</Label>
              <Input placeholder="Offre de lancement : acces gratuit !" value={config.announcementBanner || ""} onChange={(e) => u("announcementBanner", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Afficher les temoignages</Label>
              <Switch checked={config.showTestimonials} onCheckedChange={(v) => u("showTestimonials", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Afficher les tarifs</Label>
              <Switch checked={config.showPricing} onCheckedChange={(v) => u("showPricing", v)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Texte footer</Label>
            <Input value={config.footerText || ""} onChange={(e) => u("footerText", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Lancement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Rocket className="h-4 w-4" /> Periode de lancement</CardTitle>
          <CardDescription>Gerez la periode gratuite pour les early-adopters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium text-sm">Lancement actif</p>
              <p className="text-xs text-muted-foreground">Tous les nouveaux inscrits ont acces gratuitement a toutes les fonctionnalites</p>
            </div>
            <Switch checked={config.launchActive} onCheckedChange={(v) => u("launchActive", v)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date de fin du lancement</Label>
              <Input type="date" value={config.launchEndDate?.substring(0, 10) || ""} onChange={(e) => u("launchEndDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reduction early-adopter (%)</Label>
              <Input type="number" min={0} max={100} value={config.earlyAdopterDiscount || 0}
                onChange={(e) => u("earlyAdopterDiscount", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarifs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4" /> Tarifs des plans (FCFA/mois)</CardTitle>
          <CardDescription>Modifiez les prix affiches sur la landing page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Revendeur</Label>
              <Input type="number" value={config.priceRevendeur || 0} onChange={(e) => u("priceRevendeur", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Premium</Label>
              <Input type="number" value={config.pricePremium || 0} onChange={(e) => u("pricePremium", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Entreprise</Label>
              <Input type="number" value={config.priceEntreprise || 0} onChange={(e) => u("priceEntreprise", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methodes de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Methodes de paiement</CardTitle>
          <CardDescription>Activez ou desactivez les moyens de paiement disponibles pour les abonnements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "payOrangeMoney", label: "Orange Money", desc: "Paiement mobile Orange" },
              { key: "payWave", label: "Wave", desc: "Paiement mobile Wave" },
              { key: "payFreeMoney", label: "Free Money", desc: "Paiement mobile Free" },
              { key: "payStripe", label: "Carte bancaire (Stripe)", desc: "Visa, Mastercard via Stripe" },
              { key: "payBankTransfer", label: "Virement bancaire", desc: "Transfert bancaire direct" },
              { key: "payCash", label: "Especes", desc: "Paiement en cash au bureau" },
            ].map((m) => (
              <div key={m.key} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
                <Switch checked={!!config[m.key]} onCheckedChange={(v) => u(m.key, v)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════
// SYSTEM
// ════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SystemTab({ data }: { data: any }) {
  const upHours = Math.floor(data.uptime / 3600);
  const upMins = Math.floor((data.uptime % 3600) / 60);
  const memMB = Math.round((data.memoryUsage?.rss || 0) / 1024 / 1024);
  const heapMB = Math.round((data.memoryUsage?.heapUsed || 0) / 1024 / 1024);

  const checks = [
    { label: "API Server", status: data.status === "ok" ? "ok" : "error", detail: `Uptime: ${upHours}h ${upMins}m`, icon: Server },
    { label: "Base de donnees", status: data.dbLatency < 100 ? "ok" : "warning", detail: `Latence: ${data.dbLatency}ms`, icon: Database },
    { label: "WhatsApp", status: data.whatsappStatus === "ok" ? "ok" : data.whatsappStatus === "unreachable" ? "error" : "warning", detail: data.whatsappStatus, icon: Wifi },
    { label: "Memoire", status: memMB < 500 ? "ok" : "warning", detail: `RSS: ${memMB} MB / Heap: ${heapMB} MB`, icon: Activity },
    { label: "Node.js", status: "ok", detail: data.nodeVersion, icon: Server },
  ];

  const statusColors: Record<string, string> = { ok: "text-green-500", warning: "text-amber-500", error: "text-red-500" };
  const statusIcons: Record<string, React.ElementType> = { ok: CheckCircle2, warning: AlertTriangle, error: XCircle };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Sante du systeme</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => {
          const StatusIcon = statusIcons[c.status];
          return (
            <Card key={c.label}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <c.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{c.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                    </div>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${statusColors[c.status]}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
