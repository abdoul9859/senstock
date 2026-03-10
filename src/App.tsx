import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import NotFound from "./pages/NotFound";
import PlanGate from "./components/PlanGate";
import ErrorBoundary from "./components/ErrorBoundary";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Entrepôt
import EntrepotDashboard from "./pages/entrepot/EntrepotDashboard";
import InventairePage from "./pages/entrepot/InventairePage";
import MouvementsPage from "./pages/entrepot/MouvementsPage";
import CodesBarresPage from "./pages/entrepot/CodesBarresPage";
import CategoriesPage from "./pages/entrepot/CategoriesPage";
import ParametresPage from "./pages/entrepot/ParametresPage";
import DoublonsPage from "./pages/entrepot/DoublonsPage";
import MaintenancePage from "./pages/entrepot/MaintenancePage";

// Commerce
import CommerceDashboard from "./pages/commerce/CommerceDashboard";
import FacturesPage from "./pages/commerce/FacturesPage";
import DevisPage from "./pages/commerce/DevisPage";
import BonsLivraisonPage from "./pages/commerce/BonsLivraisonPage";

import NouvelleFacturePage from "./pages/commerce/NouvelleFacturePage";
import InvoiceDetailPage from "./pages/commerce/InvoiceDetailPage";
import CommerceParametresPage from "./pages/commerce/CommerceParametresPage";
import NouveauDevisPage from "./pages/commerce/NouveauDevisPage";
import DevisDetailPage from "./pages/commerce/DevisDetailPage";
import ClientsPage from "./pages/commerce/ClientsPage";
import BonLivraisonDetailPage from "./pages/commerce/BonLivraisonDetailPage";
import DemandesClientsPage from "./pages/commerce/DemandesClientsPage";
import CreancesPage from "./pages/commerce/CreancesPage";
import RecurrentesPage from "./pages/commerce/RecurrentesPage";
import ImportProduitsPage from "./pages/commerce/ImportProduitsPage";
import DoublonsClientsPage from "./pages/commerce/DoublonsClientsPage";
import AchatsQuotidiensPage from "./pages/commerce/AchatsQuotidiensPage";
import CaissePage from "./pages/commerce/CaissePage";

// Personnel
import PersonnelDashboard from "./pages/personnel/PersonnelDashboard";
import EmployesPage from "./pages/personnel/EmployesPage";
import SalairesPage from "./pages/personnel/SalairesPage";
import CongesPage from "./pages/personnel/CongesPage";
import PresencesPage from "./pages/personnel/PresencesPage";

// Banque
import BanqueDashboard from "./pages/banque/BanqueDashboard";
import ComptesPage from "./pages/banque/ComptesPage";
import BanqueTransactionsPage from "./pages/banque/TransactionsPage";
import VirementsPage from "./pages/banque/VirementsPage";
import ConversionPage from "./pages/banque/ConversionPage";
import RapprochementPage from "./pages/banque/RapprochementPage";
import BanqueParametresPage from "./pages/banque/BanqueParametresPage";
import ImportBanquePage from "./pages/banque/ImportBanquePage";

// Analytique
import DashboardPage from "./pages/analytique/DashboardPage";
import TendancesPage from "./pages/analytique/TendancesPage";
import RepartitionPage from "./pages/analytique/RepartitionPage";
import RentabilitePage from "./pages/analytique/RentabilitePage";
import ObjectifsPage from "./pages/analytique/ObjectifsPage";

// Boutique (back-office)
import BoutiqueDashboard from "./pages/boutique/BoutiqueDashboard";
import CataloguePage from "./pages/boutique/CataloguePage";
import CommandesPage from "./pages/boutique/CommandesPage";
import PromotionsPage from "./pages/boutique/PromotionsPage";
import BoutiqueParametresPage from "./pages/boutique/BoutiqueParametresPage";
import SiteWebPage from "./pages/boutique/SiteWebPage";

// Boutique (vitrine publique)
import ShopLayout from "./pages/shop/ShopLayout";
import ShopPage from "./pages/shop/ShopPage";
import ProductDetailPage from "./pages/shop/ProductDetailPage";
import CartPage from "./pages/shop/CartPage";
import CheckoutPage from "./pages/shop/CheckoutPage";
import PaymentResultPage from "./pages/shop/PaymentResultPage";

// Tâches (Pilotage)
import TaskDashboard from "./pages/taches/TaskDashboard";
import TaskBoardsPage from "./pages/taches/TaskBoardsPage";
import TaskBoardDetailPage from "./pages/taches/TaskBoardDetailPage";
import TaskListPage from "./pages/taches/TaskListPage";
import TaskAgendaPage from "./pages/taches/TaskAgendaPage";

// Logistique
import LogistiqueDashboard from "./pages/logistique/LogistiqueDashboard";
import FournisseursPage from "./pages/logistique/FournisseursPage";
import NotationsPage from "./pages/logistique/NotationsPage";
import CommandesLogPage from "./pages/logistique/CommandesLogPage";
import LivraisonsPage from "./pages/logistique/LivraisonsPage";
import PlanificationPage from "./pages/logistique/PlanificationPage";

// Landing
import LandingPage from "./pages/LandingPage";

// Onboarding
import OnboardingPage from "./pages/onboarding/OnboardingPage";

// Generic
import GenericPage from "./pages/GenericPage";
import NotificationsPage from "./pages/NotificationsPage";
import ParametresGlobalPage from "./pages/ParametresGlobalPage";
import CorbeillePage from "./pages/CorbeillePage";
import EquipePage from "./pages/EquipePage";

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

// Map workspace prefixes to their ".voir" permission
const WORKSPACE_VOIR: Record<string, string> = {
  entrepot: "entrepot.voir",
  commerce: "commerce.voir",
  boutique: "boutique.voir",
  personnel: "personnel.voir",
  banque: "banque.voir",
  analytique: "analytique.voir",
  logistique: "logistique.voir",
  taches: "taches.voir",
};

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, tenant, loading, hasPermission, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  // Redirect to onboarding if not completed
  if (tenant && !tenant.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  // For gerant, block access to workspaces they don't have ".voir" permission for
  if (!isAdmin) {
    const wsKey = location.pathname.split("/")[1]; // e.g. "commerce" from "/commerce/dashboard"
    const voirPerm = WORKSPACE_VOIR[wsKey];
    if (voirPerm && !hasPermission(voirPerm)) {
      // Redirect to first accessible workspace
      const wsOrder = [
        { perm: "entrepot.voir", url: "/entrepot/dashboard" },
        { perm: "commerce.voir", url: "/commerce/dashboard" },
        { perm: "boutique.voir", url: "/boutique/dashboard" },
        { perm: "personnel.voir", url: "/personnel/dashboard" },
        { perm: "banque.voir", url: "/banque/dashboard" },
        { perm: "analytique.voir", url: "/analytique/dashboard" },
        { perm: "logistique.voir", url: "/logistique/dashboard" },
        { perm: "taches.voir", url: "/taches/dashboard" },
      ];
      const first = wsOrder.find((ws) => hasPermission(ws.perm));
      return <Navigate to={first?.url || "/entrepot/dashboard"} replace />;
    }
  }
  return children;
}

function RequireAuthOnly({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }: { children: React.ReactElement }) {
  const { user, tenant, loading, hasPermission, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) {
    if (tenant && !tenant.onboardingCompleted) return <Navigate to="/onboarding" replace />;
    // For gerant, redirect to first workspace they have access to
    if (!isAdmin) {
      const wsOrder = [
        { perm: "entrepot.voir", url: "/entrepot/dashboard" },
        { perm: "commerce.voir", url: "/commerce/dashboard" },
        { perm: "boutique.voir", url: "/boutique/dashboard" },
        { perm: "personnel.voir", url: "/personnel/dashboard" },
        { perm: "banque.voir", url: "/banque/dashboard" },
        { perm: "analytique.voir", url: "/analytique/dashboard" },
        { perm: "logistique.voir", url: "/logistique/dashboard" },
        { perm: "taches.voir", url: "/taches/dashboard" },
      ];
      const first = wsOrder.find((ws) => hasPermission(ws.perm));
      return <Navigate to={first?.url || "/entrepot/dashboard"} replace />;
    }
    return <Navigate to="/entrepot/dashboard" replace />;
  }
  return children;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
    <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

    <Route path="/" element={<LandingPage />} />
    <Route path="/onboarding" element={<RequireAuthOnly><OnboardingPage /></RequireAuthOnly>} />

    <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
      {/* Entrepôt */}
      <Route path="/entrepot/dashboard" element={<EntrepotDashboard />} />
      <Route path="/entrepot/inventaire" element={<InventairePage />} />
      <Route path="/entrepot/mouvements" element={<MouvementsPage />} />
      <Route path="/entrepot/codes-barres" element={<CodesBarresPage />} />
      <Route path="/entrepot/categories" element={<CategoriesPage />} />
      <Route path="/entrepot/doublons" element={<DoublonsPage />} />
      <Route path="/entrepot/maintenance" element={<MaintenancePage />} />
      <Route path="/entrepot/parametres" element={<ParametresPage />} />

      {/* Commerce */}
      <Route path="/commerce/dashboard" element={<CommerceDashboard />} />
      <Route path="/commerce/factures/nouvelle" element={<NouvelleFacturePage />} />
      <Route path="/commerce/factures/modifier/:id" element={<NouvelleFacturePage />} />
      <Route path="/commerce/factures/:id" element={<InvoiceDetailPage />} />
      <Route path="/commerce/factures" element={<FacturesPage />} />
      <Route path="/commerce/devis/nouveau" element={<NouveauDevisPage />} />
      <Route path="/commerce/devis/modifier/:id" element={<NouveauDevisPage />} />
      <Route path="/commerce/devis/:id" element={<DevisDetailPage />} />
      <Route path="/commerce/devis" element={<DevisPage />} />
      <Route path="/commerce/bons-livraison/:id" element={<BonLivraisonDetailPage />} />
      <Route path="/commerce/bons-livraison" element={<BonsLivraisonPage />} />
      <Route path="/commerce/clients" element={<ClientsPage />} />
      <Route path="/commerce/demandes" element={<DemandesClientsPage />} />
      <Route path="/commerce/creances" element={<CreancesPage />} />
      <Route path="/commerce/recurrentes" element={<RecurrentesPage />} />
      <Route path="/commerce/import-produits" element={<ImportProduitsPage />} />
      <Route path="/commerce/achats" element={<AchatsQuotidiensPage />} />
      <Route path="/commerce/caisse" element={<CaissePage />} />
      <Route path="/commerce/doublons-clients" element={<DoublonsClientsPage />} />
      <Route path="/commerce/parametres" element={<CommerceParametresPage />} />

      {/* Boutique (back-office) - Pro/Enterprise only */}
      <Route path="/boutique/dashboard" element={<PlanGate module="boutique"><BoutiqueDashboard /></PlanGate>} />
      <Route path="/boutique/catalogue" element={<PlanGate module="boutique"><CataloguePage /></PlanGate>} />
      <Route path="/boutique/commandes" element={<PlanGate module="boutique"><CommandesPage /></PlanGate>} />
      <Route path="/boutique/promotions" element={<PlanGate module="boutique"><PromotionsPage /></PlanGate>} />
      <Route path="/boutique/parametres" element={<PlanGate module="boutique"><BoutiqueParametresPage /></PlanGate>} />
      <Route path="/boutique/site-web" element={<PlanGate module="boutique"><SiteWebPage /></PlanGate>} />

      {/* Personnel - Pro/Enterprise only */}
      <Route path="/personnel/dashboard" element={<PlanGate module="personnel"><PersonnelDashboard /></PlanGate>} />
      <Route path="/personnel/employes" element={<PlanGate module="personnel"><EmployesPage /></PlanGate>} />
      <Route path="/personnel/salaires" element={<PlanGate module="personnel"><SalairesPage /></PlanGate>} />
      <Route path="/personnel/conges" element={<PlanGate module="personnel"><CongesPage /></PlanGate>} />
      <Route path="/personnel/presences" element={<PlanGate module="personnel"><PresencesPage /></PlanGate>} />

      {/* Banque - Pro/Enterprise only */}
      <Route path="/banque/dashboard" element={<PlanGate module="banque"><BanqueDashboard /></PlanGate>} />
      <Route path="/banque/comptes" element={<PlanGate module="banque"><ComptesPage /></PlanGate>} />
      <Route path="/banque/transactions" element={<PlanGate module="banque"><BanqueTransactionsPage /></PlanGate>} />
      <Route path="/banque/virements" element={<PlanGate module="banque"><VirementsPage /></PlanGate>} />
      <Route path="/banque/conversion" element={<PlanGate module="banque"><ConversionPage /></PlanGate>} />
      <Route path="/banque/rapprochement" element={<PlanGate module="banque"><RapprochementPage /></PlanGate>} />
      <Route path="/banque/import" element={<PlanGate module="banque"><ImportBanquePage /></PlanGate>} />
      <Route path="/banque/parametres" element={<PlanGate module="banque"><BanqueParametresPage /></PlanGate>} />

      {/* Analytique - Pro/Enterprise only */}
      <Route path="/analytique/dashboard" element={<PlanGate module="analytique"><DashboardPage /></PlanGate>} />
      <Route path="/analytique/tendances" element={<PlanGate module="analytique"><TendancesPage /></PlanGate>} />
      <Route path="/analytique/repartition" element={<PlanGate module="analytique"><RepartitionPage /></PlanGate>} />
      <Route path="/analytique/rentabilite" element={<PlanGate module="analytique"><RentabilitePage /></PlanGate>} />
      <Route path="/analytique/objectifs" element={<PlanGate module="analytique"><ObjectifsPage /></PlanGate>} />

      {/* Pilotage (Tâches) - Pro/Enterprise only */}
      <Route path="/taches/dashboard" element={<PlanGate module="taches"><TaskDashboard /></PlanGate>} />
      <Route path="/taches/tableaux" element={<PlanGate module="taches"><TaskBoardsPage /></PlanGate>} />
      <Route path="/taches/tableaux/:id" element={<PlanGate module="taches"><TaskBoardDetailPage /></PlanGate>} />
      <Route path="/taches/liste" element={<PlanGate module="taches"><TaskListPage /></PlanGate>} />
      <Route path="/taches/agenda" element={<PlanGate module="taches"><TaskAgendaPage /></PlanGate>} />

      {/* Logistique - Pro/Enterprise only */}
      <Route path="/logistique/dashboard" element={<PlanGate module="logistique"><LogistiqueDashboard /></PlanGate>} />
      <Route path="/logistique/fournisseurs" element={<PlanGate module="logistique"><FournisseursPage /></PlanGate>} />
      <Route path="/logistique/notations" element={<PlanGate module="logistique"><NotationsPage /></PlanGate>} />
      <Route path="/logistique/commandes" element={<PlanGate module="logistique"><CommandesLogPage /></PlanGate>} />
      <Route path="/logistique/livraisons" element={<PlanGate module="logistique"><LivraisonsPage /></PlanGate>} />
      <Route path="/logistique/planification" element={<PlanGate module="logistique"><PlanificationPage /></PlanGate>} />

      {/* Système */}
      <Route path="/parametres" element={<ParametresGlobalPage />} />
      <Route path="/equipe" element={<EquipePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/corbeille" element={<CorbeillePage />} />
    </Route>
    {/* Vitrine publique (sans auth) */}
    <Route element={<ShopLayout />}>
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/panier" element={<CartPage />} />
      <Route path="/shop/commande" element={<CheckoutPage />} />
      <Route path="/shop/commande/confirmation" element={<PaymentResultPage />} />
      <Route path="/shop/commande/annulee" element={<PaymentResultPage />} />
      <Route path="/shop/:slug" element={<ProductDetailPage />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <WorkspaceProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
