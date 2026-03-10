import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Repeat, Calendar, User, ChevronRight } from "lucide-react-native";
import ScreenContainer from "../../components/ui/ScreenContainer";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { RecurringInvoice } from "../../types";

export default function FacturesRecurrentesScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/recurring-invoices");
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Repeat size={48} color={colors.textDimmed} />
          <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucune facture recurrente</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <User size={16} color={colors.textMuted} />
                <Text style={[styles.clientName, { color: colors.text }]}>{item.client?.name || "Client"}</Text>
                <View style={[styles.badge, item.active ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>{item.active ? "Actif" : "Inactif"}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Calendar size={14} color={colors.textDimmed} />
                <Text style={[styles.meta, { color: colors.textDimmed }]}>
                  {item.frequency} - Prochaine : {new Date(item.nextDate).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <Text style={[styles.total, { color: colors.primary }]}>
                {item.templateItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", gap: spacing.md, marginTop: 80 },
  emptyText: { fontSize: fontSize.md },
  card: {
    borderRadius: borderRadius.md, borderWidth: 1,
    padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  clientName: { flex: 1, fontSize: fontSize.md, fontWeight: "600" },
  meta: { fontSize: fontSize.sm },
  total: { fontSize: fontSize.lg, fontWeight: "700" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  badgeActive: { backgroundColor: "rgba(34,197,94,0.15)" },
  badgeInactive: { backgroundColor: "rgba(161,161,170,0.15)" },
  badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
});
