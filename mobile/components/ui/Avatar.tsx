import React from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { partyColor, partyTextColor, initials } from "@/lib/parties";

/** Circular initials avatar tinted with the person's party color. */
export function Avatar({
  name,
  party,
  size = 42,
}: {
  name: string;
  party?: string;
  size?: number;
}) {
  const bg = partyColor(party);
  const fg = partyTextColor(bg);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text weight="bold" color={fg} style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
