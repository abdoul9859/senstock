import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Settings, User, Building2, FileText, ShoppingCart, Landmark,
  ArrowRight, Save, Shield, Loader2, Phone, Mail, Globe, MessageCircle,
  CreditCard, Check, Crown, Star, ExternalLink, AlertCircle, X, Users,
  Download, Upload, Database, HardDrive,
} from "lucide-react";

const TOKEN_KEY = "senstock_token";

function getHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const moduleLinks = [
  { label: "Entrepot", description: "Stock, seuils, codes-barres, devise", url: "/entrepot/parametres", icon: Building2 },
  { label: "Commerce", description: "Templates facture, infos entreprise, couleurs", url: "/commerce/parametres", icon: FileText },
  { label: "Boutique", description: "Nom boutique, description, livraison", url: "/boutique/parametres", icon: ShoppingCart },
  { label: "Banque", description: "Devise, transactions par page, rapprochement", url: "/banque/parametres", icon: Landmark },
  { label: "Equipe", description: "Gerants, permissions et acces", url: "/equipe", icon: Users },
];

const PLANS = [
  {
    key: "essai",
    label: "Essai Gratuit",
    price: "0 FCFA",
    period: "/ 14 jours",
    icon: Star,
    highlight: false,
    features: [
      "Entrepot (50 produits)",
      "Commerce (20 factures/mois)",
      "1 utilisateur",
      "500 Mo de stockage",
    ],
    missing: [
      "Export PDF",
      "Boutique en ligne",
      "Personnel & Salaires",
      "Banque & Tresorerie",
      "Analytique avancee",
      "Pilotage & Taches",
    ],
  },
  {
    key: "revendeur",
    label: "Revendeur",
    price: "9 900 FCFA",
    period: "/mois",
    icon: ShoppingCart,
    highlight: false,
    features: [
      "Entrepot (500 produits)",
      "Commerce (200 factures/mois)",
      "3 utilisateurs",
      "2 Go de stockage",
      "Export PDF & CSV",
    ],
    missing: [
      "Boutique en ligne",
      "Personnel & Salaires",
      "Banque & Tresorerie",
      "Analytique avancee",
      "Pilotage & Taches",
    ],
  },
  {
    key: "premium",
    label: "Premium",
    price: "19 900 FCFA",
    period: "/mois",
    icon: Crown,
    highlight: true,
    features: [
      "Tous les 8 modules",
      "5 000 produits",
      "1 000 factures/mois",
      "10 utilisateurs",
      "10 Go de stockage",
      "Export PDF & Excel",
      "Support prioritaire",
    ],
    missing: [
      "Multi-tenant",
      "Acces API",
      "White-label",
    ],
  },
  {
    key: "entreprise",
    label: "Entreprise",
    price: "99 900 FCFA",
    period: "/mois",
    icon: Crown,
    highlight: false,
    features: [
      "Tout illimite",
      "100 Go de stockage",
      "Multi-tenant & API",
      "White-label",
      "Support dedie 24/7",
    ],
    missing: [],
  },
];

const PLAN_ORDER: Record<string, number> = { essai: 0, revendeur: 1, premium: 2, entreprise: 3 };

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Periode d'essai",
  past_due: "Paiement en retard",
  canceled: "Annule",
  none: "Aucun",
};

interface CompanyForm {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  ninea: string;
  rc: string;
  currency: string;
  country: string;
  supportWhatsapp: string;
  supportEmail: string;
  whatsappEnabled: boolean;
  whatsappInstanceName: string;
  whatsappApiUrl: string;
  whatsappApiKey: string;
}

const emptyCompany: CompanyForm = {
  companyName: "", address: "", phone: "", email: "", website: "",
  ninea: "", rc: "", currency: "FCFA", country: "Sénégal",
  supportWhatsapp: "", supportEmail: "",
  whatsappEnabled: false, whatsappInstanceName: "", whatsappApiUrl: "", whatsappApiKey: "",
};

function BackupCard() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importType, setImportType] = useState<"senstock" | "legacy" | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; summary?: Record<string, number>; error?: string } | null>(null);
  const fileRef = useState<HTMLInputElement | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/backup/export", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("senstock_token")}` },
      });
      if (!res.ok) {
        toast.error("Erreur lors de l'export");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `senstock_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exporte avec succes");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File, legacy: boolean) {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = legacy ? "/api/backup/import-legacy" : "/api/backup/import";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("senstock_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ success: true, summary: data.summary || data.stats });
        toast.success("Import termine avec succes");
      } else {
        setImportResult({ success: false, error: data.error || "Erreur d'import" });
        toast.error(data.error || "Erreur d'import");
      }
    } catch {
      setImportResult({ success: false, error: "Impossible de contacter le serveur" });
      toast.error("Impossible de contacter le serveur");
    } finally {
      setImporting(false);
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImport(file, importType === "legacy");
    e.target.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          Sauvegarde et importation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">Exporter les donnees</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Telecharge une sauvegarde complete de toutes vos donnees (produits, clients, factures, devis...) au format JSON.
          </p>
          <Button onClick={handleExport} disabled={exporting} size="sm" variant="outline">
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Exporter le backup
          </Button>
        </div>

        {/* Import */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-500" />
            <span className="font-medium text-sm">Importer des donnees</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Importez des donnees depuis un backup SenStock ou depuis l'ancienne application.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant={importType === "senstock" ? "default" : "outline"}
              onClick={() => setImportType("senstock")}
              disabled={importing}
            >
              <HardDrive className="h-4 w-4 mr-1" />
              Depuis SenStock
            </Button>
            <Button
              size="sm"
              variant={importType === "legacy" ? "default" : "outline"}
              onClick={() => setImportType("legacy")}
              disabled={importing}
            >
              <Database className="h-4 w-4 mr-1" />
              Depuis ancienne application
            </Button>
          </div>

          {importType && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {importType === "senstock"
                  ? "Selectionnez un fichier .json exporte depuis SenStock."
                  : "Selectionnez un fichier .json ou .dump exporte depuis l'ancienne application."}
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm hover:bg-accent transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {importing ? "Importation en cours..." : "Choisir un fichier"}
                </span>
                <input
                  type="file"
                  accept=".json,.dump"
                  onChange={onFileSelected}
                  className="hidden"
                  disabled={importing}
                />
                {importing && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </label>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-md p-3 text-sm ${importResult.success ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
              {importResult.success ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium text-emerald-600">
                    <Check className="h-4 w-4" />
                    Import reussi
                  </div>
                  {importResult.summary && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-2">
                      {Object.entries(importResult.summary).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}</span>
                          <span className="font-medium text-foreground">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {importResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParametresGlobalPage() {
  const navigate = useNavigate();
  const { user, tenant, refreshTenant } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompany);
  const [savingCompany, setSavingCompany] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ enabled: boolean; connected: boolean; state?: string }>({ enabled: false, connected: false });
  const [whatsappQR, setWhatsappQR] = useState<string | null>(null);
  const [connectingWA, setConnectingWA] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || "", email: user.email || "" });
    }
  }, [user]);

  const fetchCompanySettings = useCallback(async () => {
    try {
      const res = await fetch("/api/company-settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompanyForm({
          companyName: data.companyName || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          ninea: data.ninea || "",
          rc: data.rc || "",
          currency: data.currency || "FCFA",
          country: data.country || "Sénégal",
          supportWhatsapp: data.supportWhatsapp || "",
          supportEmail: data.supportEmail || "",
          whatsappEnabled: data.whatsappEnabled || false,
          whatsappInstanceName: data.whatsappInstanceName || "",
          whatsappApiUrl: data.whatsappApiUrl || "",
          whatsappApiKey: data.whatsappApiKey || "",
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompanySettings(); }, [fetchCompanySettings]);

  const fetchWhatsAppStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { headers: getHeaders() });
      if (res.ok) setWhatsappStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchWhatsAppStatus(); }, [fetchWhatsAppStatus]);

  const handleConnectWhatsApp = async () => {
    setConnectingWA(true);
    setWhatsappQR(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST", headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Evolution API returns base64 QR or pairingCode
      if (data.base64) setWhatsappQR(data.base64);
      else if (data.code) setWhatsappQR(data.code);
      else toast.info("Veuillez scanner le QR code sur l'interface Evolution API.");
      // Poll status after 10s
      setTimeout(fetchWhatsAppStatus, 10000);
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion WhatsApp");
    } finally {
      setConnectingWA(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST", headers: getHeaders() });
      if (res.ok) {
        setWhatsappStatus({ enabled: false, connected: false });
        toast.success("WhatsApp deconnecte");
      }
    } catch { toast.error("Erreur de deconnexion"); }
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) { toast.error("Le nom est requis"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ name: profileForm.name.trim(), email: profileForm.email.trim() }),
      });
      if (res.ok) {
        toast.success("Profil mis a jour");
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!passwordForm.current || !passwordForm.newPass) {
      toast.error("Remplissez tous les champs");
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error("Le mot de passe doit avoir au moins 6 caracteres");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPass,
        }),
      });
      if (res.ok) {
        toast.success("Mot de passe modifie");
        setPasswordForm({ current: "", newPass: "", confirm: "" });
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } catch { toast.error("Erreur de connexion"); }
    setSaving(false);
  };

  const saveCompanySettings = async () => {
    setSavingCompany(true);
    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(companyForm),
      });
      if (res.ok) {
        toast.success("Informations entreprise enregistrees");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch { toast.error("Erreur de connexion"); }
    setSavingCompany(false);
  };

  const updateCompany = (key: keyof CompanyForm, value: string) => {
    setCompanyForm((f) => ({ ...f, [key]: value }));
  };

  const handleUpgrade = async (plan: string) => {
    setLoadingCheckout(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.ok && data.success) {
        toast.success("Plan mis a jour avec succes !");
        if (refreshTenant) refreshTenant();
      } else {
        toast.error(data.error || "Erreur lors de la creation de la session");
      }
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handlePortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Aucun abonnement Stripe actif trouve");
      }
    } catch {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setLoadingPortal(false);
    }
  };

  const currentPlan = tenant?.plan || "free";
  const currentStatus = tenant?.subscriptionStatus || "none";
  const currentPlanConfig = PLANS.find((p) => p.key === currentPlan)!;
  const PlanIcon = currentPlanConfig?.icon || Star;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Parametres
        </h1>
        <p className="text-muted-foreground">
          Profil utilisateur, entreprise et configuration des modules
        </p>
      </div>

      <div className="max-w-3xl space-y-6">

        {/* ── Abonnement ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Plan actuel */}
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <PlanIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Plan {currentPlanConfig?.label}</span>
                    <Badge variant={currentStatus === "active" || currentStatus === "trialing" ? "default" : "secondary"} className="text-xs">
                      {STATUS_LABELS[currentStatus] || currentStatus}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {currentPlanConfig?.price}{currentPlanConfig?.period}
                    {tenant?.trialEndsAt && (
                      <span className="ml-2 text-yellow-500">
                        · Essai jusqu'au {new Date(tenant.trialEndsAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton gerer si plan paye */}
              {currentPlan !== "essai" && (
                <Button size="sm" variant="outline" onClick={handlePortal} disabled={loadingPortal}>
                  {loadingPortal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Gerer l'abonnement
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Alerte past_due */}
            {currentStatus === "past_due" && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Votre dernier paiement a echoue. Mettez a jour votre moyen de paiement pour conserver l'acces.</span>
              </div>
            )}

            {/* Features du plan actuel */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                Inclus dans votre plan
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {currentPlanConfig?.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {currentPlanConfig?.missing.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <X className="h-3.5 w-3.5 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cartes d'upgrade (si pas enterprise) */}
            {currentPlan !== "entreprise" && (
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                  Changer de plan
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PLANS.filter((p) => p.key !== currentPlan).map((plan) => {
                    const Icon = plan.icon;
                    const isLoading = loadingCheckout === plan.key;
                    const isDowngrade = (PLAN_ORDER[plan.key] ?? 0) < (PLAN_ORDER[currentPlan] ?? 0);
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-lg border p-4 flex flex-col gap-3 ${plan.highlight ? "border-primary bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${plan.key === "enterprise" ? "text-yellow-500" : "text-primary"}`} />
                            <span className="font-semibold text-sm">{plan.label}</span>
                            {plan.highlight && (
                              <Badge className="text-xs">Populaire</Badge>
                            )}
                          </div>
                          <span className="text-sm font-bold">{plan.price}<span className="text-xs text-muted-foreground">{plan.period}</span></span>
                        </div>

                        <div className="space-y-1">
                          {plan.features.slice(0, 4).map((f) => (
                            <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-primary shrink-0" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>

                        {isDowngrade ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={handlePortal}
                            disabled={loadingPortal}
                          >
                            {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retourner au gratuit"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            variant={plan.highlight ? "default" : "outline"}
                            onClick={() => handleUpgrade(plan.key)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>Passer a {plan.label}</>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Role : {user?.role || "utilisateur"}</span>
            </div>
            <Button onClick={saveProfile} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Informations de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom de l'entreprise</Label>
                <Input
                  value={companyForm.companyName}
                  onChange={(e) => updateCompany("companyName", e.target.value)}
                  placeholder="Ex: SenStock SARL"
                />
              </div>
              <div>
                <Label>Pays</Label>
                <Input
                  value={companyForm.country}
                  onChange={(e) => updateCompany("country", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={companyForm.address}
                onChange={(e) => updateCompany("address", e.target.value)}
                placeholder="Ex: Dakar, Sénégal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telephone</Label>
                <Input
                  value={companyForm.phone}
                  onChange={(e) => updateCompany("phone", e.target.value)}
                  placeholder="Ex: +221 77 000 00 00"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => updateCompany("email", e.target.value)}
                  placeholder="Ex: contact@entreprise.sn"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Site web</Label>
                <Input
                  value={companyForm.website}
                  onChange={(e) => updateCompany("website", e.target.value)}
                  placeholder="Ex: https://entreprise.sn"
                />
              </div>
              <div>
                <Label>Devise</Label>
                <Input
                  value={companyForm.currency}
                  onChange={(e) => updateCompany("currency", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NINEA</Label>
                <Input
                  value={companyForm.ninea}
                  onChange={(e) => updateCompany("ninea", e.target.value)}
                  placeholder="Numero d'identification fiscale"
                />
              </div>
              <div>
                <Label>Registre de Commerce (RC)</Label>
                <Input
                  value={companyForm.rc}
                  onChange={(e) => updateCompany("rc", e.target.value)}
                  placeholder="Numero RC"
                />
              </div>
            </div>
            <Button onClick={saveCompanySettings} disabled={savingCompany} size="sm">
              {savingCompany ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Support & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Support & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ces informations sont utilisees par le widget "Contactez-nous" visible par tous les utilisateurs.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3 text-green-500" /> WhatsApp
                </Label>
                <Input
                  value={companyForm.supportWhatsapp}
                  onChange={(e) => updateCompany("supportWhatsapp", e.target.value)}
                  placeholder="Ex: 221770000000 (sans +)"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email support
                </Label>
                <Input
                  type="email"
                  value={companyForm.supportEmail}
                  onChange={(e) => updateCompany("supportEmail", e.target.value)}
                  placeholder="Ex: support@entreprise.sn"
                />
              </div>
            </div>
            <Button onClick={saveCompanySettings} disabled={savingCompany} size="sm">
              {savingCompany ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* WhatsApp Business (Evolution API) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp Business
              {whatsappStatus.connected ? (
                <Badge variant="outline" className="ml-2 text-green-600 border-green-300 bg-green-50">Connecte</Badge>
              ) : companyForm.whatsappEnabled ? (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300 bg-amber-50">Deconnecte</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Connectez votre WhatsApp Business pour envoyer factures, devis et relances directement a vos clients.
            </p>

            <div className="flex items-center gap-3">
              <Label htmlFor="wa-toggle" className="text-sm">Activer WhatsApp</Label>
              <button
                id="wa-toggle"
                role="switch"
                aria-checked={companyForm.whatsappEnabled}
                onClick={() => updateCompany("whatsappEnabled", !companyForm.whatsappEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${companyForm.whatsappEnabled ? "bg-green-500" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${companyForm.whatsappEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {companyForm.whatsappEnabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom de l'instance</Label>
                    <Input
                      value={companyForm.whatsappInstanceName}
                      onChange={(e) => updateCompany("whatsappInstanceName", e.target.value)}
                      placeholder="senstock"
                    />
                  </div>
                  <div>
                    <Label>URL Evolution API</Label>
                    <Input
                      value={companyForm.whatsappApiUrl}
                      onChange={(e) => updateCompany("whatsappApiUrl", e.target.value)}
                      placeholder="http://localhost:8085"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Cle API</Label>
                    <Input
                      type="password"
                      value={companyForm.whatsappApiKey}
                      onChange={(e) => updateCompany("whatsappApiKey", e.target.value)}
                      placeholder="Votre cle API Evolution"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={saveCompanySettings} disabled={savingCompany} size="sm">
                    {savingCompany ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Enregistrer
                  </Button>
                  {!whatsappStatus.connected ? (
                    <Button onClick={handleConnectWhatsApp} disabled={connectingWA} size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                      {connectingWA ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-1" />}
                      Connecter WhatsApp
                    </Button>
                  ) : (
                    <Button onClick={handleDisconnectWhatsApp} size="sm" variant="outline" className="text-red-500 border-red-300 hover:bg-red-50">
                      <X className="h-4 w-4 mr-1" /> Deconnecter
                    </Button>
                  )}
                  <Button onClick={fetchWhatsAppStatus} size="sm" variant="ghost">
                    Actualiser le statut
                  </Button>
                </div>

                {whatsappQR && (
                  <div className="mt-4 p-4 border border-border rounded-lg bg-white text-center">
                    <p className="text-sm font-medium mb-3">Scannez ce QR code avec WhatsApp</p>
                    {whatsappQR.startsWith("data:") || whatsappQR.startsWith("iVBOR") ? (
                      <img
                        src={whatsappQR.startsWith("data:") ? whatsappQR : `data:image/png;base64,${whatsappQR}`}
                        alt="QR Code WhatsApp"
                        className="mx-auto max-w-[256px]"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground font-mono">{whatsappQR}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ouvrez WhatsApp &gt; Appareils lies &gt; Lier un appareil
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Mot de passe actuel</Label>
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={passwordForm.newPass}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))}
                />
              </div>
              <div>
                <Label>Confirmer</Label>
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={changePassword} disabled={saving} size="sm" variant="outline">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
              Modifier le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* Import / Export */}
        <BackupCard />

        {/* Module settings links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Parametres des modules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {moduleLinks.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.url}
                  onClick={() => navigate(m.url)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
