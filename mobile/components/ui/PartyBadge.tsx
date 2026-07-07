import React from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { radius } from "@/lib/theme";
import { partyColor, partyTextColor } from "@/lib/parties";

/** Filled pill showing a party name in its official color. */
export function PartyBadge({
  party,
  size = "md",
}: {
  party: string;
  size?: "sm" | "md";
}) {
  const bg = partyColor(party);
  const fg = partyTextColor(bg);
  const pad = size === "sm" ? { h: 8, v: 3 } : { h: 10, v: 4 };
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.full,
        paddingHorizontal: pad.h,
        paddingVertical: pad.v,
        alignSelf: "flex-start",
      }}
    >
      <Text
        variant={size === "sm" ? "caption" : "subhead"}
        weight="semibold"
        color={fg}
      >
        {party}
      </Text>
    </View>
  );
}
