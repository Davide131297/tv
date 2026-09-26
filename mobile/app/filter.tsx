import React from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { Divider } from "@/components/Divider";
import { radius, spacing, useTheme } from "@/lib/theme";
import { useFilter } from "@/hooks/useFilter";
import { OTHER_SHOWS, SHOWS, availableYears } from "@/lib/shows";
import type { ShowOption } from "@/lib/types";
import { tapLight } from "@/lib/haptics";

export default function FilterModal() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show, year, union, setShow, setYear, setUnion, reset } = useFilter();

  return (
    <View style={{ flex: 1, backgroundColor: t.bgElevated }}>
      {/* Grab handle */}
      <View style={{ alignItems: "center", paddingTop: spacing.sm }}>
        <View
          style={{
            width: 38,
            height: 5,
            borderRadius: 3,
            backgroundColor: t.border,
          }}
        />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <Pressable
          onPress={() => {
            tapLight();
            reset();
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text variant="body" tone="accent">
            Zurücksetzen
          </Text>
        </Pressable>
        <Text variant="headline" weight="bold">
          Filter
        </Text>
        <Pressable
          onPress={() => {
            tapLight();
            router.back();
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text variant="body" weight="semibold" tone="accent">
            Fertig
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <Text
          variant="subhead"
          tone="muted"
          weight="semibold"
          style={{ marginBottom: spacing.sm, textTransform: "uppercase" }}
        >
          Sendung
        </Text>
        <ShowList options={SHOWS} selected={show} onSelect={setShow} />

        <Text
          variant="subhead"
          tone="muted"
          weight="semibold"
          style={{
            marginBottom: spacing.xs,
            marginTop: spacing.xl,
            textTransform: "uppercase",
          }}
        >
          Weitere Sendungen
        </Text>
        <Text variant="caption" tone="faint" style={{ marginBottom: spacing.sm }}>
          Nicht in „Alle Shows“ enthalten.
        </Text>
        <ShowList options={OTHER_SHOWS} selected={show} onSelect={setShow} />

        <Text
          variant="subhead"
          tone="muted"
          weight="semibold"
          style={{
            marginBottom: spacing.sm,
            marginTop: spacing.xl,
            textTransform: "uppercase",
          }}
        >
          Jahr
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {availableYears().map((y) => {
            const active = y === year;
            return (
              <Pressable
                key={y}
                onPress={() => {
                  tapLight();
                  setYear(y);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.full,
                  backgroundColor: active ? t.accent : t.card,
                  borderWidth: 1,
                  borderColor: active ? t.accent : t.border,
                }}
              >
                <Text
                  variant="callout"
                  weight={active ? "semibold" : "regular"}
                  color={active ? "#fff" : t.text}
                >
                  {y === "all" ? "Alle Jahre" : y}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          variant="subhead"
          tone="muted"
          weight="semibold"
          style={{
            marginBottom: spacing.sm,
            marginTop: spacing.xl,
            textTransform: "uppercase",
          }}
        >
          Parteien
        </Text>
        <View
          style={{
            backgroundColor: t.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: t.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            gap: spacing.md,
          }}
        >
          <Text variant="body" style={{ flex: 1 }}>
            CDU/CSU als Union zusammenfassen
          </Text>
          <Switch
            value={union}
            onValueChange={(v) => {
              tapLight();
              setUnion(v);
            }}
            trackColor={{ false: t.border, true: t.accent }}
            accessibilityLabel="CDU/CSU als Union zusammenfassen"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ShowList({
  options,
  selected,
  onSelect,
}: {
  options: ShowOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: t.border,
        overflow: "hidden",
      }}
    >
      {options.map((s, i) => {
        const active = s.value === selected;
        return (
          <View key={s.value}>
            {i > 0 ? <Divider inset={spacing.lg} /> : null}
            <Pressable
              onPress={() => {
                tapLight();
                onSelect(s.value);
              }}
              android_ripple={{ color: t.cardPressed }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={s.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: s.accent,
                }}
              />
              <Text variant="body" style={{ flex: 1 }}>
                {s.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={20} color={t.accent} />
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
