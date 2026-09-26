import React from "react";
import { View } from "react-native";
import { radius, useTheme } from "@/lib/theme";

/** Horizontal proportion bar used in ranking rows. */
export function ProgressBar({
  fraction,
  color,
  height = 6,
}: {
  fraction: number;
  color: string;
  height?: number;
}) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, fraction));
  return (
    <View
      style={{
        height,
        borderRadius: radius.full,
        backgroundColor: t.border,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          borderRadius: radius.full,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
