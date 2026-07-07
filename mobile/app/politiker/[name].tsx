import React from "react";
import { View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { PartyBadge } from "@/components/ui/PartyBadge";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Divider } from "@/components/Divider";
import { spacing, useTheme } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import { showAccent } from "@/lib/shows";

export default function PoliticianDetail() {
  const t = useTheme();
  const params = useLocalSearchParams<{
    name: string;
    party?: string;
    appearances?: string;
    shows?: string;
    first?: string;
    latest?: string;
    showNames?: string;
  }>();

  const name = params.name ?? "Unbekannt";
  const party = params.party;
  const appearances = params.appearances ?? "0";
  const showsCount = params.shows ?? "0";
  let showNames: string[] = [];
  try {
    showNames = params.showNames ? JSON.parse(params.showNames) : [];
  } catch {
    showNames = [];
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />

      {/* Hero */}
      <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
        <Avatar name={name} party={party} size={88} />
        <Text
          variant="title"
          weight="bold"
          style={{ marginTop: spacing.md, textAlign: "center" }}
        >
          {name}
        </Text>
        {party ? (
          <View style={{ marginTop: spacing.sm }}>
            <PartyBadge party={party} />
          </View>
        ) : null}
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <StatTile style={{ flex: 1 }} icon="mic" label="Auftritte" value={appearances} />
        <StatTile
          style={{ flex: 1 }}
          icon="tv-outline"
          label={showsCount === "1" ? "Sendung" : "Sendungen"}
          value={showsCount}
        />
      </View>

      {(params.first || params.latest) && (
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text variant="caption" tone="muted">
                Erster Auftritt
              </Text>
              <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                {params.first ? formatDate(params.first) : "–"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="caption" tone="muted">
                Letzter Auftritt
              </Text>
              <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                {params.latest ? formatDate(params.latest) : "–"}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Shows */}
      {showNames.length > 0 ? (
        <>
          <SectionHeader title="Gesehen in" subtitle="Sendungen mit Auftritten" />
          <Card padded={false}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              {showNames.map((s, i) => (
                <View key={s}>
                  {i > 0 ? <Divider inset={34} /> : null}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: spacing.md,
                      gap: spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: showAccent(s),
                      }}
                    />
                    <Text variant="body" style={{ flex: 1 }}>
                      {s}
                    </Text>
                    <Ionicons name="tv-outline" size={16} color={t.textFaint} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
