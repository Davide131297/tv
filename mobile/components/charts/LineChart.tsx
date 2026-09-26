import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Text } from "../ui/Text";
import { spacing, useTheme } from "@/lib/theme";

export interface LineSeries {
  key: string;
  color: string;
  values: number[];
}

/**
 * Multi-series native line chart (Skia). X axis is evenly spaced; Y scales to
 * the overall max across series. Sparse x labels avoid crowding.
 */
export function LineChart({
  series,
  labels,
  height = 190,
}: {
  series: LineSeries[];
  labels: string[];
  height?: number;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const max = Math.max(
    1,
    ...series.flatMap((s) => s.values),
  );
  const n = labels.length;
  const chartH = height - 4;

  const paths = useMemo(() => {
    if (width <= 0 || n === 0) return [];
    const stepX = n > 1 ? width / (n - 1) : 0;
    return series.map((s) => {
      const p = Skia.Path.Make();
      s.values.forEach((v, i) => {
        const x = i * stepX;
        const y = chartH - (v / max) * (chartH - 6) - 3;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      });
      return { path: p, color: s.color };
    });
  }, [series, width, n, max, chartH]);

  // Sparse labels: first, middle, last
  const labelIdx = useMemo(() => {
    if (n <= 1) return [0];
    if (n <= 4) return labels.map((_, i) => i);
    return [0, Math.floor((n - 1) / 2), n - 1];
  }, [n, labels]);

  // Baseline grid line
  const baseline = useMemo(() => {
    if (width <= 0) return null;
    const p = Skia.Path.Make();
    p.moveTo(0, chartH - 3);
    p.lineTo(width, chartH - 3);
    return p;
  }, [width, chartH]);

  return (
    <View onLayout={onLayout}>
      <Canvas style={{ width: "100%", height }}>
        {baseline && (
          <Path
            path={baseline}
            style="stroke"
            strokeWidth={1}
            color={t.border}
          />
        )}
        {paths.map((p, i) => (
          <Path
            key={i}
            path={p.path}
            style="stroke"
            strokeWidth={2.5}
            strokeJoin="round"
            strokeCap="round"
            color={p.color}
          />
        ))}
      </Canvas>
      <View style={{ position: "relative", height: 16, marginTop: spacing.xs }}>
        {labelIdx.map((idx) => {
          const stepX = n > 1 ? 1 / (n - 1) : 0;
          const leftPct = `${idx * stepX * 100}%` as const;
          const anchor =
            idx === 0
              ? { left: 0 }
              : idx === n - 1
                ? { right: 0 }
                : { left: leftPct, transform: [{ translateX: -18 }] };
          return (
            <View key={idx} style={{ position: "absolute", ...anchor }}>
              <Text variant="caption" tone="faint">
                {labels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
