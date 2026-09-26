import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilterProvider } from "@/hooks/useFilter";
import { useTheme } from "@/lib/theme";

// canvaskit-wasm version must match the one pinned in package-lock.json —
// check that pin when bumping dependencies.
const CANVASKIT_VERSION = "0.41.0";

function useSkiaWebReady() {
  const [ready, setReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cancelled = false;

    import("@shopify/react-native-skia/lib/module/web/LoadSkiaWeb")
      .then(({ LoadSkiaWeb }) =>
        LoadSkiaWeb({
          locateFile: (file: string) =>
            `https://unpkg.com/canvaskit-wasm@${CANVASKIT_VERSION}/bin/full/${file}`,
        })
      )
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error("Failed to load Skia for web", error);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

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
  const skiaReady = useSkiaWebReady();

  useEffect(() => {
    if (skiaReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [skiaReady]);

  if (!skiaReady) {
    return null;
  }

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
