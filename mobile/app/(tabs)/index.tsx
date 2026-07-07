import React, { useMemo } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { AppearanceRow } from "@/components/AppearanceRow";
import { Divider } from "@/components/Divider";
import { DonutChart } from "@/components/charts/DonutChart";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { MonthlyBars } from "@/components/charts/MonthlyBars";
import {
  useSummary,
  usePartyStats,
  useActivityMonthly,
  useRecent,
} from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { spacing, useTheme } from "@/lib/theme";
import { partyColor } from "@/lib/parties";
import { formatNumber, formatDateShort, monthLabel } from "@/lib/format";
import { showLabel } from "@/lib/shows";

export default function OverviewScreen() {
  const t = useTheme();
  const router = useRouter();
  const filter = useFilter();
  const { refreshing, onRefresh } = useRefresh();

  const summary = useSummary(filter);
  const parties = usePartyStats(filter);
  const activity = useActivityMonthly(filter);
  const recent = useRecent(filter, 12);

  const donut = useMemo(() => {
    const list = parties.data ?? [];
    const top = list.slice(0, 6);
    const rest = list.slice(6).reduce((s, p) => s + p.count, 0);
    const slices = top.map((p) => ({
      label: p.party_name,
      value: p.count,
      color: partyColor(p.party_name),
    }));
    if (rest > 0)
      slices.push({ label: "Weitere", value: rest, color: t.textFaint });
    return slices;
  }, [parties.data, t.textFaint]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text variant="subhead" tone="muted" style={{ marginTop: spacing.xs }}>
        {showLabel(filter.show)}
        {filter.year !== "all" ? ` · ${filter.year}` : ""}
      </Text>

      {/* KPI grid */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
        <StatTile
          style={{ flex: 1 }}
          icon="mic"
          label="Auftritte"
          value={summary.data ? formatNumber(summary.data.total_appearances) : "–"}
        />
        <StatTile
          style={{ flex: 1 }}
          icon="tv-outline"
          label="Sendungen"
          value={summary.data ? formatNumber(summary.data.total_episodes) : "–"}
        />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
        <StatTile
          style={{ flex: 1 }}
          icon="people-outline"
          label="Politiker:innen"
          value={summary.data ? formatNumber(summary.data.unique_politicians) : "–"}
        />
        <StatTile
          style={{ flex: 1 }}
          icon="flag-outline"
          label="Parteien"
          value={summary.data ? formatNumber(summary.data.parties_represented) : "–"}
        />
      </View>

      {/* Party distribution */}
      <SectionHeader
        title="Parteien-Verteilung"
        subtitle="Anteil der Auftritte"
      />
      <Card>
        <QueryBoundary
          query={parties}
          isEmpty={(d) => d.length === 0}
          emptyTitle="Keine Parteien"
          skeleton={<Skeleton height={180} radius={90} />}
        >
          {() => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.lg,
              }}
            >
              <DonutChart
                data={donut}
                size={150}
                centerValue={
                  summary.data ? formatNumber(summary.data.total_appearances) : ""
                }
                centerLabel="Auftritte"
              />
              <View style={{ flex: 1 }}>
                <ChartLegend
                  items={donut.map((d) => ({
                    label: d.label,
                    color: d.color,
                    value: formatNumber(d.value),
                  }))}
                />
              </View>
            </View>
          )}
        </QueryBoundary>
      </Card>

      {/* Monthly activity */}
      <SectionHeader title="Aktivität pro Monat" subtitle="Auftritte im Jahresverlauf" />
      <Card>
        <QueryBoundary
          query={activity}
          isEmpty={(d) => d.every((p) => p.count === 0)}
          emptyTitle="Keine Aktivität"
          skeleton={<Skeleton height={150} />}
        >
          {(data) => (
            <MonthlyBars
              data={data.map((p) => ({
                label: monthLabel(p.month),
                value: p.count,
              }))}
            />
          )}
        </QueryBoundary>
      </Card>

      {/* Einschaltquoten entry */}
      <View style={{ marginTop: spacing.xl }}>
        <Card onPress={() => router.push("/einschaltquoten")}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: t.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="stats-chart" size={20} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline" weight="semibold">
                Einschaltquoten
              </Text>
              <Text variant="subhead" tone="muted">
                Zuschauer & Marktanteile
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textFaint} />
          </View>
        </Card>
      </View>

      {/* Recent appearances */}
      <SectionHeader title="Letzte Auftritte" subtitle="Neueste erfasste Gäste" />
      <Card padded={false}>
        <QueryBoundary
          query={recent}
          isEmpty={(d) => d.length === 0}
          emptyTitle="Keine Auftritte"
          skeleton={
            <View style={{ padding: spacing.lg, gap: spacing.md }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={44} />
              ))}
            </View>
          }
        >
          {(data) => (
            <View style={{ paddingHorizontal: spacing.lg }}>
              {data.map((r, i) => (
                <View key={`${r.politician_name}-${r.episode_date}-${i}`}>
                  {i > 0 ? <Divider inset={52} /> : null}
                  <AppearanceRow
                    name={r.politician_name}
                    party={r.party_name}
                    meta={`${r.show_name} · ${formatDateShort(r.episode_date)}`}
                  />
                </View>
              ))}
            </View>
          )}
        </QueryBoundary>
      </Card>
    </Screen>
  );
}
