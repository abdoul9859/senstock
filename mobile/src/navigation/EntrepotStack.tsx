import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import EntrepotDashboard from "../screens/entrepot/EntrepotDashboard";
import ProductListScreen from "../screens/entrepot/ProductListScreen";
import ProductDetailScreen from "../screens/entrepot/ProductDetailScreen";
import ProductFormScreen from "../screens/entrepot/ProductFormScreen";
import CategoriesScreen from "../screens/entrepot/CategoriesScreen";
import MouvementsScreen from "../screens/entrepot/MouvementsScreen";

export type EntrepotStackParamList = {
  EntrepotDashboard: undefined;
  ProductList: undefined;
  ProductDetail: { productId: string };
  ProductForm: { productId?: string } | undefined;
  Categories: undefined;
  Mouvements: undefined;
};

const Stack = createNativeStackNavigator<EntrepotStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function EntrepotStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="EntrepotDashboard"
        component={EntrepotDashboard}
        options={{ title: "Entrepot" }}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: "Produits" }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Detail produit" }}
      />
      <Stack.Screen
        name="ProductForm"
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.productId ? "Modifier produit" : "Nouveau produit",
        })}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: "Categories" }}
      />
      <Stack.Screen
        name="Mouvements"
        component={MouvementsScreen}
        options={{ title: "Mouvements" }}
      />
    </Stack.Navigator>
  );
}
