import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import BanqueDashboardScreen from "../screens/banque/BanqueDashboardScreen";
import ComptesScreen from "../screens/banque/ComptesScreen";
import TransactionsScreen from "../screens/banque/TransactionsScreen";
import VirementsScreen from "../screens/banque/VirementsScreen";
import ConversionScreen from "../screens/banque/ConversionScreen";

export type BanqueStackParamList = {
  BanqueDashboard: undefined;
  Comptes: undefined;
  CompteForm: { accountId?: string } | undefined;
  Transactions: undefined;
  Virements: undefined;
  Conversion: undefined;
};

const Stack = createNativeStackNavigator<BanqueStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function BanqueStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="BanqueDashboard"
        component={BanqueDashboardScreen}
        options={{ title: "Banque" }}
      />
      <Stack.Screen
        name="Comptes"
        component={ComptesScreen}
        options={{ title: "Comptes bancaires" }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: "Transactions" }}
      />
      <Stack.Screen
        name="Virements"
        component={VirementsScreen}
        options={{ title: "Virements" }}
      />
      <Stack.Screen
        name="Conversion"
        component={ConversionScreen}
        options={{ title: "Conversion devises" }}
      />
    </Stack.Navigator>
  );
}
