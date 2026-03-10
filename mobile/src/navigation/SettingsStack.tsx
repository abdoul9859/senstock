import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fontSize } from "../config/theme";
import { useTheme } from "../contexts/ThemeContext";
import SettingsMenuScreen from "../screens/settings/SettingsMenuScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";
import WorkspaceSettingsScreen from "../screens/settings/WorkspaceSettingsScreen";

export type SettingsStackParamList = {
  SettingsMenu: undefined;
  SettingsGeneral: undefined;
  EntrepotSettings: undefined;
  CommerceSettings: undefined;
  BoutiqueSettings: undefined;
  BanqueSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { colors } = useTheme();
  const screenOptions = {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerTitleStyle: { fontSize: fontSize.lg, fontWeight: "600" as const },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SettingsMenu" component={SettingsMenuScreen} options={{ title: "Reglages" }} />
      <Stack.Screen name="SettingsGeneral" component={SettingsScreen} options={{ title: "Parametres generaux" }} />
      <Stack.Screen name="EntrepotSettings" component={WorkspaceSettingsScreen}
        options={{ title: "Entrepot" }}
        initialParams={{ workspaceKey: "entrepot" }} />
      <Stack.Screen name="CommerceSettings" component={WorkspaceSettingsScreen}
        options={{ title: "Commerce" }}
        initialParams={{ workspaceKey: "commerce" }} />
      <Stack.Screen name="BoutiqueSettings" component={WorkspaceSettingsScreen}
        options={{ title: "Boutique" }}
        initialParams={{ workspaceKey: "boutique" }} />
      <Stack.Screen name="BanqueSettings" component={WorkspaceSettingsScreen}
        options={{ title: "Banque" }}
        initialParams={{ workspaceKey: "banque" }} />
    </Stack.Navigator>
  );
}
