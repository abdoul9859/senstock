import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Monitor, Smartphone, X } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";
import { spacing, fontSize, borderRadius } from "../config/theme";

interface DraftSession {
  id: string;
  device: string;
  deviceName: string;
  updatedAt: string;
}

interface DraftBannerProps {
  drafts: DraftSession[];
  onResume?: () => void;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function DraftBanner({ drafts, onResume }: DraftBannerProps) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  // Only show drafts updated in the last 10 minutes
  const recentDrafts = drafts.filter((d) => {
    const diffMs = Date.now() - new Date(d.updatedAt).getTime();
    return diffMs < 10 * 60 * 1000;
  });

  if (recentDrafts.length === 0 || dismissed) return null;

  const draft = recentDrafts[0];
  const Icon = draft.device === "mobile" ? Smartphone : Monitor;
  const deviceLabel = draft.device === "mobile" ? "mobile" : "ordinateur";

  return (
    <View style={[styles.container, { backgroundColor: "#3b82f620", borderColor: "#3b82f640" }]}>
      <View style={[styles.iconCircle, { backgroundColor: "#3b82f630" }]}>
        <Icon size={16} color="#3b82f6" />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          Création en cours sur {deviceLabel}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textDimmed }]}>
          {draft.deviceName ? `${draft.deviceName} - ` : ""}{formatTime(draft.updatedAt)}
        </Text>
      </View>
      {onResume && (
        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={onResume}
        >
          <Text style={styles.resumeBtnText}>Reprendre</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
        <X size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  resumeBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resumeBtnText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
});
