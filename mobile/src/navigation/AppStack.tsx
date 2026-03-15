import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fontSize } from "../config/theme";
import { useTheme } from "../contexts/ThemeContext";

// Home
import HomeScreen from "../screens/home/HomeScreen";
import WorkspaceSectionsScreen from "../screens/home/WorkspaceSectionsScreen";

// Entrepot
import EntrepotDashboard from "../screens/entrepot/EntrepotDashboard";
import ProductListScreen from "../screens/entrepot/ProductListScreen";
import ProductDetailScreen from "../screens/entrepot/ProductDetailScreen";
import ProductFormScreen from "../screens/entrepot/ProductFormScreen";
import CategoriesScreen from "../screens/entrepot/CategoriesScreen";
import MouvementsScreen from "../screens/entrepot/MouvementsScreen";

// Commerce
import CommerceDashboard from "../screens/commerce/CommerceDashboard";
import InvoiceListScreen from "../screens/commerce/InvoiceListScreen";
import InvoiceDetailScreen from "../screens/commerce/InvoiceDetailScreen";
import CreateInvoiceScreen from "../screens/commerce/CreateInvoiceScreen";
import ClientListScreen from "../screens/commerce/ClientListScreen";
import ClientDetailScreen from "../screens/commerce/ClientDetailScreen";
import ClientFormScreen from "../screens/commerce/ClientFormScreen";
import DevisListScreen from "../screens/commerce/DevisListScreen";
import DevisDetailScreen from "../screens/commerce/DevisDetailScreen";
import CreateDevisScreen from "../screens/commerce/CreateDevisScreen";
import BonLivraisonListScreen from "../screens/commerce/BonLivraisonListScreen";
import BonLivraisonDetailScreen from "../screens/commerce/BonLivraisonDetailScreen";
import CreancesScreen from "../screens/commerce/CreancesScreen";
import AchatsQuotidiensScreen from "../screens/commerce/AchatsQuotidiensScreen";
import FacturesRecurrentesScreen from "../screens/commerce/FacturesRecurrentesScreen";
import ExchangeProductsScreen from "../screens/commerce/ExchangeProductsScreen";
import DemandesClientsScreen from "../screens/commerce/DemandesClientsScreen";
import ScanInvoiceScreen from "../screens/commerce/ScanInvoiceScreen";
import MaintenanceListScreen from "../screens/maintenance/MaintenanceListScreen";
import MaintenanceDetailScreen from "../screens/maintenance/MaintenanceDetailScreen";
import CreateMaintenanceScreen from "../screens/maintenance/CreateMaintenanceScreen";
import LabelsScreen from "../screens/entrepot/LabelsScreen";

// Boutique
import BoutiqueDashboardScreen from "../screens/boutique/BoutiqueDashboardScreen";
import CatalogueScreen from "../screens/boutique/CatalogueScreen";
import CommandesBoutiqueScreen from "../screens/boutique/CommandesBoutiqueScreen";
import CommandeBoutiqueDetailScreen from "../screens/boutique/CommandeBoutiqueDetailScreen";
import PromotionsScreen from "../screens/boutique/PromotionsScreen";

// Personnel
import PersonnelDashboardScreen from "../screens/personnel/PersonnelDashboardScreen";
import EmployeListScreen from "../screens/personnel/EmployeListScreen";
import EmployeDetailScreen from "../screens/personnel/EmployeDetailScreen";
import EmployeFormScreen from "../screens/personnel/EmployeFormScreen";
import SalairesScreen from "../screens/personnel/SalairesScreen";
import CongesScreen from "../screens/personnel/CongesScreen";
import PresencesScreen from "../screens/personnel/PresencesScreen";

// Banque
import BanqueDashboardScreen from "../screens/banque/BanqueDashboardScreen";
import ComptesScreen from "../screens/banque/ComptesScreen";
import TransactionsScreen from "../screens/banque/TransactionsScreen";
import VirementsScreen from "../screens/banque/VirementsScreen";
import ConversionScreen from "../screens/banque/ConversionScreen";

// Analytique
import AnalytiqueDashboardScreen from "../screens/analytique/AnalytiqueDashboardScreen";
import TendancesScreen from "../screens/analytique/TendancesScreen";
import RepartitionScreen from "../screens/analytique/RepartitionScreen";
import RentabiliteScreen from "../screens/analytique/RentabiliteScreen";
import ObjectifsScreen from "../screens/analytique/ObjectifsScreen";

// Logistique
import LogistiqueDashboardScreen from "../screens/logistique/LogistiqueDashboardScreen";
import FournisseurListScreen from "../screens/logistique/FournisseurListScreen";
import FournisseurDetailScreen from "../screens/logistique/FournisseurDetailScreen";
import FournisseurFormScreen from "../screens/logistique/FournisseurFormScreen";
import CommandesLogScreen from "../screens/logistique/CommandesLogScreen";
import CommandeLogDetailScreen from "../screens/logistique/CommandeLogDetailScreen";
import CreateCommandeLogScreen from "../screens/logistique/CreateCommandeLogScreen";
import LivraisonsScreen from "../screens/logistique/LivraisonsScreen";
import NotationsScreen from "../screens/logistique/NotationsScreen";
import ArrivageListScreen from "../screens/logistique/ArrivageListScreen";
import ArrivageDetailScreen from "../screens/logistique/ArrivageDetailScreen";
import CreateArrivageScreen from "../screens/logistique/CreateArrivageScreen";

// Taches (Pilotage)
import TachesDashboardScreen from "../screens/taches/TachesDashboardScreen";
import TaskBoardsScreen from "../screens/taches/TaskBoardsScreen";
import TaskBoardDetailScreen from "../screens/taches/TaskBoardDetailScreen";
import TaskListScreen from "../screens/taches/TaskListScreen";

// Settings
import SettingsScreen from "../screens/settings/SettingsScreen";

export type AppStackParamList = {
  Home: undefined;
  WorkspaceSections: { workspaceKey: string };
  Settings: undefined;
  // Entrepot
  EntrepotDashboard: undefined;
  ProductList: undefined;
  ProductDetail: { productId: string };
  ProductForm: { productId?: string } | undefined;
  Categories: undefined;
  Mouvements: undefined;
  // Commerce
  CommerceDashboard: undefined;
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  CreateInvoice: { invoiceId?: string } | undefined;
  ClientList: undefined;
  ClientDetail: { clientId: string };
  ClientForm: { clientId?: string } | undefined;
  DevisList: undefined;
  DevisDetail: { quoteId: string };
  CreateDevis: { quoteId?: string } | undefined;
  BonLivraisonList: undefined;
  BonLivraisonDetail: { deliveryNoteId: string };
  Creances: undefined;
  AchatsQuotidiens: undefined;
  FacturesRecurrentes: undefined;
  ExchangeProducts: undefined;
  DemandesClients: undefined;
  ScanInvoice: undefined;
  // Maintenance
  MaintenanceList: undefined;
  MaintenanceDetail: { ticketId: string };
  CreateMaintenance: { ticketId?: string } | undefined;
  // Entrepot labels (already in EntrepotStack but also in AppStack for cross-nav)
  Labels: undefined;
  // Boutique
  BoutiqueDashboard: undefined;
  Catalogue: undefined;
  CommandesBoutique: undefined;
  CommandeBoutiqueDetail: { orderId: string };
  Promotions: undefined;
  // Personnel
  PersonnelDashboard: undefined;
  EmployeList: undefined;
  EmployeDetail: { employeeId: string };
  EmployeForm: { employeeId?: string } | undefined;
  Salaires: undefined;
  Conges: undefined;
  Presences: undefined;
  // Banque
  BanqueDashboard: undefined;
  Comptes: undefined;
  Transactions: undefined;
  Virements: undefined;
  Conversion: undefined;
  // Analytique
  AnalytiqueDashboard: undefined;
  Tendances: undefined;
  Repartition: undefined;
  Rentabilite: undefined;
  Objectifs: undefined;
  // Logistique
  LogistiqueDashboard: undefined;
  FournisseurList: undefined;
  FournisseurDetail: { supplierId: string };
  FournisseurForm: { supplierId?: string } | undefined;
  CommandesLog: undefined;
  CommandeLogDetail: { orderId: string };
  CreateCommandeLog: undefined;
  Livraisons: undefined;
  Notations: undefined;
  ArrivageList: undefined;
  ArrivageDetail: { arrivageId: string };
  CreateArrivage: undefined;
  // Pilotage
  TachesDashboard: undefined;
  TaskBoards: undefined;
  TaskBoardDetail: { boardId: string };
  TaskList: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const { colors } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Home */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WorkspaceSections" component={WorkspaceSectionsScreen}
        options={({ route }) => {
          const ws = route.params?.workspaceKey || "";
          const labels: Record<string, string> = {
            entrepot: "Entrepot", commerce: "Commerce", boutique: "Boutique",
            personnel: "Personnel", banque: "Banque", analytique: "Analytique",
            pilotage: "Pilotage", logistique: "Logistique",
          };
          return { title: labels[ws] || ws };
        }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Parametres" }} />

      {/* Entrepot */}
      <Stack.Screen name="EntrepotDashboard" component={EntrepotDashboard} options={{ title: "Entrepot" }} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: "Inventaire" }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "Detail produit" }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen}
        options={({ route }) => ({ title: route.params?.productId ? "Modifier" : "Nouveau produit" })} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: "Categories" }} />
      <Stack.Screen name="Mouvements" component={MouvementsScreen} options={{ title: "Mouvements" }} />

      {/* Commerce */}
      <Stack.Screen name="CommerceDashboard" component={CommerceDashboard} options={{ title: "Commerce" }} />
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: "Factures" }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: "Detail facture" }} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={({ route }) => ({ title: (route.params as any)?.invoiceId ? "Modifier la facture" : "Nouvelle facture" })} />
      <Stack.Screen name="ClientList" component={ClientListScreen} options={{ title: "Clients" }} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ title: "Detail client" }} />
      <Stack.Screen name="ClientForm" component={ClientFormScreen}
        options={({ route }) => ({ title: route.params?.clientId ? "Modifier client" : "Nouveau client" })} />
      <Stack.Screen name="DevisList" component={DevisListScreen} options={{ title: "Devis" }} />
      <Stack.Screen name="DevisDetail" component={DevisDetailScreen} options={{ title: "Detail devis" }} />
      <Stack.Screen name="CreateDevis" component={CreateDevisScreen} options={{ title: "Nouveau devis" }} />
      <Stack.Screen name="BonLivraisonList" component={BonLivraisonListScreen} options={{ title: "Bons de livraison" }} />
      <Stack.Screen name="BonLivraisonDetail" component={BonLivraisonDetailScreen} options={{ title: "Detail bon" }} />
      <Stack.Screen name="Creances" component={CreancesScreen} options={{ title: "Creances" }} />
      <Stack.Screen name="AchatsQuotidiens" component={AchatsQuotidiensScreen} options={{ title: "Achats quotidiens" }} />
      <Stack.Screen name="FacturesRecurrentes" component={FacturesRecurrentesScreen} options={{ title: "Factures recurrentes" }} />
      <Stack.Screen name="ExchangeProducts" component={ExchangeProductsScreen} options={{ title: "Produits repris" }} />
      <Stack.Screen name="DemandesClients" component={DemandesClientsScreen} options={{ title: "Demandes clients" }} />
      <Stack.Screen name="ScanInvoice" component={ScanInvoiceScreen} options={{ title: "Scanner facture" }} />

      {/* Maintenance */}
      <Stack.Screen name="MaintenanceList" component={MaintenanceListScreen} options={{ title: "Maintenance" }} />
      <Stack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} options={{ title: "Ticket maintenance" }} />
      <Stack.Screen name="CreateMaintenance" component={CreateMaintenanceScreen}
        options={({ route }) => ({ title: (route.params as any)?.ticketId ? "Modifier ticket" : "Nouveau ticket" })} />

      {/* Boutique */}
      <Stack.Screen name="BoutiqueDashboard" component={BoutiqueDashboardScreen} options={{ title: "Boutique" }} />
      <Stack.Screen name="Catalogue" component={CatalogueScreen} options={{ title: "Catalogue" }} />
      <Stack.Screen name="CommandesBoutique" component={CommandesBoutiqueScreen} options={{ title: "Commandes" }} />
      <Stack.Screen name="CommandeBoutiqueDetail" component={CommandeBoutiqueDetailScreen} options={{ title: "Detail commande" }} />
      <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ title: "Promotions" }} />

      {/* Personnel */}
      <Stack.Screen name="PersonnelDashboard" component={PersonnelDashboardScreen} options={{ title: "Personnel" }} />
      <Stack.Screen name="EmployeList" component={EmployeListScreen} options={{ title: "Employes" }} />
      <Stack.Screen name="EmployeDetail" component={EmployeDetailScreen} options={{ title: "Detail employe" }} />
      <Stack.Screen name="EmployeForm" component={EmployeFormScreen} options={{ title: "Employe" }} />
      <Stack.Screen name="Salaires" component={SalairesScreen} options={{ title: "Salaires" }} />
      <Stack.Screen name="Conges" component={CongesScreen} options={{ title: "Conges" }} />
      <Stack.Screen name="Presences" component={PresencesScreen} options={{ title: "Presences" }} />

      {/* Banque */}
      <Stack.Screen name="BanqueDashboard" component={BanqueDashboardScreen} options={{ title: "Banque" }} />
      <Stack.Screen name="Comptes" component={ComptesScreen} options={{ title: "Comptes" }} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: "Transactions" }} />
      <Stack.Screen name="Virements" component={VirementsScreen} options={{ title: "Virements" }} />
      <Stack.Screen name="Conversion" component={ConversionScreen} options={{ title: "Conversion" }} />

      {/* Analytique */}
      <Stack.Screen name="AnalytiqueDashboard" component={AnalytiqueDashboardScreen} options={{ title: "Analytique" }} />
      <Stack.Screen name="Tendances" component={TendancesScreen} options={{ title: "Tendances" }} />
      <Stack.Screen name="Repartition" component={RepartitionScreen} options={{ title: "Repartition" }} />
      <Stack.Screen name="Rentabilite" component={RentabiliteScreen} options={{ title: "Rentabilite" }} />
      <Stack.Screen name="Objectifs" component={ObjectifsScreen} options={{ title: "Objectifs" }} />

      {/* Logistique */}
      <Stack.Screen name="LogistiqueDashboard" component={LogistiqueDashboardScreen} options={{ title: "Logistique" }} />
      <Stack.Screen name="FournisseurList" component={FournisseurListScreen} options={{ title: "Fournisseurs" }} />
      <Stack.Screen name="FournisseurDetail" component={FournisseurDetailScreen} options={{ title: "Detail fournisseur" }} />
      <Stack.Screen name="FournisseurForm" component={FournisseurFormScreen} options={{ title: "Fournisseur" }} />
      <Stack.Screen name="CommandesLog" component={CommandesLogScreen} options={{ title: "Commandes" }} />
      <Stack.Screen name="CommandeLogDetail" component={CommandeLogDetailScreen} options={{ title: "Detail commande" }} />
      <Stack.Screen name="CreateCommandeLog" component={CreateCommandeLogScreen} options={{ title: "Nouvelle commande" }} />
      <Stack.Screen name="Livraisons" component={LivraisonsScreen} options={{ title: "Livraisons" }} />
      <Stack.Screen name="Notations" component={NotationsScreen} options={{ title: "Notations" }} />
      <Stack.Screen name="ArrivageList" component={ArrivageListScreen} options={{ title: "Arrivages" }} />
      <Stack.Screen name="ArrivageDetail" component={ArrivageDetailScreen} options={{ title: "Detail arrivage" }} />
      <Stack.Screen name="CreateArrivage" component={CreateArrivageScreen} options={{ title: "Nouvel arrivage" }} />

      {/* Pilotage */}
      <Stack.Screen name="TachesDashboard" component={TachesDashboardScreen} options={{ title: "Pilotage" }} />
      <Stack.Screen name="TaskBoards" component={TaskBoardsScreen} options={{ title: "Tableaux" }} />
      <Stack.Screen name="TaskBoardDetail" component={TaskBoardDetailScreen} options={{ title: "Tableau" }} />
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: "Toutes les taches" }} />
    </Stack.Navigator>
  );
}
