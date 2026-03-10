import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import ModulesGridScreen from "../screens/modules/ModulesGridScreen";
import BoutiqueDashboardScreen from "../screens/boutique/BoutiqueDashboardScreen";
import CatalogueScreen from "../screens/boutique/CatalogueScreen";
import CommandesBoutiqueScreen from "../screens/boutique/CommandesBoutiqueScreen";
import CommandeBoutiqueDetailScreen from "../screens/boutique/CommandeBoutiqueDetailScreen";
import PromotionsScreen from "../screens/boutique/PromotionsScreen";
import PersonnelDashboardScreen from "../screens/personnel/PersonnelDashboardScreen";
import EmployeListScreen from "../screens/personnel/EmployeListScreen";
import EmployeDetailScreen from "../screens/personnel/EmployeDetailScreen";
import EmployeFormScreen from "../screens/personnel/EmployeFormScreen";
import SalairesScreen from "../screens/personnel/SalairesScreen";
import CongesScreen from "../screens/personnel/CongesScreen";
import PresencesScreen from "../screens/personnel/PresencesScreen";
import BanqueStack from "./BanqueStack";
import AnalytiqueStack from "./AnalytiqueStack";
import LogistiqueDashboardScreen from "../screens/logistique/LogistiqueDashboardScreen";
import FournisseurListScreen from "../screens/logistique/FournisseurListScreen";
import FournisseurDetailScreen from "../screens/logistique/FournisseurDetailScreen";
import FournisseurFormScreen from "../screens/logistique/FournisseurFormScreen";
import CommandesLogScreen from "../screens/logistique/CommandesLogScreen";
import CommandeLogDetailScreen from "../screens/logistique/CommandeLogDetailScreen";
import CreateCommandeLogScreen from "../screens/logistique/CreateCommandeLogScreen";
import LivraisonsScreen from "../screens/logistique/LivraisonsScreen";
import NotationsScreen from "../screens/logistique/NotationsScreen";
import TachesDashboardScreen from "../screens/taches/TachesDashboardScreen";
import TaskBoardsScreen from "../screens/taches/TaskBoardsScreen";
import TaskBoardDetailScreen from "../screens/taches/TaskBoardDetailScreen";
import TaskListScreen from "../screens/taches/TaskListScreen";

export type ModulesStackParamList = {
  ModulesGrid: undefined;
  BoutiqueDashboard: undefined;
  Catalogue: undefined;
  CommandesBoutique: undefined;
  CommandeBoutiqueDetail: { orderId: string };
  Promotions: undefined;
  PersonnelDashboard: undefined;
  EmployeList: undefined;
  EmployeDetail: { employeeId: string };
  EmployeForm: { employeeId?: string } | undefined;
  Salaires: undefined;
  Conges: undefined;
  Presences: undefined;
  BanqueDashboard: undefined;
  AnalytiqueDashboard: undefined;
  LogistiqueDashboard: undefined;
  FournisseurList: undefined;
  FournisseurDetail: { supplierId: string };
  FournisseurForm: { supplierId?: string } | undefined;
  CommandesLog: undefined;
  CommandeLogDetail: { orderId: string };
  CreateCommandeLog: undefined;
  Livraisons: undefined;
  Notations: undefined;
  TachesDashboard: undefined;
  TaskBoards: undefined;
  TaskBoardDetail: { boardId: string };
  TaskList: undefined;
};

const Stack = createNativeStackNavigator<ModulesStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function ModulesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ModulesGrid"
        component={ModulesGridScreen}
        options={{ title: "Modules" }}
      />
      <Stack.Screen
        name="BoutiqueDashboard"
        component={BoutiqueDashboardScreen}
        options={{ title: "Boutique" }}
      />
      <Stack.Screen
        name="Catalogue"
        component={CatalogueScreen}
        options={{ title: "Catalogue" }}
      />
      <Stack.Screen
        name="CommandesBoutique"
        component={CommandesBoutiqueScreen}
        options={{ title: "Commandes boutique" }}
      />
      <Stack.Screen
        name="CommandeBoutiqueDetail"
        component={CommandeBoutiqueDetailScreen}
        options={{ title: "Detail commande" }}
      />
      <Stack.Screen
        name="Promotions"
        component={PromotionsScreen}
        options={{ title: "Promotions" }}
      />
      <Stack.Screen
        name="PersonnelDashboard"
        component={PersonnelDashboardScreen}
        options={{ title: "Personnel" }}
      />
      <Stack.Screen
        name="EmployeList"
        component={EmployeListScreen}
        options={{ title: "Employes" }}
      />
      <Stack.Screen
        name="EmployeDetail"
        component={EmployeDetailScreen}
        options={{ title: "Detail employe" }}
      />
      <Stack.Screen
        name="EmployeForm"
        component={EmployeFormScreen}
        options={{ title: "Formulaire employe" }}
      />
      <Stack.Screen
        name="Salaires"
        component={SalairesScreen}
        options={{ title: "Salaires" }}
      />
      <Stack.Screen
        name="Conges"
        component={CongesScreen}
        options={{ title: "Conges" }}
      />
      <Stack.Screen
        name="Presences"
        component={PresencesScreen}
        options={{ title: "Presences" }}
      />
      <Stack.Screen
        name="BanqueDashboard"
        component={BanqueStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AnalytiqueDashboard"
        component={AnalytiqueStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LogistiqueDashboard"
        component={LogistiqueDashboardScreen}
        options={{ title: "Logistique" }}
      />
      <Stack.Screen
        name="FournisseurList"
        component={FournisseurListScreen}
        options={{ title: "Fournisseurs" }}
      />
      <Stack.Screen
        name="FournisseurDetail"
        component={FournisseurDetailScreen}
        options={{ title: "Detail fournisseur" }}
      />
      <Stack.Screen
        name="FournisseurForm"
        component={FournisseurFormScreen}
        options={{ title: "Fournisseur" }}
      />
      <Stack.Screen
        name="CommandesLog"
        component={CommandesLogScreen}
        options={{ title: "Commandes" }}
      />
      <Stack.Screen
        name="CommandeLogDetail"
        component={CommandeLogDetailScreen}
        options={{ title: "Detail commande" }}
      />
      <Stack.Screen
        name="CreateCommandeLog"
        component={CreateCommandeLogScreen}
        options={{ title: "Nouvelle commande" }}
      />
      <Stack.Screen
        name="Livraisons"
        component={LivraisonsScreen}
        options={{ title: "Livraisons" }}
      />
      <Stack.Screen
        name="Notations"
        component={NotationsScreen}
        options={{ title: "Notations" }}
      />
      {/* Taches */}
      <Stack.Screen
        name="TachesDashboard"
        component={TachesDashboardScreen}
        options={{ title: "Taches" }}
      />
      <Stack.Screen
        name="TaskBoards"
        component={TaskBoardsScreen}
        options={{ title: "Tableaux" }}
      />
      <Stack.Screen
        name="TaskBoardDetail"
        component={TaskBoardDetailScreen}
        options={{ title: "Tableau" }}
      />
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{ title: "Liste des taches" }}
      />
    </Stack.Navigator>
  );
}
