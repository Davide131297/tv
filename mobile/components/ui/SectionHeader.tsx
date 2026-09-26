import React from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { spacing } from "@/lib/theme";

/** Section title with optional trailing accessory (e.g. a count or action). */
export function SectionHeader({
  title,
  subtitle,
  accessory,
}: {
  title: string;
  subtitle?: string;
  accessory?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: spacing.md,
        marginTop: spacing.xl,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="headline" weight="bold">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory}
    </View>
  );
}
