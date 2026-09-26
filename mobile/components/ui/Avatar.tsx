import React from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { partyColor, partyTextColor, initials } from "@/lib/parties";
import { useTheme } from "@/lib/theme";

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
  const t = useTheme();
  const bg = partyColor(party, t.dark);
  const fg = partyTextColor(bg);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
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
