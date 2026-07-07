import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { radius as radii, useTheme } from "@/lib/theme";

/** Shimmering placeholder block used while data loads. */
export function Skeleton({
  width,
  height = 16,
  radius = radii.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius: radius,
          backgroundColor: t.border,
          opacity,
        },
        style,
      ]}
    />
  );
}
