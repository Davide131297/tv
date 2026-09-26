import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { spacing, useTheme } from "@/lib/theme";

/** Friendly empty / error placeholder. */
export function EmptyState({
  icon = "cloud-offline-outline",
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.xxl * 1.5,
        paddingHorizontal: spacing.xl,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: t.accentSoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.lg,
        }}
      >
        <Ionicons name={icon} size={30} color={t.accent} />
      </View>
      <Text variant="headline" weight="semibold">
        {title}
      </Text>
      {message ? (
        <Text
          variant="subhead"
          tone="muted"
          style={{ textAlign: "center", marginTop: spacing.xs }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
