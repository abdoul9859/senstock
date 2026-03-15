import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Boxes, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth, TenantInfo } from "@/contexts/AuthContext";
import { PlanType } from "@/config/planPermissions";
import { Progress } from "@/components/ui/progress";
import StepPlan from "./steps/StepPlan";
import StepCompany, { CompanyData } from "./steps/StepCompany";
import StepInvoiceTemplate, { InvoiceData } from "./steps/StepInvoiceTemplate";
import StepConfirm from "./steps/StepConfirm";

const TOKEN_KEY = "senstock_token";

const steps = [
  { label: "Plan", description: "Choisir un abonnement" },
  { label: "Entreprise", description: "Informations société" },
  { label: "Facture", description: "Modèle de document" },
  { label: "Confirmation", description: "Prêt à démarrer" },
];

export default function OnboardingPage() {
  const { user, tenant, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free");
  const [companyData, setCompanyData] = useState<CompanyData>({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    ninea: "",
    rc: "",
    currency: "XOF",
    country: "SN",
  });
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceTemplate: "lbp",
    accentColor: "#0070c0",
    businessName: "",
    businessAddress: "",
  });

  // If tenant already completed onboarding, redirect to dashboard
  useEffect(() => {
    if (tenant?.onboardingCompleted) {
      navigate("/entrepot/dashboard", { replace: true });
    }
  }, [tenant, navigate]);

  // Resume at the right step based on tenant progress + pre-populate saved settings
  useEffect(() => {
    if (tenant && !tenant.onboardingCompleted) {
      setCurrentStep(Math.min(tenant.onboardingStep, 3));
      if (tenant.plan !== "free") setSelectedPlan(tenant.plan as PlanType);
      // Load saved invoice settings if user is resuming at step 2+
      if (tenant.onboardingStep >= 2) {
        const token = localStorage.getItem(TOKEN_KEY);
        fetch("/api/commerce-settings", {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.ok ? r.json() : null)
          .then((s) => {
            if (s) {
              setInvoiceData({
                invoiceTemplate: s.invoiceTemplate || "lbp",
                accentColor: s.accentColor || "#0070c0",
                businessName: s.businessName || "",
                businessAddress: s.businessAddress || "",
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [tenant]);

  // Handle Stripe checkout return
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      refreshTenant();
    }
  }, [searchParams, refreshTenant]);

  if (!user) return null;

  async function apiCall(url: string, method: string, body?: object) {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erreur serveur");
    return data;
  }

  async function handlePlanNext() {
    setLoading(true);
    try {
      const result = await apiCall("/api/onboarding/plan", "PUT", { plan: selectedPlan });
      if (result.stripeUrl) {
        window.location.href = result.stripeUrl;
        return;
      }
      await refreshTenant();
      setCurrentStep(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde du plan");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompanyNext() {
    setLoading(true);
    try {
      await apiCall("/api/onboarding/company", "PUT", companyData);
      await refreshTenant();
      setCurrentStep(2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde des informations");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvoiceNext() {
    setLoading(true);
    try {
      await apiCall("/api/onboarding/invoice", "PUT", invoiceData);
      await refreshTenant();
      setCurrentStep(3);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde du modèle de facture");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await apiCall("/api/onboarding/complete", "POST");
      await refreshTenant();
      navigate("/entrepot/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la finalisation");
    } finally {
      setLoading(false);
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">SenStock</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Configuration de votre espace
          </div>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-2">
          <Progress value={progress} className="h-2" />
        </div>
        <div className="flex justify-between mb-8">
          {steps.map((step, i) => (
            <button
              key={i}
              className={`flex items-center gap-2 text-sm transition-colors ${
                i === currentStep
                  ? "text-primary font-medium"
                  : i < currentStep
                  ? "text-emerald-500"
                  : "text-muted-foreground"
              }`}
              onClick={() => i < currentStep && setCurrentStep(i)}
              disabled={i > currentStep}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < currentStep
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/30"
                }`}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div key={currentStep} className="animate-slide-in-right">
          {currentStep === 0 && (
            <StepPlan
              selectedPlan={selectedPlan}
              onSelect={setSelectedPlan}
              onNext={handlePlanNext}
              loading={loading}
            />
          )}
          {currentStep === 1 && (
            <StepCompany
              data={companyData}
              onChange={setCompanyData}
              onNext={handleCompanyNext}
              onBack={() => setCurrentStep(0)}
              loading={loading}
            />
          )}
          {currentStep === 2 && (
            <StepInvoiceTemplate
              data={invoiceData}
              onChange={setInvoiceData}
              onNext={handleInvoiceNext}
              onBack={() => setCurrentStep(1)}
              loading={loading}
            />
          )}
          {currentStep === 3 && (
            <StepConfirm
              plan={selectedPlan}
              company={companyData}
              invoice={invoiceData}
              onComplete={handleComplete}
              onBack={() => setCurrentStep(2)}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
