import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/lib/theme";

interface ScreenProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Standard screen container: themed background, horizontal gutters, bottom safe
 * inset, and optional pull-to-refresh. Non-scroll variant for list screens that
 * host their own FlatList.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  contentStyle,
}: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={[
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
        },
        contentStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.accent}
            colors={[t.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
