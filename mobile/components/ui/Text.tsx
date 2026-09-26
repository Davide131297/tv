import React from "react";
import { StyleProp, Text as RNText, TextStyle } from "react-native";
import { useTheme } from "@/lib/theme";

type Variant =
  | "largeTitle"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "subhead"
  | "caption";

type Tone = "default" | "muted" | "faint" | "accent";

interface TextProps {
  children: React.ReactNode;
  variant?: Variant;
  tone?: Tone;
  weight?: "regular" | "medium" | "semibold" | "bold";
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  color?: string;
}

const SIZES: Record<Variant, { fontSize: number; lineHeight: number }> = {
  largeTitle: { fontSize: 30, lineHeight: 36 },
  title: { fontSize: 22, lineHeight: 28 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  callout: { fontSize: 14, lineHeight: 19 },
  subhead: { fontSize: 13, lineHeight: 17 },
  caption: { fontSize: 11, lineHeight: 14 },
};

const WEIGHTS: Record<NonNullable<TextProps["weight"]>, TextStyle["fontWeight"]> =
  {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  };

/** Typography primitive with iOS-style type ramp and theme-aware tones. */
export function Text({
  children,
  variant = "body",
  tone = "default",
  weight = "regular",
  numberOfLines,
  style,
  color,
}: TextProps) {
  const t = useTheme();
  const toneColor =
    color ??
    (tone === "muted"
      ? t.textMuted
      : tone === "faint"
        ? t.textFaint
        : tone === "accent"
          ? t.accent
          : t.text);

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        SIZES[variant],
        { color: toneColor, fontWeight: WEIGHTS[weight] },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
