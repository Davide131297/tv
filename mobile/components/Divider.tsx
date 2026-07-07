import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/lib/theme";

/** Hairline separator that respects the leading inset of list rows. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: t.border,
        marginLeft: inset,
      }}
    />
  );
}
