import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilterProvider } from "@/hooks/useFilter";
import { useTheme } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const t = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, [t.bg]);

  return (
    <>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTitleStyle: { color: t.text, fontWeight: "700" },
          headerTintColor: t.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="filter"
          options={{
            presentation: "modal",
            title: "Filter",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="politiker/[name]"
          options={{ title: "Politiker", headerBackTitle: "Zurück" }}
        />
        <Stack.Screen
          name="sendung/[date]"
          options={{ title: "Sendung", headerBackTitle: "Zurück" }}
        />
        <Stack.Screen
          name="einschaltquoten"
          options={{ title: "Einschaltquoten", headerBackTitle: "Zurück" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <FilterProvider>
          <RootStack />
        </FilterProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
