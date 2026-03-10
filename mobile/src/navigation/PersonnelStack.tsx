import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import PersonnelDashboardScreen from "../screens/personnel/PersonnelDashboardScreen";
import EmployeListScreen from "../screens/personnel/EmployeListScreen";
import EmployeDetailScreen from "../screens/personnel/EmployeDetailScreen";
import EmployeFormScreen from "../screens/personnel/EmployeFormScreen";
import SalairesScreen from "../screens/personnel/SalairesScreen";
import CongesScreen from "../screens/personnel/CongesScreen";
import PresencesScreen from "../screens/personnel/PresencesScreen";

export type PersonnelStackParamList = {
  PersonnelDashboard: undefined;
  EmployeList: undefined;
  EmployeDetail: { employeeId: string };
  EmployeForm: { employeeId?: string } | undefined;
  Salaires: undefined;
  Conges: undefined;
  Presences: undefined;
};

const Stack = createNativeStackNavigator<PersonnelStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function PersonnelStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
