import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { WORKSPACES } from "../../config/workspaces";
import type { AppStackParamList } from "../../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, "WorkspaceSections">;

export default function WorkspaceSectionsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { colors } = useTheme();
  const [activeKey, setActiveKey] = useState(route.params.workspaceKey);

  // Sync state when navigating to this screen with new params
  useEffect(() => {
    setActiveKey(route.params.workspaceKey);
  }, [route.params.workspaceKey]);

  const workspace = WORKSPACES.find((w) => w.key === activeKey);
  const maxSections = Math.max(...WORKSPACES.map((w) => w.sections.length));

  // Update header title when workspace changes
  useEffect(() => {
    const labels: Record<string, string> = {
      entrepot: "Entrepot", commerce: "Commerce", boutique: "Boutique",
      personnel: "Personnel", banque: "Banque", analytique: "Analytique",
      pilotage: "Pilotage", logistique: "Logistique",
    };
    nav.setOptions({ title: labels[activeKey] || activeKey });
  }, [activeKey, nav]);

  // Animate sections when workspace changes
  const fadeAnims = useRef(Array.from({ length: maxSections }, () => new Animated.Value(0))).current;
  const slideAnims = useRef(Array.from({ length: maxSections }, () => new Animated.Value(16))).current;

  const animateSections = useCallback((count: number) => {
    // Reset all
    fadeAnims.forEach((a) => a.setValue(0));
    slideAnims.forEach((a) => a.setValue(16));
    // Animate visible ones
    for (let i = 0; i < count; i++) {
      Animated.parallel([
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 250, delay: i * 40, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 250, delay: i * 40, useNativeDriver: true }),
      ]).start();
    }
  }, [fadeAnims, slideAnims]);

  useEffect(() => {
    if (workspace) animateSections(workspace.sections.length);
  }, [activeKey, workspace]);

  if (!workspace) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>Espace non trouve</Text>
      </View>
    );
  }

  const Icon = workspace.icon;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Workspace header */}
      <View style={[styles.wsHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.wsIconLarge, { backgroundColor: workspace.color + "20" }]}>
          <Icon size={28} color={workspace.color} />
        </View>
        <View style={styles.wsHeaderText}>
          <Text style={[styles.wsTitle, { color: colors.text }]}>{workspace.label}</Text>
          <Text style={[styles.wsDescription, { color: colors.textMuted }]}>{workspace.description}</Text>
        </View>
      </View>

      {/* Sections */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rubriques</Text>
      <View style={styles.sectionsList}>
        {workspace.sections.map((section, index) => {
          const SectionIcon = section.icon;
          return (
            <Animated.View
              key={`${activeKey}-${section.key}`}
              style={{ opacity: fadeAnims[index], transform: [{ translateY: slideAnims[index] }] }}
            >
              <TouchableOpacity
                style={[styles.sectionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => nav.navigate(section.screen as any, section.params as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionIcon, { backgroundColor: workspace.color + "15" }]}>
                  <SectionIcon size={18} color={workspace.color} />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>{section.label}</Text>
                <ChevronRight size={16} color={colors.textDimmed} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Workspace switcher — ALL workspaces, active one highlighted */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xxl }]}>
        Changer d'espace
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switchRow}>
        {WORKSPACES.map((ws) => {
          const WsIcon = ws.icon;
          const isActive = ws.key === activeKey;
          return (
            <TouchableOpacity
              key={ws.key}
              style={[
                styles.switchCard,
                { backgroundColor: colors.card, borderColor: isActive ? ws.color : colors.border },
                isActive && { borderWidth: 2 },
              ]}
              onPress={() => { if (!isActive) setActiveKey(ws.key); }}
              activeOpacity={0.7}
            >
              <View style={[styles.switchIcon, { backgroundColor: ws.color + "20" }]}>
                <WsIcon size={18} color={ws.color} />
              </View>
              <Text
                style={[styles.switchLabel, { color: isActive ? colors.text : colors.textMuted }]}
                numberOfLines={1}
              >
                {ws.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  errorText: { fontSize: fontSize.lg, textAlign: "center", marginTop: 100 },
  wsHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.lg,
    marginBottom: spacing.xxl, borderRadius: borderRadius.lg,
    borderWidth: 1, padding: spacing.xl,
  },
  wsIconLarge: {
    width: 56, height: 56, borderRadius: borderRadius.lg,
    justifyContent: "center", alignItems: "center",
  },
  wsHeaderText: { flex: 1 },
  wsTitle: { fontSize: fontSize.xxl, fontWeight: "700" },
  wsDescription: { fontSize: fontSize.sm, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: "700", marginBottom: spacing.md,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  sectionsList: { gap: spacing.sm },
  sectionRow: {
    flexDirection: "row", alignItems: "center", borderRadius: borderRadius.md,
    borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, gap: spacing.md,
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    justifyContent: "center", alignItems: "center",
  },
  sectionLabel: { flex: 1, fontSize: fontSize.md, fontWeight: "600" },
  switchRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  switchCard: {
    alignItems: "center", borderRadius: borderRadius.md,
    borderWidth: 1, padding: spacing.md, width: 80, gap: spacing.xs,
  },
  switchIcon: {
    width: 36, height: 36, borderRadius: borderRadius.sm,
    justifyContent: "center", alignItems: "center",
  },
  switchLabel: { fontSize: fontSize.xs, textAlign: "center" },
});
