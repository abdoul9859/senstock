import React, { ReactNode } from "react";
import { View, ScrollView, StyleSheet, StatusBar, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "../../config/theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
}: Props) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, padded && styles.padded]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, padded && styles.padded, { flex: 1 }]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});
