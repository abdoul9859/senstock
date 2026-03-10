import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fontSize } from "../config/theme";
import { useTheme } from "../contexts/ThemeContext";
import WorkspaceListScreen from "../screens/home/WorkspaceListScreen";

export type WorkspaceListStackParamList = {
  WorkspaceList: undefined;
};

const Stack = createNativeStackNavigator<WorkspaceListStackParamList>();

export default function WorkspaceListStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="WorkspaceList"
        component={WorkspaceListScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
