import React, { useEffect, useState } from "react";
import { AppState, Platform, View, type AppStateStatus } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { FilterProvider } from "@/hooks/useFilter";
import { useTheme } from "@/lib/theme";
import { ApiError } from "@/lib/api";
import { ErrorState } from "@/components/ui/QueryBoundary";
import { loadSkia } from "@/lib/skiaLoader";

function useSkiaReady() {
  const [ready, setReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cancelled = false;
    loadSkia()
      .catch((error) => {
        console.error("Failed to load Skia for web", error);
      })
      .finally(() => {
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
      // Retry transient failures (network, 5xx) but never client errors.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.isClientError) && failureCount < 2,
      // Refetch stale data when the app returns to the foreground (see below).
      refetchOnWindowFocus: true,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query's "window focus" concept maps to the app becoming active on native.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(status === "active");
  }
}

function useAppStateFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);
}

// Last-resort fallback for render errors anywhere in the navigation tree.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: t.bg }}>
      <ErrorState
        message="Die App ist auf einen unerwarteten Fehler gestoßen."
        onRetry={() => {
          retry();
        }}
      />
    </View>
  );
}

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
  const skiaReady = useSkiaReady();
  useAppStateFocus();

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
