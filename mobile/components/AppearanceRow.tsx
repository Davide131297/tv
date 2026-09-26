import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { Avatar } from "./ui/Avatar";
import { PartyBadge } from "./ui/PartyBadge";
import { spacing, useTheme } from "@/lib/theme";
import { tapLight } from "@/lib/haptics";

/** Reusable appearance line: avatar, name, meta line and a party badge. */
export function AppearanceRow({
  name,
  party,
  meta,
  showAvatar = true,
  onPress,
}: {
  name: string;
  party?: string;
  meta?: string;
  showAvatar?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const body = (
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
      accessibilityRole="button"
      accessibilityLabel={[name, party, meta].filter(Boolean).join(", ")}
    >
      {body}
    </Pressable>
  );
}
