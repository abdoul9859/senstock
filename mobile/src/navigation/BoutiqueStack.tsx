import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import BoutiqueDashboardScreen from "../screens/boutique/BoutiqueDashboardScreen";
import CatalogueScreen from "../screens/boutique/CatalogueScreen";
import CommandesBoutiqueScreen from "../screens/boutique/CommandesBoutiqueScreen";
import CommandeBoutiqueDetailScreen from "../screens/boutique/CommandeBoutiqueDetailScreen";
import PromotionsScreen from "../screens/boutique/PromotionsScreen";

export type BoutiqueStackParamList = {
  BoutiqueDashboard: undefined;
  Catalogue: undefined;
  CommandesBoutique: undefined;
  CommandeBoutiqueDetail: { orderId: string };
  Promotions: undefined;
};

const Stack = createNativeStackNavigator<BoutiqueStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function BoutiqueStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
