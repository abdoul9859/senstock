import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { WORKSPACES } from "../../config/workspaces";

export default function WorkspaceListScreen() {
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  const fadeAnims = useRef(WORKSPACES.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(WORKSPACES.map(() => new Animated.Value(24))).current;

  useEffect(() => {
    WORKSPACES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(fadeAnims[i], { toValue: 1, duration: 350, delay: i * 50, useNativeDriver: true }),
        Animated.timing(slideAnims[i], { toValue: 0, duration: 350, delay: i * 50, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Espaces de travail</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Selectionnez un espace pour acceder a ses rubriques</Text>

      <View style={styles.list}>
        {WORKSPACES.map((ws, index) => {
          const Icon = ws.icon;
          return (
            <Animated.View
              key={ws.key}
              style={{ opacity: fadeAnims[index], transform: [{ translateY: slideAnims[index] }] }}
            >
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  nav.navigate("HomeTab", { screen: "WorkspaceSections", params: { workspaceKey: ws.key } });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: ws.color + "18" }]}>
                  <Icon size={24} color={ws.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.wsName, { color: colors.text }]}>{ws.label}</Text>
                  <Text style={[styles.wsDesc, { color: colors.textMuted }]}>{ws.description}</Text>
                  <View style={styles.badgeRow}>
                    {ws.sections.slice(0, 3).map((s) => (
                      <View key={s.key} style={[styles.sectionBadge, { backgroundColor: colors.cardAlt }]}>
                        <Text style={[styles.sectionBadgeText, { color: colors.textDimmed }]}>{s.label}</Text>
                      </View>
                    ))}
                    {ws.sections.length > 3 && (
                      <Text style={[styles.moreText, { color: colors.textDimmed }]}>+{ws.sections.length - 3}</Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textDimmed} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xxxl + 10 },
  title: { fontSize: fontSize.xxl, fontWeight: "700", marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, marginBottom: spacing.xxl },
  list: { gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, gap: spacing.xs },
  wsName: { fontSize: fontSize.lg, fontWeight: "700" },
  wsDesc: { fontSize: fontSize.xs },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  sectionBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 10 },
  moreText: { fontSize: 10, alignSelf: "center" },
});
