import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Lock } from "lucide-react-native";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  module: string;
}

export default function UpgradePrompt({ module }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Lock size={32} color={colors.textDimmed} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Module verrouille</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Le module {module} est disponible avec le plan Pro ou Entreprise.
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => Linking.openURL("https://stockflow.app/#tarifs")}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Voir les plans</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
