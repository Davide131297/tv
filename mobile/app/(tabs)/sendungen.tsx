import React, { useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { EpisodeCard } from "@/components/EpisodeCard";
import { useEpisodes } from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { radius, spacing, useTheme } from "@/lib/theme";
import { SHOWS_WITHOUT_ALL } from "@/lib/shows";
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

  const episodes = useEpisodes(show, 40);

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
        {SHOWS_WITHOUT_ALL.map((s) => {
          const active = s.value === show;
          return (
            <Pressable
              key={s.value}
              onPress={() => {
                tapLight();
                setShow(s.value);
              }}
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
        episodes.isLoading ? (
          <View style={{ gap: spacing.md }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={110} radius={16} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="tv-outline"
            title="Keine Sendungen"
            message="Für diese Show liegen noch keine Episoden vor."
          />
        )
      }
    />
  );
}
