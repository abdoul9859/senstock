export interface PlanConfig {
  label: string;
  badge?: string;
  modules: string[];
  limits: {
    maxProducts: number;
    maxInvoicesPerMonth: number;
    maxUsers: number;
    storageBytes: number;
  };
  features: {
    boutique: boolean;
    analytique: boolean;
    logistique: boolean;
    personnel: boolean;
    banque: boolean;
    taches: boolean;
    exportPdf: boolean;
    exportExcel: boolean;
    exportCsv: boolean;
    multiTenant: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
}

export type PlanType = "essai" | "premium" | "revendeur" | "entreprise";

export const PLAN_PERMISSIONS: Record<PlanType, PlanConfig> = {
  essai: {
    label: "Essai Gratuit",
    badge: "14 jours",
    modules: ["entrepot", "commerce"],
    limits: {
      maxProducts: 50,
      maxInvoicesPerMonth: 20,
      maxUsers: 1,
      storageBytes: 500 * 1024 * 1024,
    },
    features: {
      boutique: false,
      analytique: false,
      logistique: false,
      personnel: false,
      banque: false,
      taches: false,
      exportPdf: false,
      exportExcel: false,
      exportCsv: true,
      multiTenant: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  premium: {
    label: "Premium",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique", "taches"],
    limits: {
      maxProducts: 5000,
      maxInvoicesPerMonth: 1000,
      maxUsers: 10,
      storageBytes: 10 * 1024 * 1024 * 1024,
    },
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
      taches: true,
      exportPdf: true,
      exportExcel: true,
      exportCsv: true,
      multiTenant: false,
      apiAccess: false,
      prioritySupport: true,
      whiteLabel: false,
    },
  },
  revendeur: {
    label: "Revendeur",
    modules: ["entrepot", "commerce"],
    limits: {
      maxProducts: 500,
      maxInvoicesPerMonth: 200,
      maxUsers: 3,
      storageBytes: 2 * 1024 * 1024 * 1024,
    },
    features: {
      boutique: false,
      analytique: false,
      logistique: false,
      personnel: false,
      banque: false,
      taches: false,
      exportPdf: true,
      exportExcel: false,
      exportCsv: true,
      multiTenant: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
    },
  },
  entreprise: {
    label: "Entreprise",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique", "taches"],
    limits: {
      maxProducts: Infinity,
      maxInvoicesPerMonth: Infinity,
      maxUsers: Infinity,
      storageBytes: 100 * 1024 * 1024 * 1024,
    },
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
      taches: true,
      exportPdf: true,
      exportExcel: true,
      exportCsv: true,
      multiTenant: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: true,
    },
  },
};

// Descriptions marketing par module pour les upgrade prompts
export const MODULE_PROMOS: Record<string, { title: string; description: string; features: string[] }> = {
  boutique: {
    title: "Boutique en ligne",
    description: "Vendez vos produits en ligne avec votre propre vitrine personnalisable",
    features: ["Vitrine en ligne personnalisable", "Gestion des commandes", "Promotions & codes promo", "Paiement en ligne"],
  },
  personnel: {
    title: "Gestion du Personnel",
    description: "Gérez vos employés, salaires et fiches de paie en un clic",
    features: ["Fiches employés complètes", "Calcul automatique des salaires", "Primes & déductions", "Historique des paies"],
  },
  banque: {
    title: "Gestion Bancaire",
    description: "Suivez vos comptes, transactions et trésorerie en temps réel",
    features: ["Multi-comptes bancaires", "Suivi des transactions", "Virements internes", "Rapprochement bancaire"],
  },
  analytique: {
    title: "Analytique Avancée",
    description: "Prenez des décisions éclairées grâce à des rapports détaillés",
    features: ["Tendances mensuelles", "Répartition du CA", "Top produits", "Objectifs de vente"],
  },
  logistique: {
    title: "Logistique & Fournisseurs",
    description: "Optimisez vos approvisionnements et relations fournisseurs",
    features: ["Gestion des fournisseurs", "Bons de commande", "Suivi des livraisons", "Planification"],
  },
  taches: {
    title: "Pilotage & Tâches",
    description: "Organisez le travail de votre équipe avec des tableaux Kanban",
    features: ["Tableaux Kanban", "Checklists & commentaires", "Priorités & deadlines", "Vue liste filtrée"],
  },
};

// Promotions contextuelles affichées dans les dashboards
export const UPGRADE_BANNERS: {
  fromPlan: PlanType;
  targetPlan: PlanType;
  title: string;
  description: string;
  cta: string;
  highlight?: string;
}[] = [
  // Essai → Revendeur
  {
    fromPlan: "essai",
    targetPlan: "revendeur",
    title: "Lancez votre activite de revente",
    description: "Gerez 500 produits, 200 factures/mois et 3 utilisateurs. Ideal pour demarrer sans gros investissement.",
    cta: "Passer a Revendeur",
    highlight: "A partir de 9 900 FCFA",
  },
  {
    fromPlan: "essai",
    targetPlan: "revendeur",
    title: "Depassez les limites du plan gratuit",
    description: "Plus de produits, plus de factures, export PDF inclus. Le plan ideal pour les petits revendeurs.",
    cta: "Debloquer Revendeur",
  },
  // Essai → Premium (direct)
  {
    fromPlan: "essai",
    targetPlan: "premium",
    title: "Debloquez tout le potentiel de SenStock",
    description: "Accedez aux 8 modules, gerez 5 000 produits, 1 000 factures/mois et 10 utilisateurs.",
    cta: "Passer au Premium",
    highlight: "Le plus populaire",
  },
  // Revendeur → Premium
  {
    fromPlan: "revendeur",
    targetPlan: "premium",
    title: "Gerez votre entreprise comme un pro",
    description: "Debloquez la Boutique en ligne, le Personnel, la Banque, l'Analytique et le Pilotage Kanban.",
    cta: "Passer au Premium",
    highlight: "8 modules",
  },
  {
    fromPlan: "revendeur",
    targetPlan: "premium",
    title: "Vendez en ligne avec la Boutique",
    description: "Creez votre vitrine, gerez les commandes et proposez des promotions. Inclus dans le Premium.",
    cta: "Activer la Boutique",
  },
  {
    fromPlan: "revendeur",
    targetPlan: "premium",
    title: "Gerez votre equipe et les salaires",
    description: "Fiches employes, calcul automatique des salaires, primes et deductions.",
    cta: "Debloquer le Personnel",
  },
  {
    fromPlan: "revendeur",
    targetPlan: "premium",
    title: "Pilotez vos projets comme un pro",
    description: "Tableaux Kanban, checklists, deadlines et commentaires pour organiser votre equipe.",
    cta: "Debloquer le Pilotage",
  },
  // Premium → Entreprise
  {
    fromPlan: "premium",
    targetPlan: "entreprise",
    title: "Passez a l'illimite",
    description: "Produits, factures, utilisateurs illimites. 100 Go de stockage, multi-tenant, API et white-label.",
    cta: "Plan Entreprise",
  },
  {
    fromPlan: "premium",
    targetPlan: "entreprise",
    title: "Acces API pour vos integrations",
    description: "Connectez SenStock a vos outils existants grace a l'API REST complete.",
    cta: "Debloquer l'API",
  },
];
