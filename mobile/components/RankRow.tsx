import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { Avatar } from "./ui/Avatar";
import { ProgressBar } from "./ui/ProgressBar";
import { spacing, useTheme } from "@/lib/theme";
import { partyColor } from "@/lib/parties";
import { tapLight } from "@/lib/haptics";

/** Ranking row: position, avatar, name + party, proportional bar and count. */
export function RankRow({
  rank,
  name,
  party,
  meta,
  count,
  countLabel,
  fraction,
  onPress,
}: {
  rank: number;
  name: string;
  party?: string;
  meta?: string;
  count: string;
  countLabel?: string;
  fraction: number;
  onPress?: () => void;
}) {
  const t = useTheme();
  const color = partyColor(party);

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        gap: spacing.md,
      }}
    >
      <Text
        variant="callout"
        weight="bold"
        tone={rank <= 3 ? "accent" : "faint"}
        style={{ width: 22, textAlign: "center" }}
      >
        {rank}
      </Text>
      <Avatar name={name} party={party} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {meta}
          </Text>
        ) : null}
        <View style={{ marginTop: 5 }}>
          <ProgressBar fraction={fraction} color={color} />
        </View>
      </View>
      <View style={{ alignItems: "flex-end", minWidth: 44 }}>
        <Text variant="body" weight="bold">
          {count}
        </Text>
        {countLabel ? (
          <Text variant="caption" tone="faint">
            {countLabel}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={t.textFaint} />
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      android_ripple={{ color: t.cardPressed }}
    >
      {body}
    </Pressable>
  );
}
