import React, { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { RankRow } from "@/components/RankRow";
import { Divider } from "@/components/Divider";
import { useTvRatings } from "@/hooks/queries";
import { useRefresh } from "@/hooks/useRefresh";
import { spacing, useTheme } from "@/lib/theme";
import { formatDate, formatMillions, formatNumber, formatPercent } from "@/lib/format";
import { tapLight } from "@/lib/haptics";
import type { TvRatingOverview } from "@/lib/types";

const RATINGS_PREVIEW_LIMIT = 20;
const RANKING_LIMIT = 15;

const TV_RATINGS_SOURCES = [
  {
    label: "WDR / ARD-Einschaltquoten",
    url: "https://www1.wdr.de/unternehmen/der-wdr/profil/quoten-tv-ard-100.html",
  },
  {
    label: "ZDF Teletext, Seite 448",
    url: "https://teletext.zdf.de/teletext/zdf/seiten/448.html",
  },
] as const;

function formatPeople(rating: TvRatingOverview) {
  if (rating.politicians.length === 0) return "Keine Politiker hinterlegt";
  return rating.politicians.map((p) => `${p.name} (${p.party_name})`).join(", ");
}

function RatingRow({ rating }: { rating: TvRatingOverview }) {
  const t = useTheme();
  const hasUrl = !!rating.episode_url;

  const content = (
    <View style={{ paddingVertical: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {rating.show_name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Text variant="subhead" tone="muted">
              {formatDate(rating.episode_date)}
            </Text>
            <Text variant="subhead" tone="faint">
              ·
            </Text>
            <Text variant="subhead" tone="muted">
              {formatPercent(rating.market_share)} Marktanteil
            </Text>
          </View>
        </View>
        <Text variant="body" weight="bold">
          {formatMillions(rating.viewers_millions)}
        </Text>
        {hasUrl ? <Ionicons name="chevron-forward" size={16} color={t.textFaint} /> : null}
      </View>
      <Text variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: 6 }}>
        {formatPeople(rating)}
      </Text>
    </View>
  );

  if (!hasUrl) return content;

  return (
    <Pressable
      onPress={() => {
        tapLight();
        Linking.openURL(rating.episode_url!).catch(() => {});
      }}
      android_ripple={{ color: t.cardPressed }}
    >
      {content}
    </Pressable>
  );
}

function Highlight({
  icon,
  accent,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Ionicons name={icon} size={16} color={accent} />
        <Text variant="subhead" weight="semibold" color={accent}>
          {title}
        </Text>
      </View>
      <Text variant="body" style={{ marginTop: spacing.sm }}>
        {body}
      </Text>
    </Card>
  );
}

export default function TvRatingsScreen() {
  const t = useTheme();
  const { refreshing, onRefresh } = useRefresh();
  const ratings = useTvRatings();
  const [mode, setMode] = useState<"politiker" | "parteien">("politiker");

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <QueryBoundary
        query={ratings}
        isEmpty={(d) => d.summary.total_ratings === 0}
        emptyTitle="Keine Quoten"
        emptyMessage="Es liegen noch keine Einschaltquoten vor."
      >
        {(data) => {
          const politicianMax = data.politicianStats[0]?.average_viewers_millions ?? 1;
          const partyMax = data.partyStats[0]?.average_viewers_millions ?? 1;
          const partyByTotal = [...data.partyStats].sort(
            (a, b) => b.total_viewers_millions - a.total_viewers_millions,
          );
          const partyByTotalMax = partyByTotal[0]?.total_viewers_millions ?? 1;
          const topPolitician = data.politicianStats[0] ?? null;
          const topParty = data.partyStats[0] ?? null;

          return (
            <>
              <Text variant="subhead" tone="muted" style={{ marginTop: spacing.md }}>
                Gespeicherte TV-Quoten mit Zuordnung zu Episoden, Politikern und
                Parteien. Die Analysen basieren auf kumulierten Zuschauerzahlen der
                erfassten Auftritte.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing.md,
                  marginTop: spacing.lg,
                }}
              >
                <StatTile
                  style={{ flexBasis: "47%", flexGrow: 1 }}
                  icon="albums-outline"
                  label="Gespeicherte Quoten"
                  value={formatNumber(data.summary.total_ratings)}
                />
                <StatTile
                  style={{ flexBasis: "47%", flexGrow: 1 }}
                  icon="eye-outline"
                  label="Zuschauer kumuliert"
                  value={formatMillions(data.summary.total_viewers_millions)}
                />
                <StatTile
                  style={{ flexBasis: "47%", flexGrow: 1 }}
                  icon="pie-chart-outline"
                  label="Marktanteil im Schnitt"
                  value={formatPercent(data.summary.average_market_share)}
                />
                <StatTile
                  style={{ flexBasis: "47%", flexGrow: 1 }}
                  icon="stats-chart-outline"
                  label="Zuschauer pro Sendung"
                  value={formatMillions(data.summary.average_viewers_millions)}
                />
              </View>

              <SectionHeader
                title="Alle gespeicherten Quoten"
                subtitle={`${data.ratings.length} Sendungen, neueste zuerst`}
              />
              <Card padded={false}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                  {data.ratings.slice(0, RATINGS_PREVIEW_LIMIT).map((rating, i) => (
                    <View key={`${rating.show_name}-${rating.episode_date}`}>
                      {i > 0 ? <Divider inset={0} /> : null}
                      <RatingRow rating={rating} />
                    </View>
                  ))}
                </View>
                {data.ratings.length > RATINGS_PREVIEW_LIMIT ? (
                  <View
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: t.border,
                    }}
                  >
                    <Text variant="subhead" tone="muted">
                      und {data.ratings.length - RATINGS_PREVIEW_LIMIT} weitere
                    </Text>
                  </View>
                ) : null}
              </Card>

              <SectionHeader title="Spitzenreiter" />
              <View style={{ gap: spacing.md }}>
                <Highlight
                  icon="trophy-outline"
                  accent={t.success}
                  title="Politiker:in mit höchster Ø-Reichweite"
                  body={
                    topPolitician
                      ? `${topPolitician.politician_name} · ${topPolitician.party_name} · ${formatMillions(topPolitician.average_viewers_millions)} im Schnitt bei ${topPolitician.appearances} bewerteten Auftritten`
                      : "Keine Ratings vorhanden."
                  }
                />
                <Highlight
                  icon="podium-outline"
                  accent={t.accent}
                  title="Partei mit höchster Ø-Reichweite"
                  body={
                    topParty
                      ? `${topParty.party_name} · ${formatMillions(topParty.average_viewers_millions)} im Schnitt bei ${topParty.rated_episodes} bewerteten Episoden`
                      : "Keine Ratings vorhanden."
                  }
                />
              </View>

              <View style={{ marginTop: spacing.xl }}>
                <SegmentedControl
                  value={mode}
                  onChange={(v) => setMode(v as "politiker" | "parteien")}
                  options={[
                    { value: "politiker", label: "Politiker:innen" },
                    { value: "parteien", label: "Parteien" },
                  ]}
                />
              </View>

              <SectionHeader
                title={mode === "politiker" ? "Politiker-Ranking" : "Partei-Ranking"}
                subtitle={
                  mode === "politiker"
                    ? "Sortiert nach Ø Zuschauern pro Auftritt."
                    : "Sortiert nach Ø Zuschauern pro Episode. Parteien zählen pro Episode nur einmal."
                }
              />
              <Card padded={false}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                  {mode === "politiker"
                    ? data.politicianStats.slice(0, RANKING_LIMIT).map((p, i) => (
                        <View key={p.politician_name}>
                          {i > 0 ? <Divider inset={68} /> : null}
                          <RankRow
                            rank={i + 1}
                            name={p.politician_name}
                            party={p.party_name}
                            meta={`${p.appearances} Auftritte · ${formatMillions(p.total_viewers_millions)} gesamt · Ø ${formatPercent(p.average_market_share)}`}
                            count={formatMillions(p.average_viewers_millions).replace(
                              " Mio.",
                              "",
                            )}
                            countLabel="Ø Mio."
                            fraction={p.average_viewers_millions / politicianMax}
                          />
                        </View>
                      ))
                    : data.partyStats.slice(0, RANKING_LIMIT).map((p, i) => (
                        <View key={p.party_name}>
                          {i > 0 ? <Divider inset={68} /> : null}
                          <RankRow
                            rank={i + 1}
                            name={p.party_name}
                            party={p.party_name}
                            meta={`${p.rated_episodes} Episoden · ${formatMillions(p.total_viewers_millions)} gesamt · Ø ${formatPercent(p.average_market_share)}`}
                            count={formatMillions(p.average_viewers_millions).replace(
                              " Mio.",
                              "",
                            )}
                            countLabel="Ø Mio."
                            fraction={p.average_viewers_millions / partyMax}
                          />
                        </View>
                      ))}
                </View>
              </Card>

              <SectionHeader
                title="Parteien nach Gesamt-Reichweite"
                subtitle="Sortiert nach kumulierten Zuschauerzahlen statt Durchschnitt."
              />
              <Card padded={false}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                  {partyByTotal.slice(0, RANKING_LIMIT).map((p, i) => (
                    <View key={`${p.party_name}-total`}>
                      {i > 0 ? <Divider inset={68} /> : null}
                      <RankRow
                        rank={i + 1}
                        name={p.party_name}
                        party={p.party_name}
                        meta={`${p.rated_episodes} Episoden · zuletzt ${formatDate(p.latest_episode)}`}
                        count={formatMillions(p.total_viewers_millions).replace(
                          " Mio.",
                          "",
                        )}
                        countLabel="Mio."
                        fraction={p.total_viewers_millions / partyByTotalMax}
                      />
                    </View>
                  ))}
                </View>
              </Card>

              <View
                style={{
                  marginTop: spacing.xl,
                  paddingTop: spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: t.border,
                }}
              >
                <Text variant="subhead" tone="muted">
                  Einschaltquoten-Daten sind in diesem Dashboard erst ab dem
                  23.02.2026 vorhanden.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginTop: spacing.xs,
                    gap: 4,
                  }}
                >
                  <Text variant="subhead" tone="muted">
                    Quellen:
                  </Text>
                  {TV_RATINGS_SOURCES.map((source, index) => (
                    <Pressable
                      key={source.url}
                      onPress={() => Linking.openURL(source.url).catch(() => {})}
                    >
                      <Text variant="subhead" tone="accent">
                        {source.label}
                        {index < TV_RATINGS_SOURCES.length - 1 ? "," : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
