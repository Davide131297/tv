import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { spacing } from "@/lib/theme";

export interface LegendItem {
  label: string;
  color: string;
  value?: string;
}

/** Compact two-column legend for donut / line charts. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((it) => (
        <View
          key={it.label}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: it.color,
              marginRight: spacing.sm,
            }}
          />
          <Text variant="callout" numberOfLines={1} style={{ flex: 1 }}>
            {it.label}
          </Text>
          {it.value ? (
            <Text variant="callout" weight="semibold" tone="muted">
              {it.value}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
