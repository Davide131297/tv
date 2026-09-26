import React from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import { Text } from "./Text";
import { radius, spacing, useTheme } from "@/lib/theme";
import { tapLight } from "@/lib/haptics";

interface Option {
  value: string;
  label: string;
}

/** iOS-style segmented control. Horizontal, equal-width segments. */
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTheme();
  const [width, setWidth] = React.useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);
  const seg = options.length > 0 ? width / options.length : 0;
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: "row",
        backgroundColor: t.bgElevated,
        borderRadius: radius.md,
        padding: 3,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      {width > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 3 + activeIndex * seg,
            width: seg - 0,
            backgroundColor: t.card,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: t.border,
          }}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tapLight();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              variant="callout"
              weight={active ? "semibold" : "regular"}
              tone={active ? "default" : "muted"}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
