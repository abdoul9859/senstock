import { useRef } from "react";
import { Settings, RotateCcw, Palette, Building2, FileText, Check } from "lucide-react";
import { useCommerceSettings, DEFAULT_COMMERCE_SETTINGS } from "@/hooks/useCommerceSettings";
import { getEntrepotSettings } from "@/hooks/useEntrepotSettings";
import { templates, getTemplateById } from "@/components/invoice-templates";
import type { PrintInvoice } from "@/components/invoice-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Fake invoice data for template preview
const previewInvoice: PrintInvoice = {
  _id: "preview",
  number: "FAC-0042",
  type: "facture",
  status: "payee",
  client: { _id: "c1", name: "Moussa Diop", phone: "77 123 45 67", email: "moussa@email.com", address: "Dakar, Senegal" },
  date: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  items: [
    { _id: "i1", type: "product" as const, productId: { _id: "p1", name: "iPhone 15 Pro", brand: "Apple", model: "256GB", image: "" }, description: "iPhone 15 Pro", quantity: 1, unitPrice: 650000, purchasePrice: 520000, total: 650000 },
    { _id: "i2", type: "service" as const, description: "Coque de protection", quantity: 2, unitPrice: 5000, purchasePrice: 2000, total: 10000 },
  ],
  subtotal: 660000,
  showTax: true,
  taxRate: 18,
  taxAmount: 118800,
  total: 778800,
  payment: { enabled: true, amount: 778800, method: "mobile_money", date: new Date().toISOString() },
  warranty: { enabled: true, duration: "6 mois", description: "Garantie constructeur" },
  notes: "Merci pour votre achat !",
  signature: "",
  createdAt: new Date().toISOString(),
};

const ACCENT_PRESETS = [
  "#16a34a", // Green
  "#2563eb", // Blue
  "#7c3aed", // Violet
  "#dc2626", // Red
  "#ea580c", // Orange
  "#0891b2", // Cyan
  "#4f46e5", // Indigo
  "#111111", // Black
];

const CommerceParametresPage = () => {
  const { settings, updateSettings, resetSettings } = useCommerceSettings();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const currency = getEntrepotSettings().currency;

  function handleReset() {
    resetSettings();
    toast({ title: "Parametres reinitialises", description: "Toutes les valeurs ont ete remises par defaut." });
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      toast({ title: "Image trop volumineuse", description: "Le logo ne doit pas depasser 500 Ko.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ businessLogo: reader.result as string });
      toast({ title: "Logo mis a jour" });
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    updateSettings({ businessLogo: "" });
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Parametres Commerce
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personnalisez vos factures : template, informations entreprise, couleurs
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Template Selection ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Template de facture
            </CardTitle>
            <CardDescription>Selectionnez le design utilise pour l'impression des factures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((tmpl) => {
                const isSelected = settings.invoiceTemplate === tmpl.id;
                const TemplateComponent = getTemplateById(tmpl.id).component;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => updateSettings({ invoiceTemplate: tmpl.id as "lbp" | "techzone" | "minimal" })}
                    className={`relative text-left rounded-lg border-2 transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {/* Mini preview */}
                    <div className="overflow-hidden" style={{ height: 320, background: "#fff" }}>
                      <div style={{ transform: "scale(0.32)", transformOrigin: "top left", width: "312.5%", minHeight: 1000, background: "#fff", pointerEvents: "none" }}>
                        <TemplateComponent invoice={previewInvoice} settings={settings} currency={currency} />
                      </div>
                    </div>
                    {/* Label */}
                    <div className="p-3 border-t border-border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{tmpl.name}</div>
                          <div className="text-xs text-muted-foreground">{tmpl.description}</div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Accent Color (for Moderne template) ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Couleur d'accent
            </CardTitle>
            <CardDescription>Utilisee par le template Moderne pour les elements colores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateSettings({ accentColor: color })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    settings.accentColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ background: color }}
                  title={color}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <Label htmlFor="custom-color" className="text-xs text-muted-foreground">Autre :</Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="h-8 w-12 p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Business Info ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Informations entreprise
            </CardTitle>
            <CardDescription>Ces informations apparaissent sur toutes vos factures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {settings.businessLogo ? (
                  <div className="flex items-center gap-3">
                    <img src={settings.businessLogo} alt="Logo" className="h-12 max-w-[160px] object-contain rounded border border-border p-1 bg-white" />
                    <Button variant="outline" size="sm" onClick={handleRemoveLogo}>Supprimer</Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucun logo</div>
                )}
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  {settings.businessLogo ? "Changer" : "Importer un logo"}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Max 500 Ko.</p>
            </div>

            {/* Name + NINEA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="biz-name">Nom de l'entreprise</Label>
                <Input
                  id="biz-name"
                  value={settings.businessName}
                  onChange={(e) => updateSettings({ businessName: e.target.value })}
                  placeholder="SenStock"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-ninea">NINEA</Label>
                <Input
                  id="biz-ninea"
                  value={settings.businessNinea}
                  onChange={(e) => updateSettings({ businessNinea: e.target.value })}
                  placeholder="000000000"
                />
                <p className="text-xs text-muted-foreground">Numero d'identification national</p>
              </div>
            </div>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="biz-phone">Telephone</Label>
                <Input
                  id="biz-phone"
                  value={settings.businessPhone}
                  onChange={(e) => updateSettings({ businessPhone: e.target.value })}
                  placeholder="77 123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-email">Email</Label>
                <Input
                  id="biz-email"
                  type="email"
                  value={settings.businessEmail}
                  onChange={(e) => updateSettings({ businessEmail: e.target.value })}
                  placeholder="contact@senstock.com"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="biz-address">Adresse</Label>
              <Textarea
                id="biz-address"
                value={settings.businessAddress}
                onChange={(e) => updateSettings({ businessAddress: e.target.value })}
                placeholder="Dakar, Senegal"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Default Texts ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Textes par defaut
            </CardTitle>
            <CardDescription>Pre-remplis automatiquement lors de la creation d'une facture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-notes">Notes par defaut</Label>
              <Textarea
                id="default-notes"
                value={settings.defaultNotes}
                onChange={(e) => updateSettings({ defaultNotes: e.target.value })}
                placeholder="Merci pour votre achat !"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-warranty">Texte de garantie par defaut</Label>
              <Textarea
                id="default-warranty"
                value={settings.defaultWarrantyText}
                onChange={(e) => updateSettings({ defaultWarrantyText: e.target.value })}
                placeholder="Garantie valable sous conditions d'utilisation normale..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reset */}
        <div className="flex justify-end pb-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reinitialiser les parametres
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommerceParametresPage;
