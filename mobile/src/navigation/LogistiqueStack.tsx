import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
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

export type LogistiqueStackParamList = {
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
};

const Stack = createNativeStackNavigator<LogistiqueStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function LogistiqueStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
      <Stack.Screen
        name="ArrivageList"
        component={ArrivageListScreen}
        options={{ title: "Arrivages" }}
      />
      <Stack.Screen
        name="ArrivageDetail"
        component={ArrivageDetailScreen}
        options={{ title: "Detail arrivage" }}
      />
      <Stack.Screen
        name="CreateArrivage"
        component={CreateArrivageScreen}
        options={{ title: "Nouvel arrivage" }}
      />
    </Stack.Navigator>
  );
}
