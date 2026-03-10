import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Plus, UserCheck, Phone, ChevronRight } from "lucide-react-native";
import { apiFetch } from "../../config/api";
import { spacing, fontSize, borderRadius } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";
import type { Employee } from "../../types";
import type { ModulesStackParamList } from "../../navigation/ModulesStack";

type Nav = NativeStackNavigationProp<ModulesStackParamList, "EmployeList">;

export default function EmployeListScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await apiFetch("/api/employees");
      if (res.ok) setEmployees(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const unsubscribe = nav.addListener("focus", () => {
      fetchEmployees();
    });
    return unsubscribe;
  }, [nav, fetchEmployees]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = employees.filter((emp) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (emp.role && emp.role.toLowerCase().includes(q)) ||
      (emp.phone && emp.phone.includes(q))
    );
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search + add */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Search size={18} color={colors.textDimmed} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un employe..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => nav.navigate("EmployeForm")}
          activeOpacity={0.7}
        >
          <Plus size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => nav.navigate("EmployeDetail", { employeeId: item._id })}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: colors.cardAlt }]}>
              <UserCheck size={20} color={colors.textDimmed} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.firstName} {item.lastName}
              </Text>
              {item.role && <Text style={[styles.role, { color: colors.textMuted }]}>{item.role}</Text>}
              {item.phone && (
                <View style={styles.phoneRow}>
                  <Phone size={12} color={colors.textDimmed} />
                  <Text style={[styles.phone, { color: colors.textDimmed }]}>{item.phone}</Text>
                </View>
              )}
            </View>
            <ChevronRight size={18} color={colors.textDimmed} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textDimmed }]}>Aucun employe</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  role: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  phone: {
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
