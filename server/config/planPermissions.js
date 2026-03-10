const PLAN_PERMISSIONS = {
  free: {
    label: "Gratuit",
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
      exportPdf: false,
      exportExcel: false,
      exportCsv: true,
    },
  },
  pro: {
    label: "Pro",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique"],
    limits: {
      maxProducts: 2000,
      maxInvoicesPerMonth: 500,
      maxUsers: 5,
      storageBytes: 5 * 1024 * 1024 * 1024,
    },
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
      exportPdf: true,
      exportExcel: true,
      exportCsv: true,
    },
  },
  enterprise: {
    label: "Entreprise",
    modules: ["entrepot", "commerce", "boutique", "personnel", "banque", "analytique", "logistique"],
    limits: {
      maxProducts: Infinity,
      maxInvoicesPerMonth: Infinity,
      maxUsers: Infinity,
      storageBytes: 50 * 1024 * 1024 * 1024,
    },
    features: {
      boutique: true,
      analytique: true,
      logistique: true,
      personnel: true,
      banque: true,
      exportPdf: true,
      exportExcel: true,
      exportCsv: true,
    },
  },
};

module.exports = PLAN_PERMISSIONS;
