import React from "react";
import { View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { Text } from "./Text";
import { spacing, useTheme } from "@/lib/theme";

interface StatTileProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  style?: ViewStyle;
}

/** Compact KPI tile for dashboard grids. */
export function StatTile({ label, value, icon, accent, style }: StatTileProps) {
  const t = useTheme();
  const tint = accent ?? t.accent;
  return (
    <Card style={style}>
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.accentSoft,
            marginBottom: spacing.md,
          }}
        >
          <Ionicons name={icon} size={19} color={tint} />
        </View>
      ) : null}
      <Text variant="largeTitle" weight="bold">
        {value}
      </Text>
      <Text variant="subhead" tone="muted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </Card>
  );
}
