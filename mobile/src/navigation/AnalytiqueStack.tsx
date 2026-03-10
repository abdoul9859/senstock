import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import AnalytiqueDashboardScreen from "../screens/analytique/AnalytiqueDashboardScreen";
import TendancesScreen from "../screens/analytique/TendancesScreen";
import RepartitionScreen from "../screens/analytique/RepartitionScreen";
import RentabiliteScreen from "../screens/analytique/RentabiliteScreen";
import ObjectifsScreen from "../screens/analytique/ObjectifsScreen";

export type AnalytiqueStackParamList = {
  AnalytiqueDashboard: undefined;
  Tendances: undefined;
  Repartition: undefined;
  Rentabilite: undefined;
  Objectifs: undefined;
};

const Stack = createNativeStackNavigator<AnalytiqueStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function AnalytiqueStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AnalytiqueDashboard"
        component={AnalytiqueDashboardScreen}
        options={{ title: "Analytique" }}
      />
      <Stack.Screen
        name="Tendances"
        component={TendancesScreen}
        options={{ title: "Tendances" }}
      />
      <Stack.Screen
        name="Repartition"
        component={RepartitionScreen}
        options={{ title: "Repartition" }}
      />
      <Stack.Screen
        name="Rentabilite"
        component={RentabiliteScreen}
        options={{ title: "Rentabilite" }}
      />
      <Stack.Screen
        name="Objectifs"
        component={ObjectifsScreen}
        options={{ title: "Objectifs" }}
      />
    </Stack.Navigator>
  );
}
