import React from "react";
import { Linking, Pressable, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AppearanceRow } from "@/components/AppearanceRow";
import { Divider } from "@/components/Divider";
import { radius, spacing, useTheme } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import { showAccent } from "@/lib/shows";
import { tapMedium } from "@/lib/haptics";
import type { PoliticianInEpisode } from "@/lib/types";

export default function EpisodeDetail() {
  const t = useTheme();
  const params = useLocalSearchParams<{
    date: string;
    show?: string;
    url?: string;
    politicians?: string;
  }>();

  const show = params.show ?? "Sendung";
  const date = params.date ?? "";
  const url = params.url && params.url.length > 0 ? params.url : null;

  let guests: PoliticianInEpisode[] = [];
  try {
    guests = params.politicians ? JSON.parse(params.politicians) : [];
  } catch {
    guests = [];
  }

  const openUrl = () => {
    if (!url) return;
    tapMedium();
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: show }} />

      <Card style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: showAccent(show),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="tv" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline" weight="bold">
              {show}
            </Text>
            <Text variant="subhead" tone="muted">
              {date ? formatDate(date) : ""} · {guests.length}{" "}
              {guests.length === 1 ? "Gast" : "Gäste"}
            </Text>
          </View>
        </View>

        {url ? (
          <Pressable
            onPress={openUrl}
            android_ripple={{ color: t.cardPressed }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radius.md,
              backgroundColor: t.accent,
            }}
          >
            <Ionicons name="play-circle" size={18} color="#fff" />
            <Text variant="body" weight="semibold" color="#fff">
              In der Mediathek ansehen
            </Text>
          </Pressable>
        ) : null}
      </Card>

      <SectionHeader title="Gäste" subtitle="Politiker:innen in dieser Sendung" />
      <Card padded={false}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {guests.length === 0 ? (
            <Text
              variant="body"
              tone="muted"
              style={{ paddingVertical: spacing.lg }}
            >
              Keine Gäste erfasst.
            </Text>
          ) : (
            guests.map((g, i) => (
              <View key={`${g.name}-${i}`}>
                {i > 0 ? <Divider inset={52} /> : null}
                <AppearanceRow name={g.name} party={g.party_name} />
              </View>
            ))
          )}
        </View>
      </Card>
    </Screen>
  );
}
