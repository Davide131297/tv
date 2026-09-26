import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { radius, spacing, useTheme } from "@/lib/theme";
import { tapLight } from "@/lib/haptics";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/**
 * Surface container used everywhere. When `onPress` is supplied it becomes an
 * interactive card with a native press state (Android ripple / iOS opacity) and
 * a light haptic tap.
 */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  accessibilityLabel,
}: CardProps) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
    padding: padded ? spacing.lg : 0,
  };

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      android_ripple={{ color: t.cardPressed }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        base,
        pressed ? { backgroundColor: t.cardPressed } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
