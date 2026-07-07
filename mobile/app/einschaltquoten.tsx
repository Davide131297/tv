import React, { useState } from "react";
import { View } from "react-native";
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
import { spacing } from "@/lib/theme";
import { formatMillions, formatPercent } from "@/lib/format";

export default function TvRatingsScreen() {
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
          const politicianMax =
            data.politicianStats[0]?.total_viewers_millions ?? 1;
          const partyMax = data.partyStats[0]?.total_viewers_millions ?? 1;
          return (
            <>
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
                <StatTile
                  style={{ flex: 1 }}
                  icon="eye-outline"
                  label="Ø Zuschauer"
                  value={formatMillions(data.summary.average_viewers_millions)}
                />
                <StatTile
                  style={{ flex: 1 }}
                  icon="pie-chart-outline"
                  label="Ø Marktanteil"
                  value={formatPercent(data.summary.average_market_share)}
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
                title={
                  mode === "politiker"
                    ? "Top nach Reichweite"
                    : "Parteien nach Reichweite"
                }
                subtitle="Kumulierte Zuschauer in Mio."
              />
              <Card padded={false}>
                <View style={{ paddingHorizontal: spacing.lg }}>
                  {mode === "politiker"
                    ? data.politicianStats.slice(0, 30).map((p, i) => (
                        <View key={p.politician_name}>
                          {i > 0 ? <Divider inset={68} /> : null}
                          <RankRow
                            rank={i + 1}
                            name={p.politician_name}
                            party={p.party_name}
                            count={formatMillions(p.total_viewers_millions).replace(
                              " Mio.",
                              "",
                            )}
                            countLabel="Mio."
                            fraction={p.total_viewers_millions / politicianMax}
                          />
                        </View>
                      ))
                    : data.partyStats.slice(0, 30).map((p, i) => (
                        <View key={p.party_name}>
                          {i > 0 ? <Divider inset={68} /> : null}
                          <RankRow
                            rank={i + 1}
                            name={p.party_name}
                            party={p.party_name}
                            count={formatMillions(p.total_viewers_millions).replace(
                              " Mio.",
                              "",
                            )}
                            countLabel="Mio."
                            fraction={p.total_viewers_millions / partyMax}
                          />
                        </View>
                      ))}
                </View>
              </Card>
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}
