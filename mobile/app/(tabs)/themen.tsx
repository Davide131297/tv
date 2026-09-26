import React from "react";
import { View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { usePoliticalAreas } from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { spacing, useTheme } from "@/lib/theme";
import { formatNumber } from "@/lib/format";
import { showLabel } from "@/lib/shows";

// A pleasant sequential accent ramp for topic bars (brand sky -> indigo).
const TOPIC_COLORS = [
  "#38BDF8",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#0EA5E9",
];

export default function TopicsScreen() {
  const t = useTheme();
  const filter = useFilter();
  const { refreshing, onRefresh } = useRefresh();
  const areas = usePoliticalAreas(filter);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text variant="subhead" tone="muted" style={{ marginTop: spacing.xs }}>
        {showLabel(filter.show)}
        {filter.year !== "all" ? ` · ${filter.year}` : ""}
      </Text>

      <SectionHeader
        title="Diskutierte Themen"
        subtitle="Häufigkeit politischer Themenfelder"
      />
      <Card>
        <QueryBoundary
          query={areas}
          isEmpty={(d) => d.length === 0}
          emptyTitle="Keine Themen"
          emptyMessage="Für diese Auswahl liegen noch keine klassifizierten Themen vor."
          skeleton={
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={38} />
              ))}
            </View>
          }
        >
          {(data) => {
            const max = data[0]?.count ?? 1;
            return (
              <View style={{ gap: spacing.lg }}>
                {data.map((area, i) => (
                  <View key={area.area_id}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        gap: spacing.md,
                      }}
                    >
                      <Text
                        variant="body"
                        weight="medium"
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        {area.area_label}
                      </Text>
                      <Text variant="body" weight="semibold" tone="muted">
                        {formatNumber(area.count)}
                      </Text>
                    </View>
                    <ProgressBar
                      fraction={area.count / max}
                      color={TOPIC_COLORS[i % TOPIC_COLORS.length]}
                      height={7}
                    />
                  </View>
                ))}
              </View>
            );
          }}
        </QueryBoundary>
      </Card>

      <Text
        variant="caption"
        tone="faint"
        style={{ marginTop: spacing.lg, textAlign: "center" }}
      >
        Themen werden per KI aus den Sendungsbeschreibungen klassifiziert.
      </Text>
    </Screen>
  );
}
