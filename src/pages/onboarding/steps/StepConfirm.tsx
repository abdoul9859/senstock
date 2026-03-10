import { CheckCircle2, Rocket, Crown, Building, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlanType, PLAN_PERMISSIONS } from "@/config/planPermissions";
import { CompanyData } from "./StepCompany";
import { InvoiceData } from "./StepInvoiceTemplate";

interface StepConfirmProps {
  plan: PlanType;
  company: CompanyData;
  invoice: InvoiceData;
  onComplete: () => void;
  onBack: () => void;
  loading?: boolean;
}

const templateNames: Record<string, string> = {
  lbp: "LBP Classic",
  techzone: "TechZone",
  minimal: "Minimal",
};

export default function StepConfirm({ plan, company, invoice, onComplete, onBack, loading }: StepConfirmProps) {
  const planConfig = PLAN_PERMISSIONS[plan];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tout est prêt !</h2>
        <p className="text-muted-foreground mt-2">
          Vérifiez vos paramètres avant de commencer
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Plan</h3>
            </div>
            <Badge variant={plan === "free" ? "secondary" : "default"} className="text-sm">
              {planConfig.label}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {planConfig.modules.length} modules disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Entreprise</h3>
            </div>
            <p className="font-medium">{company.companyName || "Non renseigné"}</p>
            {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
            {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Facture</h3>
            </div>
            <p className="font-medium">{templateNames[invoice.invoiceTemplate] || invoice.invoiceTemplate}</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: invoice.accentColor }}
              />
              <span className="text-sm text-muted-foreground">{invoice.accentColor}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Modules activés</h3>
          <div className="flex flex-wrap gap-2">
            {planConfig.modules.map((m) => (
              <Badge key={m} variant="outline" className="capitalize">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                {m}
              </Badge>
            ))}
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Vous pouvez modifier tous ces paramètres ultérieurement dans les réglages de votre compte.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Retour</Button>
        <Button onClick={onComplete} disabled={loading} size="lg" className="gap-2">
          {loading ? (
            "Finalisation..."
          ) : (
            <>
              Accéder au tableau de bord
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
