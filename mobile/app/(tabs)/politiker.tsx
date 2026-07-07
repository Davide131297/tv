import React, { useMemo, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RankRow } from "@/components/RankRow";
import { Divider } from "@/components/Divider";
import { useRankings } from "@/hooks/queries";
import { useFilter } from "@/hooks/useFilter";
import { useRefresh } from "@/hooks/useRefresh";
import { radius, spacing, useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PoliticianRanking } from "@/lib/types";

export default function PoliticiansScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const filter = useFilter();
  const { refreshing, onRefresh } = useRefresh();
  const [query, setQuery] = useState("");

  const rankings = useRankings(filter, 100);

  const filtered = useMemo(() => {
    const list = rankings.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.politician_name.toLowerCase().includes(q));
  }, [rankings.data, query]);

  const max = rankings.data?.[0]?.total_appearances ?? 1;

  const openDetail = (p: PoliticianRanking) => {
    router.push({
      pathname: "/politiker/[name]",
      params: {
        name: p.politician_name,
        party: p.party_name,
        appearances: String(p.total_appearances),
        shows: String(p.shows_appeared_on),
        first: p.first_appearance,
        latest: p.latest_appearance,
        showNames: JSON.stringify(p.show_names ?? []),
      },
    });
  };

  const header = (
    <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: t.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: spacing.md,
          height: 44,
        }}
      >
        <Ionicons name="search" size={18} color={t.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Politiker:in suchen"
          placeholderTextColor={t.textFaint}
          style={{ flex: 1, color: t.text, fontSize: 15 }}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      {rankings.data ? (
        <Text variant="subhead" tone="muted" style={{ marginTop: spacing.md }}>
          {filtered.length}{" "}
          {filtered.length === 1 ? "Person" : "Personen"}
        </Text>
      ) : null}
    </View>
  );

  if (rankings.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: spacing.lg }}>
        {header}
        <View style={{ gap: spacing.md }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={56} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      data={filtered}
      keyExtractor={(item) => item.politician_name}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={refreshing}
      renderItem={({ item, index }) => (
        <View>
          {index > 0 ? <Divider inset={68} /> : null}
          <RankRow
            rank={index + 1}
            name={item.politician_name}
            party={item.party_name}
            count={String(item.total_appearances)}
            countLabel="Auftritte"
            fraction={item.total_appearances / max}
            onPress={() => openDetail(item)}
          />
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="search-outline"
          title="Keine Treffer"
          message="Für diese Suche wurde niemand gefunden."
        />
      }
    />
  );
}
