import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LineChart, type LineSeries } from "@/components/charts/LineChart";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { usePartyStats, usePartyTimeline } from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { spacing } from "@/lib/theme";
import { partyColor } from "@/lib/parties";
import { formatNumber, timelineMonthLabel } from "@/lib/format";
import type { PartyStats } from "@/lib/types";

// Merge CDU + CSU into a single "Union" bucket when union mode is on.
function applyUnion(list: PartyStats[], union: boolean): PartyStats[] {
  if (!union) return list;
  let unionCount = 0;
  const rest: PartyStats[] = [];
  for (const p of list) {
    if (p.party_name === "CDU" || p.party_name === "CSU") unionCount += p.count;
    else rest.push(p);
  }
  if (unionCount > 0) rest.push({ party_name: "Union", count: unionCount });
  return rest.sort((a, b) => b.count - a.count);
}

export default function PartiesScreen() {
  const filter = useFilter();
  const { refreshing, onRefresh } = useRefresh();
  const [union, setUnion] = useState(false);

  const stats = usePartyStats(filter);
  const timeline = usePartyTimeline(filter);

  const ranked = useMemo(
    () => applyUnion(stats.data ?? [], union),
    [stats.data, union],
  );
  const maxCount = ranked[0]?.count ?? 1;

  const series: LineSeries[] = useMemo(() => {
    const rows = timeline.data?.data ?? [];
    if (rows.length === 0) return [];
    // rank parties by total across the timeline
    const totals = new Map<string, number>();
    for (const row of rows) {
      for (const [k, v] of Object.entries(row)) {
        if (k === "month") continue;
        const name =
          union && (k === "CDU" || k === "CSU") ? "Union" : k;
        totals.set(name, (totals.get(name) ?? 0) + (v as number));
      }
    }
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return top.map((name) => ({
      key: name,
      color: partyColor(name),
      values: rows.map((row) => {
        if (name === "Union")
          return (
            ((row["CDU"] as number) ?? 0) + ((row["CSU"] as number) ?? 0)
          );
        return (row[name] as number) ?? 0;
      }),
    }));
  }, [timeline.data, union]);

  const timelineLabels = useMemo(
    () => (timeline.data?.data ?? []).map((r) => timelineMonthLabel(r.month)),
    [timeline.data],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ marginTop: spacing.md }}>
        <SegmentedControl
          value={union ? "union" : "single"}
          onChange={(v) => setUnion(v === "union")}
          options={[
            { value: "single", label: "Einzeln" },
            { value: "union", label: "CDU/CSU als Union" },
          ]}
        />
      </View>

      <SectionHeader
        title="Auftritte nach Partei"
        subtitle="Gesamtzahl je Partei"
      />
      <Card padded>
        <QueryBoundary
          query={stats}
          isEmpty={() => ranked.length === 0}
          emptyTitle="Keine Parteidaten"
          skeleton={
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={38} />
              ))}
            </View>
          }
        >
          {() => (
            <View style={{ gap: spacing.lg }}>
              {ranked.map((p) => (
                <View key={p.party_name}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.sm,
                        flex: 1,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          backgroundColor: partyColor(p.party_name),
                        }}
                      />
                      <Text variant="body" weight="medium" numberOfLines={1}>
                        {p.party_name}
                      </Text>
                    </View>
                    <Text variant="body" weight="semibold">
                      {formatNumber(p.count)}
                    </Text>
                  </View>
                  <ProgressBar
                    fraction={p.count / maxCount}
                    color={partyColor(p.party_name)}
                    height={7}
                  />
                </View>
              ))}
            </View>
          )}
        </QueryBoundary>
      </Card>

      <SectionHeader
        title="Zeitverlauf"
        subtitle="Auftritte der Top-Parteien pro Monat"
      />
      <Card>
        <QueryBoundary
          query={timeline}
          isEmpty={() => series.length === 0}
          emptyTitle="Kein Zeitverlauf"
          skeleton={<Skeleton height={190} />}
        >
          {() => (
            <>
              <LineChart series={series} labels={timelineLabels} />
              <View style={{ marginTop: spacing.lg }}>
                <ChartLegend
                  items={series.map((s) => ({ label: s.key, color: s.color }))}
                />
              </View>
            </>
          )}
        </QueryBoundary>
      </Card>
    </Screen>
  );
}
