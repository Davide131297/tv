import React from "react";
import { View } from "react-native";
import { Text } from "./ui/Text";
import { Avatar } from "./ui/Avatar";
import { PartyBadge } from "./ui/PartyBadge";
import { spacing } from "@/lib/theme";

/** Reusable appearance line: avatar, name, meta line and a party badge. */
export function AppearanceRow({
  name,
  party,
  meta,
  showAvatar = true,
}: {
  name: string;
  party?: string;
  meta?: string;
  showAvatar?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.md,
        gap: spacing.md,
      }}
    >
      {showAvatar ? <Avatar name={name} party={party} size={40} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>
            {meta}
          </Text>
        ) : null}
      </View>
      {party ? <PartyBadge party={party} size="sm" /> : null}
    </View>
  );
}
