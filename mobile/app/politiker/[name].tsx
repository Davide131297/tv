import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { PartyBadge } from "@/components/ui/PartyBadge";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Divider } from "@/components/Divider";
import { usePoliticianAppearances } from "@/hooks/queries";
import { useRefresh } from "@/hooks/useRefresh";
import { spacing, useTheme } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import { showAccent, showLabel } from "@/lib/shows";
import { tapLight } from "@/lib/haptics";
import { isHttpUrl, openExternal } from "@/lib/links";
import type { PoliticianDetailAppearance } from "@/lib/types";

function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function AppearanceItem({ item }: { item: PoliticianDetailAppearance }) {
  const t = useTheme();
  const url = isHttpUrl(item.episode_url) ? item.episode_url : null;

  const body = (
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
          backgroundColor: showAccent(item.show_name),
        }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {showLabel(item.show_name)}
        </Text>
        <Text variant="subhead" tone="muted">
          {formatDate(item.episode_date)}
        </Text>
      </View>
      {url ? <Ionicons name="play-circle-outline" size={20} color={t.accent} /> : null}
    </View>
  );

  if (!url) return body;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        openExternal(url);
      }}
      android_ripple={{ color: t.cardPressed }}
      accessibilityRole="link"
      accessibilityLabel={`${showLabel(item.show_name)} vom ${formatDate(item.episode_date)} in der Mediathek ansehen`}
    >
      {body}
    </Pressable>
  );
}

export default function PoliticianDetail() {
  const t = useTheme();
  const { refreshing, onRefresh } = useRefresh();
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
  const hasRankingStats = params.appearances !== undefined;
  const showNames = useMemo(() => parseStringArray(params.showNames), [params.showNames]);

  const appearances = usePoliticianAppearances(params.name);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
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

      {/* Stats (only available when opened from the rankings) */}
      {hasRankingStats ? (
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <StatTile
            style={{ flex: 1 }}
            icon="mic"
            label="Auftritte"
            value={params.appearances ?? "0"}
          />
          <StatTile
            style={{ flex: 1 }}
            icon="tv-outline"
            label={params.shows === "1" ? "Sendung" : "Sendungen"}
            value={params.shows ?? "0"}
          />
        </View>
      ) : null}

      {params.first || params.latest ? (
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
      ) : null}

      {/* Shows */}
      {showNames.length > 0 ? (
        <>
          <SectionHeader title="Gesehen in" subtitle="Sendungen mit Auftritten im Filterzeitraum" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {showNames.map((s) => (
              <View
                key={s}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 999,
                  backgroundColor: t.card,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: showAccent(s),
                  }}
                />
                <Text variant="callout">{s}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Latest appearances incl. Mediathek links */}
      <SectionHeader
        title="Letzte Auftritte"
        subtitle="Bis zu 20 Sendungen, neueste zuerst"
      />
      <Card padded={false}>
        <QueryBoundary
          query={appearances}
          isEmpty={(d) => d.length === 0}
          emptyTitle="Keine Auftritte gefunden"
          skeleton={
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={40} />
              ))}
            </View>
          }
        >
          {(data) => (
            <View style={{ paddingHorizontal: spacing.lg }}>
              {data.map((item, i) => (
                <View key={item.id ?? `${item.show_name}-${item.episode_date}`}>
                  {i > 0 ? <Divider inset={22} /> : null}
                  <AppearanceItem item={item} />
                </View>
              ))}
            </View>
          )}
        </QueryBoundary>
      </Card>
    </Screen>
  );
}
