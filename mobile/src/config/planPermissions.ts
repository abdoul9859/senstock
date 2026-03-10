export type PlanType = "free" | "pro" | "enterprise";

export interface PlanConfig {
  label: string;
  modules: string[];
  features: Record<string, boolean>;
}

export const PLAN_PERMISSIONS: Record<PlanType, PlanConfig> = {
  free: {
    label: "Gratuit",
    modules: ["entrepot", "commerce"],
    features: {
      boutique: false,
      analytique: false,
      logistique: false,
      personnel: false,
      banque: false,
    },
  },
  pro: {
    label: "Pro",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique"],
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
    },
  },
  enterprise: {
    label: "Entreprise",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique"],
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
    },
  },
};
