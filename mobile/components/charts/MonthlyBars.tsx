import React, { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Canvas, RoundedRect } from "@shopify/react-native-skia";
import { Text } from "../ui/Text";
import { spacing, useTheme } from "@/lib/theme";

export interface BarPoint {
  label: string;
  value: number;
}

/** Native vertical bar chart (Skia) with RN month labels aligned underneath. */
export function MonthlyBars({
  data,
  height = 150,
  color,
}: {
  data: BarPoint[];
  height?: number;
  color?: string;
}) {
  const t = useTheme();
  const tint = color ?? t.accent;
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const slot = width / n;
  const barW = Math.max(4, Math.min(slot * 0.55, 22));
  const chartH = height - 4;

  return (
    <View onLayout={onLayout}>
      <Canvas style={{ width: "100%", height }}>
        {width > 0 &&
          data.map((d, i) => {
            const h = (d.value / max) * (chartH - 8);
            const x = i * slot + (slot - barW) / 2;
            const y = chartH - h;
            return (
              <RoundedRect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                r={4}
                color={d.value === max ? tint : t.border}
                opacity={d.value === max ? 1 : 0.9}
              />
            );
          })}
      </Canvas>
      <View style={{ flexDirection: "row", marginTop: spacing.xs }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text variant="caption" tone="faint">
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
