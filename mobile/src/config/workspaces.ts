import {
  Boxes, Package, ArrowDownUp, ClipboardList, LayoutDashboard,
  Receipt, FileText, FilePlus, FileCheck, Users, ShoppingBag, Landmark, Repeat,
  Store, ShoppingCart, Tag, Globe,
  UserCog, Wallet, CalendarOff,
  Building2, ArrowLeftRight, Calculator,
  BarChart3, TrendingUp, PieChart, DollarSign, Target,
  ListTodo, KanbanSquare, ListChecks, CalendarDays,
  Truck, Star, MapPin, CalendarClock,
} from "lucide-react-native";

export interface WorkspaceSection {
  key: string;
  label: string;
  icon: any;
  screen: string;
  params?: Record<string, any>;
}

export interface WorkspaceConfig {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: string;
  sections: WorkspaceSection[];
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    key: "entrepot",
    label: "Entrepot",
    description: "Gestion des stocks et inventaire",
    icon: Boxes,
    color: "#10b981",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "EntrepotDashboard" },
      { key: "products", label: "Inventaire", icon: ClipboardList, screen: "ProductList" },
      { key: "categories", label: "Categories", icon: Package, screen: "Categories" },
      { key: "mouvements", label: "Mouvements", icon: ArrowDownUp, screen: "Mouvements" },
    ],
  },
  {
    key: "commerce",
    label: "Commerce",
    description: "Ventes, factures et clients",
    icon: Receipt,
    color: "#3b82f6",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "CommerceDashboard" },
      { key: "invoices", label: "Factures", icon: FileText, screen: "InvoiceList" },
      { key: "quotes", label: "Devis", icon: FilePlus, screen: "DevisList" },
      { key: "delivery", label: "Bons de livraison", icon: FileCheck, screen: "BonLivraisonList" },
      { key: "clients", label: "Clients", icon: Users, screen: "ClientList" },
      { key: "receivables", label: "Creances", icon: Landmark, screen: "Creances" },
      { key: "purchases", label: "Achats quotidiens", icon: ShoppingBag, screen: "AchatsQuotidiens" },
      { key: "recurring", label: "Factures recurrentes", icon: Repeat, screen: "FacturesRecurrentes" },
    ],
  },
  {
    key: "boutique",
    label: "Boutique",
    description: "Boutique en ligne et commandes",
    icon: Store,
    color: "#8b5cf6",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "BoutiqueDashboard" },
      { key: "catalogue", label: "Catalogue", icon: Package, screen: "Catalogue" },
      { key: "orders", label: "Commandes", icon: ShoppingCart, screen: "CommandesBoutique" },
      { key: "promotions", label: "Promotions", icon: Tag, screen: "Promotions" },
    ],
  },
  {
    key: "personnel",
    label: "Personnel",
    description: "Employes, salaires et conges",
    icon: UserCog,
    color: "#f59e0b",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "PersonnelDashboard" },
      { key: "employees", label: "Employes", icon: Users, screen: "EmployeList" },
      { key: "salaries", label: "Salaires", icon: Wallet, screen: "Salaires" },
      { key: "leaves", label: "Conges", icon: CalendarOff, screen: "Conges" },
      { key: "attendance", label: "Presences", icon: ClipboardList, screen: "Presences" },
    ],
  },
  {
    key: "banque",
    label: "Banque",
    description: "Comptes et transactions",
    icon: Building2,
    color: "#06b6d4",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "BanqueDashboard" },
      { key: "accounts", label: "Comptes", icon: Wallet, screen: "Comptes" },
      { key: "transactions", label: "Transactions", icon: ArrowLeftRight, screen: "Transactions" },
      { key: "transfers", label: "Virements", icon: ArrowDownUp, screen: "Virements" },
      { key: "conversion", label: "Conversion", icon: Calculator, screen: "Conversion" },
    ],
  },
  {
    key: "analytique",
    label: "Analytique",
    description: "Rapports et statistiques",
    icon: BarChart3,
    color: "#ec4899",
    sections: [
      { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, screen: "AnalytiqueDashboard" },
      { key: "trends", label: "Tendances", icon: TrendingUp, screen: "Tendances" },
      { key: "distribution", label: "Repartition", icon: PieChart, screen: "Repartition" },
      { key: "profitability", label: "Rentabilite", icon: DollarSign, screen: "Rentabilite" },
      { key: "goals", label: "Objectifs", icon: Target, screen: "Objectifs" },
    ],
  },
  {
    key: "pilotage",
    label: "Pilotage",
    description: "Tableaux et gestion de taches",
    icon: ListTodo,
    color: "#14b8a6",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "TachesDashboard" },
      { key: "boards", label: "Tableaux", icon: KanbanSquare, screen: "TaskBoards" },
      { key: "tasks", label: "Toutes les taches", icon: ListChecks, screen: "TaskList" },
    ],
  },
  {
    key: "logistique",
    label: "Logistique",
    description: "Fournisseurs et approvisionnement",
    icon: Truck,
    color: "#f97316",
    sections: [
      { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, screen: "LogistiqueDashboard" },
      { key: "suppliers", label: "Fournisseurs", icon: Users, screen: "FournisseurList" },
      { key: "ratings", label: "Notations", icon: Star, screen: "Notations" },
      { key: "orders", label: "Commandes", icon: ShoppingCart, screen: "CommandesLog" },
      { key: "deliveries", label: "Livraisons", icon: MapPin, screen: "Livraisons" },
      { key: "arrivages", label: "Arrivages", icon: Package, screen: "ArrivageList" },
    ],
  },
];
