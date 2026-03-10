import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, LayoutGrid, Settings } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";
import { fontSize } from "../config/theme";
import AppStack from "./AppStack";
import WorkspaceListStack from "./WorkspaceListStack";
import SettingsStack from "./SettingsStack";

export type MainTabsParamList = {
  WorkspacesTab: undefined;
  HomeTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

/* ── Animated center button ── */
function AnimatedHomeButton({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: focused ? 1.1 : 1, friction: 3, useNativeDriver: true }).start();
  }, [focused]);

  useEffect(() => {
    if (focused) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(1);
    }
  }, [focused]);

  return (
    <View style={homeBtn.wrapper}>
      <Animated.View style={[homeBtn.glow, { opacity: focused ? 0.35 : 0, transform: [{ scale: pulse }] }]} />
      <Animated.View
        style={[
          homeBtn.circle,
          {
            backgroundColor: colors.primary,
            borderColor: colors.tabBarBackground,
            transform: [{ scale }],
            ...(Platform.OS === "web"
              ? { boxShadow: focused
                  ? "0 8px 28px rgba(16,185,129,0.6)"
                  : "0 4px 14px rgba(16,185,129,0.3)" }
              : {}),
          },
          Platform.OS !== "web" && {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: focused ? 0.6 : 0.3,
            shadowRadius: 16,
            elevation: focused ? 14 : 8,
          },
        ]}
      >
        <Home size={26} color="#fff" />
      </Animated.View>
    </View>
  );
}

const homeBtn = StyleSheet.create({
  wrapper: {
    top: -22,
    width: 74,
    height: 74,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.25)",
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
  },
});

/* ── Side tab icon with pill background ── */
function TabIcon({ icon: IconComp, label, focused }: { icon: any; label: string; focused: boolean }) {
  const { colors } = useTheme();
  const color = focused ? colors.primary : colors.tabBarInactive;

  return (
    <View style={tabIcon.container}>
      <View style={[tabIcon.pill, focused && tabIcon.pillActive]}>
        <IconComp size={20} color={color} />
      </View>
      <Text style={[tabIcon.label, { color }]}>{label}</Text>
    </View>
  );
}

const tabIcon = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 64,
  },
  pill: {
    width: 44,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  pillActive: {
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

/* ── Tab Navigator ── */
export default function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0,
          height: 68,
          paddingTop: 6,
          ...(Platform.OS === "web"
            ? { boxShadow: "0 -2px 20px rgba(0,0,0,0.3)" }
            : {}),
          ...(Platform.OS !== "web"
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 15,
              }
            : {}),
        },
      }}
    >
      <Tab.Screen
        name="WorkspacesTab"
        component={WorkspaceListStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={LayoutGrid} label="Espaces" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={AppStack}
        options={{
          tabBarIcon: ({ focused }) => <AnimatedHomeButton focused={focused} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // When pressing the Home tab, navigate to the root Home screen
            navigation.navigate("HomeTab", { screen: "Home" });
          },
        })}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Settings} label="Reglages" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
