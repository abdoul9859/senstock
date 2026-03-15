import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import CommerceDashboard from "../screens/commerce/CommerceDashboard";
import InvoiceListScreen from "../screens/commerce/InvoiceListScreen";
import InvoiceDetailScreen from "../screens/commerce/InvoiceDetailScreen";
import CreateInvoiceScreen from "../screens/commerce/CreateInvoiceScreen";
import ClientListScreen from "../screens/commerce/ClientListScreen";
import ClientDetailScreen from "../screens/commerce/ClientDetailScreen";
import DevisListScreen from "../screens/commerce/DevisListScreen";
import DevisDetailScreen from "../screens/commerce/DevisDetailScreen";
import CreateDevisScreen from "../screens/commerce/CreateDevisScreen";
import BonLivraisonListScreen from "../screens/commerce/BonLivraisonListScreen";
import BonLivraisonDetailScreen from "../screens/commerce/BonLivraisonDetailScreen";
import CreancesScreen from "../screens/commerce/CreancesScreen";
import AchatsQuotidiensScreen from "../screens/commerce/AchatsQuotidiensScreen";
import ScanInvoiceScreen from "../screens/commerce/ScanInvoiceScreen";

export type CommerceStackParamList = {
  CommerceDashboard: undefined;
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  CreateInvoice: undefined;
  ClientList: undefined;
  ClientDetail: { clientId: string };
  DevisList: undefined;
  DevisDetail: { quoteId: string };
  CreateDevis: { quoteId?: string } | undefined;
  BonLivraisonList: undefined;
  BonLivraisonDetail: { deliveryNoteId: string };
  Creances: undefined;
  AchatsQuotidiens: undefined;
  ScanInvoice: undefined;
};

const Stack = createNativeStackNavigator<CommerceStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function CommerceStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="CommerceDashboard"
        component={CommerceDashboard}
        options={{ title: "Commerce" }}
      />
      <Stack.Screen
        name="InvoiceList"
        component={InvoiceListScreen}
        options={{ title: "Factures" }}
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{ title: "Detail facture" }}
      />
      <Stack.Screen
        name="CreateInvoice"
        component={CreateInvoiceScreen}
        options={{ title: "Nouvelle facture" }}
      />
      <Stack.Screen
        name="ClientList"
        component={ClientListScreen}
        options={{ title: "Clients" }}
      />
      <Stack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{ title: "Detail client" }}
      />
      <Stack.Screen
        name="DevisList"
        component={DevisListScreen}
        options={{ title: "Devis" }}
      />
      <Stack.Screen
        name="DevisDetail"
        component={DevisDetailScreen}
        options={{ title: "Detail devis" }}
      />
      <Stack.Screen
        name="CreateDevis"
        component={CreateDevisScreen}
        options={{ title: "Nouveau devis" }}
      />
      <Stack.Screen
        name="BonLivraisonList"
        component={BonLivraisonListScreen}
        options={{ title: "Bons de livraison" }}
      />
      <Stack.Screen
        name="BonLivraisonDetail"
        component={BonLivraisonDetailScreen}
        options={{ title: "Detail bon de livraison" }}
      />
      <Stack.Screen
        name="Creances"
        component={CreancesScreen}
        options={{ title: "Creances" }}
      />
      <Stack.Screen
        name="AchatsQuotidiens"
        component={AchatsQuotidiensScreen}
        options={{ title: "Achats quotidiens" }}
      />
      <Stack.Screen
        name="ScanInvoice"
        component={ScanInvoiceScreen}
        options={{ title: "Scanner facture" }}
      />
    </Stack.Navigator>
  );
}
