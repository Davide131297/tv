import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./ui/Card";
import { Text } from "./ui/Text";
import { Avatar } from "./ui/Avatar";
import { spacing, useTheme } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import type { EpisodeData } from "@/lib/types";

/** Episode summary card: date, guest count and a stack of guest avatars. */
export function EpisodeCard({
  episode,
  onPress,
}: {
  episode: EpisodeData;
  onPress?: () => void;
}) {
  const t = useTheme();
  const guests = episode.politicians ?? [];
  const shown = guests.slice(0, 5);
  const extra = guests.length - shown.length;

  return (
    <Card onPress={onPress}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text variant="headline" weight="semibold">
          {formatDate(episode.episode_date)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="people" size={15} color={t.textMuted} />
          <Text variant="subhead" tone="muted" weight="medium">
            {episode.politician_count}
          </Text>
        </View>
      </View>

      {shown.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: spacing.md,
          }}
        >
          {shown.map((g, i) => (
            <View
              key={`${g.name}-${i}`}
              style={{ marginLeft: i === 0 ? 0 : -10 }}
            >
              <View
                style={{
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: t.card,
                }}
              >
                <Avatar name={g.name} party={g.party_name} size={34} />
              </View>
            </View>
          ))}
          {extra > 0 ? (
            <Text variant="subhead" tone="muted" style={{ marginLeft: 8 }}>
              +{extra}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: spacing.sm }}>
        {guests.map((g) => g.name).join(" · ") || "Keine Gäste erfasst"}
      </Text>
    </Card>
  );
}
