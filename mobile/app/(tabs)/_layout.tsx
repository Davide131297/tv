import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import { FilterButton } from "@/components/FilterButton";
import { spacing, useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const t = useTheme();

  const filterRight = () => <FilterButton />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerTitleStyle: { color: t.text, fontWeight: "700" },
        headerShadowVisible: false,
        headerRightContainerStyle: { paddingRight: spacing.lg },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textFaint,
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          // The default 49px iOS tab bar height is tuned for native font
          // metrics; browsers render the label with slightly taller
          // line-height, which clips its bottom edge. Give web a bit more
          // room.
          ...(Platform.OS === "web" ? { height: 58 } : null),
        },
        tabBarItemStyle: Platform.OS === "web" ? { paddingBottom: 6 } : undefined,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500", lineHeight: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Übersicht",
          headerRight: filterRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="parteien"
        options={{
          title: "Parteien",
          headerRight: filterRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pie-chart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="themen"
        options={{
          title: "Themen",
          headerRight: filterRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="politiker"
        options={{
          title: "Politiker",
          headerRight: filterRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sendungen"
        options={{
          title: "Sendungen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="tv" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
