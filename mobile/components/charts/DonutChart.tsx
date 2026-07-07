import React, { useMemo } from "react";
import { View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Text } from "../ui/Text";
import { useTheme } from "@/lib/theme";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Native donut chart drawn with Skia. Renders each slice as a stroked arc so no
 * font asset is required. A centered total is overlaid with RN text.
 */
export function DonutChart({
  data,
  size = 180,
  strokeWidth = 26,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const t = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  const arcs = useMemo(() => {
    const rect = Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2);
    let startDeg = -90; // start at 12 o'clock
    const gap = total > 0 && data.length > 1 ? 2 : 0; // degrees between slices
    return data
      .filter((d) => d.value > 0)
      .map((d) => {
        const sweep = total > 0 ? (d.value / total) * 360 : 0;
        const path = Skia.Path.Make();
        path.addArc(rect, startDeg + gap / 2, Math.max(0, sweep - gap));
        startDeg += sweep;
        return { path, color: d.color };
      });
  }, [data, total, cx, cy, r]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* track */}
        <Path
          path={(() => {
            const p = Skia.Path.Make();
            p.addCircle(cx, cy, r);
            return p;
          })()}
          style="stroke"
          strokeWidth={strokeWidth}
          color={t.border}
        />
        {arcs.map((a, i) => (
          <Path
            key={i}
            path={a.path}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            color={a.color}
          />
        ))}
      </Canvas>
      {(centerValue || centerLabel) && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerValue ? (
            <Text variant="title" weight="bold">
              {centerValue}
            </Text>
          ) : null}
          {centerLabel ? (
            <Text variant="caption" tone="muted">
              {centerLabel}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
