import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, errorMessage } from "@/components/ui/QueryBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { EpisodeCard } from "@/components/EpisodeCard";
import { useEpisodes } from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { radius, spacing, useTheme } from "@/lib/theme";
import { ALL_SHOWS, SHOWS_WITHOUT_ALL, showLabel } from "@/lib/shows";
import { tapLight } from "@/lib/haptics";
import type { EpisodeData } from "@/lib/types";

export default function ShowsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filter = useFilter();
  const { refreshing, onRefresh } = useRefresh();

  const initial =
    filter.show !== "all" ? filter.show : SHOWS_WITHOUT_ALL[0].value;
  const [show, setShow] = useState(initial);

  // Follow the global filter when a concrete show is selected there
  // (state adjustment during render, see react.dev "You Might Not Need an Effect").
  const [syncedFilterShow, setSyncedFilterShow] = useState(filter.show);
  if (syncedFilterShow !== filter.show) {
    setSyncedFilterShow(filter.show);
    if (filter.show !== "all") setShow(filter.show);
  }

  const episodes = useEpisodes(show, filter.year);

  const openEpisode = (ep: EpisodeData) => {
    router.push({
      pathname: "/sendung/[date]",
      params: {
        date: ep.episode_date,
        show,
        url: ep.episode_url ?? "",
        politicians: JSON.stringify(ep.politicians ?? []),
      },
    });
  };

  const chips = (
    <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
      >
        {ALL_SHOWS.map((s) => {
          const active = s.value === show;
          return (
            <Pressable
              key={s.value}
              onPress={() => {
                tapLight();
                setShow(s.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={s.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                backgroundColor: active ? t.accentSoft : t.card,
                borderWidth: 1,
                borderColor: active ? t.accent : t.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: s.accent,
                }}
              />
              <Text
                variant="callout"
                weight={active ? "semibold" : "regular"}
                color={active ? t.accent : t.text}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="subhead" tone="muted" style={{ marginTop: spacing.md }}>
        {showLabel(show)}
        {filter.year !== "all" ? ` · ${filter.year}` : " · Alle Jahre"}
        {episodes.data ? ` · ${episodes.data.length} Sendungen` : ""}
      </Text>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      data={episodes.data ?? []}
      keyExtractor={(item) => item.episode_date}
      ListHeaderComponent={chips}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      renderItem={({ item }) => (
        <EpisodeCard episode={item} onPress={() => openEpisode(item)} />
      )}
      ListEmptyComponent={
        episodes.isPending ? (
          <View style={{ gap: spacing.md }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={110} radius={16} />
            ))}
          </View>
        ) : episodes.isError ? (
          <ErrorState
            message={errorMessage(episodes.error)}
            retrying={episodes.isFetching}
            onRetry={() => {
              episodes.refetch();
            }}
          />
        ) : (
          <EmptyState
            icon="tv-outline"
            title="Keine Sendungen"
            message={
              filter.year !== "all"
                ? `Für ${showLabel(show)} liegen ${filter.year} keine Episoden vor.`
                : "Für diese Show liegen noch keine Episoden vor."
            }
          />
        )
      }
    />
  );
}
