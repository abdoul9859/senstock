import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Save,
  Store,
  Palette,
  Image,
  Phone,
  Share2,
  ShoppingCart,
  CreditCard,
  Mail,
  Megaphone,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { THEME_PRESETS, type ThemePreset } from "@/lib/themePresets";

// Use relative URLs — Vite proxy routes /api to the server

function getToken() {
  return localStorage.getItem("senstock_token") || "";
}

async function fetchSettings() {
  const res = await fetch(`/api/boutique/settings`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Erreur chargement parametres");
  return res.json();
}

async function putSettings(data: Record<string, any>) {
  const res = await fetch(`/api/boutique/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erreur sauvegarde");
  return res.json();
}

export default function BoutiqueParametresPage() {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      toast.error("Impossible de charger les parametres");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set(key: string, value: any) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setDirty(true);
  }

  function setNested(parent: string, key: string, value: any) {
    setSettings((s) => {
      if (!s) return s;
      return { ...s, [parent]: { ...s[parent], [key]: value } };
    });
    setDirty(true);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await putSettings(settings);
      setSettings(updated);
      setDirty(false);
      toast.success("Parametres enregistres");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  }

  function applyPreset(preset: ThemePreset) {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        themePreset: preset.id,
        primaryColor: preset.primaryColor,
        secondaryColor: preset.secondaryColor,
        accentColor: preset.accentColor,
        fontFamily: preset.fontFamily,
        borderRadius: preset.borderRadius,
        colorMode: preset.colorMode,
      };
    });
    setDirty(true);
  }

  // Footer columns management
  function addFooterColumn() {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || []), { title: "", links: [] }];
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  function removeFooterColumn(idx: number) {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || [])];
      cols.splice(idx, 1);
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  function updateFooterColumn(idx: number, field: string, value: any) {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || [])];
      cols[idx] = { ...cols[idx], [field]: value };
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  function addFooterLink(colIdx: number) {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || [])];
      cols[colIdx] = {
        ...cols[colIdx],
        links: [...(cols[colIdx].links || []), { label: "", url: "" }],
      };
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  function removeFooterLink(colIdx: number, linkIdx: number) {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || [])];
      const links = [...(cols[colIdx].links || [])];
      links.splice(linkIdx, 1);
      cols[colIdx] = { ...cols[colIdx], links };
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  function updateFooterLink(colIdx: number, linkIdx: number, field: string, value: string) {
    setSettings((s) => {
      if (!s) return s;
      const cols = [...(s.footerColumns || [])];
      const links = [...(cols[colIdx].links || [])];
      links[linkIdx] = { ...links[linkIdx], [field]: value };
      cols[colIdx] = { ...cols[colIdx], links };
      return { ...s, footerColumns: cols };
    });
    setDirty(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Impossible de charger les parametres.
        <Button variant="outline" className="ml-2" onClick={load}>
          Reessayer
        </Button>
      </div>
    );
  }

  const s = settings;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-6 w-6" />
            Parametres de la boutique
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurez et personnalisez votre boutique en ligne
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>

      <Tabs defaultValue="identite" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/50 p-1">
          <TabsTrigger value="identite" className="gap-1.5 text-xs">
            <Store className="h-3.5 w-3.5" /> Identite
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-1.5 text-xs">
            <Image className="h-3.5 w-3.5" /> Hero
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5 text-xs">
            <Palette className="h-3.5 w-3.5" /> Theme
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5 text-xs">
            <Phone className="h-3.5 w-3.5" /> Contact
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Social
          </TabsTrigger>
          <TabsTrigger value="commerce" className="gap-1.5 text-xs">
            <ShoppingCart className="h-3.5 w-3.5" /> Commerce
          </TabsTrigger>
          <TabsTrigger value="paydunya" className="gap-1.5 text-xs">
            <CreditCard className="h-3.5 w-3.5" /> PayDunya
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 text-xs">
            <Mail className="h-3.5 w-3.5" /> Email
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-1.5 text-xs">
            Footer
          </TabsTrigger>
          <TabsTrigger value="annonce" className="gap-1.5 text-xs">
            <Megaphone className="h-3.5 w-3.5" /> Annonce
          </TabsTrigger>
        </TabsList>

        {/* ── IDENTITE ── */}
        <TabsContent value="identite">
          <Section title="Identite de la boutique">
            <Field label="Nom de la boutique">
              <Input
                value={s.shopName || ""}
                onChange={(e) => set("shopName", e.target.value)}
                placeholder="Ma Boutique"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={s.shopDescription || ""}
                onChange={(e) => set("shopDescription", e.target.value)}
                placeholder="Decrivez votre boutique..."
                rows={3}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Logo (URL)">
                <Input
                  value={s.shopLogo || ""}
                  onChange={(e) => set("shopLogo", e.target.value)}
                  placeholder="/uploads/logo.png"
                />
                {s.shopLogo && (
                  <img
                    src={s.shopLogo.startsWith("http") ? s.shopLogo : `/uploads/${s.shopLogo}`}
                    alt="Logo"
                    className="mt-2 h-12 w-12 rounded object-contain border"
                  />
                )}
              </Field>
              <Field label="Favicon (URL)">
                <Input
                  value={s.shopFavicon || ""}
                  onChange={(e) => set("shopFavicon", e.target.value)}
                  placeholder="/uploads/favicon.ico"
                />
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* ── HERO ── */}
        <TabsContent value="hero">
          <Section title="Banniere Hero">
            <div className="flex items-center justify-between">
              <Label>Activer le hero</Label>
              <Switch
                checked={s.heroEnabled ?? true}
                onCheckedChange={(v) => set("heroEnabled", v)}
              />
            </div>
            {s.heroEnabled && (
              <>
                <Field label="Image hero (URL)">
                  <Input
                    value={s.heroImage || ""}
                    onChange={(e) => set("heroImage", e.target.value)}
                    placeholder="/uploads/hero.jpg ou https://..."
                  />
                  {s.heroImage && (
                    <div className="mt-2 h-32 w-full overflow-hidden rounded-lg border">
                      <img
                        src={s.heroImage.startsWith("http") ? s.heroImage : `/uploads/${s.heroImage}`}
                        alt="Hero preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </Field>
                <Field label="Titre">
                  <Input
                    value={s.heroTitle || ""}
                    onChange={(e) => set("heroTitle", e.target.value)}
                    placeholder="Bienvenue dans notre boutique"
                  />
                </Field>
                <Field label="Sous-titre">
                  <Input
                    value={s.heroSubtitle || ""}
                    onChange={(e) => set("heroSubtitle", e.target.value)}
                    placeholder="Decouvrez nos produits de qualite"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Texte du bouton CTA">
                    <Input
                      value={s.heroCTAText || ""}
                      onChange={(e) => set("heroCTAText", e.target.value)}
                      placeholder="Voir les produits"
                    />
                  </Field>
                  <Field label="Lien du CTA">
                    <Input
                      value={s.heroCTALink || ""}
                      onChange={(e) => set("heroCTALink", e.target.value)}
                      placeholder="/shop"
                    />
                  </Field>
                </div>
              </>
            )}
          </Section>
        </TabsContent>

        {/* ── THEME ── */}
        <TabsContent value="theme">
          <Section title="Theme et apparence">
            {/* Presets */}
            <div>
              <Label className="mb-2 block">Theme pre-defini</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      s.themePreset === preset.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <div className="flex justify-center gap-1 mb-2">
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: preset.preview.primary }}
                      />
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: preset.preview.bg }}
                      />
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: preset.preview.text }}
                      />
                    </div>
                    <span className="text-xs font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colors */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <Field label="Couleur primaire (HSL)">
                <Input
                  value={s.primaryColor || ""}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  placeholder="142 70% 45%"
                />
                <div
                  className="mt-1 h-6 w-full rounded border"
                  style={{ backgroundColor: `hsl(${s.primaryColor || "142 70% 45%"})` }}
                />
              </Field>
              <Field label="Couleur secondaire (HSL)">
                <Input
                  value={s.secondaryColor || ""}
                  onChange={(e) => set("secondaryColor", e.target.value)}
                  placeholder="0 0% 96%"
                />
                <div
                  className="mt-1 h-6 w-full rounded border"
                  style={{ backgroundColor: `hsl(${s.secondaryColor || "0 0% 96%"})` }}
                />
              </Field>
              <Field label="Couleur accent (HSL)">
                <Input
                  value={s.accentColor || ""}
                  onChange={(e) => set("accentColor", e.target.value)}
                  placeholder="0 0% 94%"
                />
                <div
                  className="mt-1 h-6 w-full rounded border"
                  style={{ backgroundColor: `hsl(${s.accentColor || "0 0% 94%"})` }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Police">
                <Input
                  value={s.fontFamily || ""}
                  onChange={(e) => set("fontFamily", e.target.value)}
                  placeholder="Inter"
                />
                <p className="text-xs text-muted-foreground mt-1">Nom Google Font</p>
              </Field>
              <Field label="Border radius">
                <Input
                  value={s.borderRadius || ""}
                  onChange={(e) => set("borderRadius", e.target.value)}
                  placeholder="0.5rem"
                />
              </Field>
              <Field label="Mode couleur">
                <select
                  value={s.colorMode || "light"}
                  onChange={(e) => set("colorMode", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="auto">Auto</option>
                </select>
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* ── CONTACT ── */}
        <TabsContent value="contact">
          <Section title="Informations de contact">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telephone">
                <Input
                  value={s.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+221 77 000 00 00"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={s.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contact@boutique.com"
                />
              </Field>
            </div>
            <Field label="Adresse">
              <Textarea
                value={s.address || ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Adresse de la boutique"
                rows={2}
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={s.whatsapp || ""}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="+221 77 000 00 00"
              />
            </Field>
          </Section>
        </TabsContent>

        {/* ── SOCIAL ── */}
        <TabsContent value="social">
          <Section title="Reseaux sociaux">
            <p className="text-sm text-muted-foreground">
              Ajoutez les liens vers vos profils. Laissez vide pour masquer.
            </p>
            <Field label="Facebook">
              <Input
                value={s.socialLinks?.facebook || ""}
                onChange={(e) => setNested("socialLinks", "facebook", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </Field>
            <Field label="Instagram">
              <Input
                value={s.socialLinks?.instagram || ""}
                onChange={(e) => setNested("socialLinks", "instagram", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </Field>
            <Field label="TikTok">
              <Input
                value={s.socialLinks?.tiktok || ""}
                onChange={(e) => setNested("socialLinks", "tiktok", e.target.value)}
                placeholder="https://tiktok.com/@..."
              />
            </Field>
            <Field label="Twitter / X">
              <Input
                value={s.socialLinks?.twitter || ""}
                onChange={(e) => setNested("socialLinks", "twitter", e.target.value)}
                placeholder="https://x.com/..."
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={s.socialLinks?.whatsapp || ""}
                onChange={(e) => setNested("socialLinks", "whatsapp", e.target.value)}
                placeholder="https://wa.me/221770000000"
              />
            </Field>
          </Section>
        </TabsContent>

        {/* ── COMMERCE ── */}
        <TabsContent value="commerce">
          <Section title="Commerce">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Devise">
                <Input
                  value={s.currency || " F"}
                  onChange={(e) => set("currency", e.target.value)}
                  placeholder=" F"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Suffixe affiche apres le montant (ex: " F", " FCFA", " €")
                </p>
              </Field>
              <Field label="Taux de taxe (%)">
                <Input
                  type="number"
                  value={s.taxRate ?? 0}
                  onChange={(e) => set("taxRate", Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Frais de livraison par defaut">
                <Input
                  type="number"
                  value={s.defaultShipping ?? 0}
                  onChange={(e) => set("defaultShipping", Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">0 = livraison gratuite</p>
              </Field>
              <Field label="Seuil livraison gratuite">
                <Input
                  type="number"
                  value={s.freeShippingThreshold ?? 0}
                  onChange={(e) => set("freeShippingThreshold", Number(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0 = pas de seuil. Sinon, gratuite au-dessus de ce montant
                </p>
              </Field>
            </div>

            <div className="pt-2">
              <Label className="mb-3 block">Methodes de paiement acceptees</Label>
              <div className="space-y-3">
                {[
                  { key: "cash_on_delivery", label: "Paiement a la livraison" },
                  { key: "wave", label: "Wave" },
                  { key: "orange_money", label: "Orange Money" },
                  { key: "free_money", label: "Free Money" },
                  { key: "card", label: "Carte bancaire" },
                ].map((m) => (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className="text-sm">{m.label}</span>
                    <Switch
                      checked={s.paymentMethods?.[m.key] ?? false}
                      onCheckedChange={(v) => setNested("paymentMethods", m.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── PAYDUNYA ── */}
        <TabsContent value="paydunya">
          <Section title="PayDunya">
            <p className="text-sm text-muted-foreground">
              Configurez vos cles PayDunya pour accepter les paiements en ligne (Wave, Orange Money, Free Money, carte).
              Ces informations sont confidentielles.
            </p>
            <Field label="Mode">
              <select
                value={s.paydunya?.mode || "test"}
                onChange={(e) => setNested("paydunya", "mode", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="test">Test</option>
                <option value="live">Production</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Master Key">
                <Input
                  value={s.paydunya?.masterKey || ""}
                  onChange={(e) => setNested("paydunya", "masterKey", e.target.value)}
                  placeholder="Votre Master Key"
                />
              </Field>
              <Field label="Private Key">
                <Input
                  value={s.paydunya?.privateKey || ""}
                  onChange={(e) => setNested("paydunya", "privateKey", e.target.value)}
                  placeholder="Votre Private Key"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Public Key">
                <Input
                  value={s.paydunya?.publicKey || ""}
                  onChange={(e) => setNested("paydunya", "publicKey", e.target.value)}
                  placeholder="Votre Public Key"
                />
              </Field>
              <Field label="Token">
                <Input
                  value={s.paydunya?.token || ""}
                  onChange={(e) => setNested("paydunya", "token", e.target.value)}
                  placeholder="Votre Token"
                />
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* ── EMAIL / SMTP ── */}
        <TabsContent value="email">
          <Section title="Configuration email (SMTP)">
            <p className="text-sm text-muted-foreground">
              Configurez le serveur SMTP pour envoyer les emails de confirmation et notification.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Serveur SMTP">
                <Input
                  value={s.smtp?.host || ""}
                  onChange={(e) => setNested("smtp", "host", e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </Field>
              <Field label="Port">
                <Input
                  type="number"
                  value={s.smtp?.port ?? 587}
                  onChange={(e) => setNested("smtp", "port", Number(e.target.value) || 587)}
                  placeholder="587"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Utilisateur">
                <Input
                  value={s.smtp?.user || ""}
                  onChange={(e) => setNested("smtp", "user", e.target.value)}
                  placeholder="email@gmail.com"
                />
              </Field>
              <Field label="Mot de passe">
                <Input
                  type="password"
                  value={s.smtp?.pass || ""}
                  onChange={(e) => setNested("smtp", "pass", e.target.value)}
                  placeholder="Mot de passe application"
                />
              </Field>
            </div>
            <Field label="Email expediteur (From)">
              <Input
                value={s.smtp?.from || ""}
                onChange={(e) => setNested("smtp", "from", e.target.value)}
                placeholder="Ma Boutique <noreply@boutique.com>"
              />
            </Field>
          </Section>
        </TabsContent>

        {/* ── FOOTER ── */}
        <TabsContent value="footer">
          <Section title="Pied de page">
            <Field label="Texte du footer">
              <Textarea
                value={s.footerText || ""}
                onChange={(e) => set("footerText", e.target.value)}
                placeholder="Mentions legales, conditions..."
                rows={3}
              />
            </Field>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <Label>Colonnes du footer</Label>
                <Button variant="outline" size="sm" onClick={addFooterColumn}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter une colonne
                </Button>
              </div>

              {(s.footerColumns || []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune colonne. Ajoutez-en pour creer un footer multi-colonnes.
                </p>
              )}

              <div className="space-y-4">
                {(s.footerColumns || []).map((col: any, colIdx: number) => (
                  <div key={colIdx} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={col.title || ""}
                        onChange={(e) => updateFooterColumn(colIdx, "title", e.target.value)}
                        placeholder="Titre de la colonne"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFooterColumn(colIdx)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {(col.links || []).map((link: any, linkIdx: number) => (
                      <div key={linkIdx} className="flex items-center gap-2 pl-2">
                        <Input
                          value={link.label || ""}
                          onChange={(e) =>
                            updateFooterLink(colIdx, linkIdx, "label", e.target.value)
                          }
                          placeholder="Label"
                          className="flex-1"
                        />
                        <Input
                          value={link.url || ""}
                          onChange={(e) =>
                            updateFooterLink(colIdx, linkIdx, "url", e.target.value)
                          }
                          placeholder="URL"
                          className="flex-1"
                        />
                        <button
                          onClick={() => removeFooterLink(colIdx, linkIdx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addFooterLink(colIdx)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter un lien
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* ── ANNONCE ── */}
        <TabsContent value="annonce">
          <Section title="Barre d'annonce">
            <p className="text-sm text-muted-foreground">
              Affichez une barre en haut de votre boutique pour les promotions ou informations importantes.
            </p>
            <div className="flex items-center justify-between">
              <Label>Activer la barre d'annonce</Label>
              <Switch
                checked={s.announcementEnabled ?? false}
                onCheckedChange={(v) => set("announcementEnabled", v)}
              />
            </div>
            {s.announcementEnabled && (
              <>
                <Field label="Texte de l'annonce">
                  <Input
                    value={s.announcementText || ""}
                    onChange={(e) => set("announcementText", e.target.value)}
                    placeholder="Livraison gratuite a partir de 50 000 F !"
                  />
                </Field>
                <Field label="Couleur de fond (HSL)">
                  <Input
                    value={s.announcementColor || ""}
                    onChange={(e) => set("announcementColor", e.target.value)}
                    placeholder="142 70% 45%"
                  />
                  <div
                    className="mt-1 h-6 w-full rounded border"
                    style={{ backgroundColor: `hsl(${s.announcementColor || "142 70% 45%"})` }}
                  />
                </Field>
              </>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4 max-w-3xl">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
