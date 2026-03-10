import { FileText, Palette, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { templates, getTemplateById } from "@/components/invoice-templates";
import type { PrintInvoice } from "@/components/invoice-templates";
import type { CommerceSettings } from "@/hooks/useCommerceSettings";

export interface InvoiceData {
  invoiceTemplate: string;
  accentColor: string;
  businessName: string;
  businessAddress: string;
}

interface StepInvoiceTemplateProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

// Fake invoice for realistic preview
const previewInvoice: PrintInvoice = {
  _id: "preview",
  number: "FAC-0042",
  type: "facture",
  status: "payee",
  client: { _id: "c1", name: "Moussa Diop", phone: "77 123 45 67", email: "moussa@email.com", address: "Dakar, Sénégal" },
  date: new Date().toISOString(),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  items: [
    { _id: "i1", type: "product" as const, productId: { _id: "p1", name: "iPhone 15 Pro", brand: "Apple", model: "256GB", image: "" }, description: "iPhone 15 Pro", quantity: 1, unitPrice: 650000, purchasePrice: 520000, total: 650000 },
    { _id: "i2", type: "service" as const, description: "Coque de protection", quantity: 2, unitPrice: 5000, purchasePrice: 2000, total: 10000 },
    { _id: "i3", type: "product" as const, productId: { _id: "p2", name: "AirPods Pro", brand: "Apple", model: "2ème gen", image: "" }, description: "AirPods Pro", quantity: 1, unitPrice: 150000, purchasePrice: 110000, total: 150000 },
  ],
  subtotal: 810000,
  showTax: true,
  taxRate: 18,
  taxAmount: 145800,
  total: 955800,
  payment: { enabled: true, amount: 955800, method: "mobile_money", date: new Date().toISOString() },
  warranty: { enabled: true, duration: "6 mois", description: "Garantie constructeur Apple" },
  notes: "Merci pour votre confiance !",
  signature: "",
  createdAt: new Date().toISOString(),
};

const colorPresets = [
  "#16a34a", "#2563eb", "#7c3aed", "#dc2626", "#ea580c", "#0891b2", "#4f46e5", "#111111",
];

export default function StepInvoiceTemplate({ data, onChange, onNext, onBack, loading }: StepInvoiceTemplateProps) {
  function update(key: keyof InvoiceData, value: string) {
    onChange({ ...data, [key]: value });
  }

  // Build settings object for template rendering
  const previewSettings: CommerceSettings = {
    invoiceTemplate: data.invoiceTemplate as "lbp" | "techzone" | "minimal",
    accentColor: data.accentColor,
    businessName: data.businessName || "Mon Entreprise",
    businessAddress: data.businessAddress || "Dakar, Sénégal",
    businessPhone: "77 000 00 00",
    businessEmail: "contact@exemple.sn",
    businessNinea: "",
    businessLogo: "",
    defaultNotes: "",
    defaultWarrantyText: "",
    showPurchasePrice: false,
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Modèle de facture</h2>
        <p className="text-muted-foreground mt-2">
          Choisissez l'apparence de vos documents commerciaux
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Modèle
          </CardTitle>
          <CardDescription>Sélectionnez un modèle de facture — aperçu format A4</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {templates.map((tmpl) => {
              const isSelected = data.invoiceTemplate === tmpl.id;
              const TemplateComponent = getTemplateById(tmpl.id).component;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => update("invoiceTemplate", tmpl.id)}
                  className={`relative text-left rounded-lg border-2 transition-all overflow-hidden ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  {/* Real A4 template preview scaled down */}
                  <div className="overflow-hidden" style={{ height: 340, background: "#fff" }}>
                    <div
                      style={{
                        transform: "scale(0.32)",
                        transformOrigin: "top left",
                        width: "312.5%",
                        minHeight: 1000,
                        background: "#fff",
                        pointerEvents: "none",
                      }}
                    >
                      <TemplateComponent
                        invoice={previewInvoice}
                        settings={{ ...previewSettings, invoiceTemplate: tmpl.id as "lbp" | "techzone" | "minimal" }}
                        currency=" FCFA"
                      />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Couleur d'accent
          </CardTitle>
          <CardDescription>Change la couleur des éléments du template sélectionné</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {colorPresets.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  data.accentColor === color ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => update("accentColor", color)}
              />
            ))}
            <div className="flex items-center gap-2 ml-2">
              <Label htmlFor="customColor" className="text-xs text-muted-foreground">Autre :</Label>
              <Input
                id="customColor"
                type="color"
                value={data.accentColor}
                onChange={(e) => update("accentColor", e.target.value)}
                className="h-8 w-12 p-0.5 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations sur la facture</CardTitle>
          <CardDescription>Ces informations pré-rempliront vos factures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bizName">Nom commercial</Label>
              <Input
                id="bizName"
                value={data.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="Nom affiché sur les factures"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bizAddr">Adresse commerciale</Label>
              <Input
                id="bizAddr"
                value={data.businessAddress}
                onChange={(e) => update("businessAddress", e.target.value)}
                placeholder="Adresse sur les factures"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Retour</Button>
        <Button onClick={onNext} disabled={loading} size="lg">
          {loading ? "Enregistrement..." : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
