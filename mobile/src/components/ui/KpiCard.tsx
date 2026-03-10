import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}

export default function KpiCard({ icon, label, value, subtitle }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.iconRow}>
        {icon}
        <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textDimmed }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    minWidth: 140,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
