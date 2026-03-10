import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors, fontSize } from "../config/theme";
import TachesDashboardScreen from "../screens/taches/TachesDashboardScreen";
import TaskBoardsScreen from "../screens/taches/TaskBoardsScreen";
import TaskBoardDetailScreen from "../screens/taches/TaskBoardDetailScreen";
import TaskListScreen from "../screens/taches/TaskListScreen";

export type TachesStackParamList = {
  TachesDashboard: undefined;
  TaskBoards: undefined;
  TaskBoardDetail: { boardId: string };
  TaskList: undefined;
};

const Stack = createNativeStackNavigator<TachesStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function TachesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
