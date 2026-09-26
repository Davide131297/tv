import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { radius, spacing, useTheme } from "@/lib/theme";
import { useFilter } from "@/hooks/useFilter";
import { showLabel } from "@/lib/shows";
import { tapLight } from "@/lib/haptics";

/** Header pill that opens the global show/year filter modal. */
export function FilterButton() {
  const t = useTheme();
  const router = useRouter();
  const { show, year } = useFilter();
  const active = show !== "all" || year !== "all";

  const summary =
    show === "all" && year === "all"
      ? "Filter"
      : [show !== "all" ? showLabel(show) : null, year !== "all" ? year : null]
          .filter(Boolean)
          .join(" · ");

  return (
    <Pressable
      onPress={() => {
        tapLight();
        router.push("/filter");
      }}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: active ? t.accentSoft : "transparent",
      }}
    >
      <Ionicons
        name="options-outline"
        size={17}
        color={active ? t.accent : t.text}
      />
      <Text
        variant="callout"
        weight="medium"
        color={active ? t.accent : t.text}
        numberOfLines={1}
        style={{ maxWidth: 150 }}
      >
        {summary}
      </Text>
    </Pressable>
  );
}
