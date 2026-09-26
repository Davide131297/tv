import React from "react";
import { Pressable, View } from "react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";
import { Text } from "./Text";
import { radius, spacing, useTheme } from "@/lib/theme";
import { ApiError } from "@/lib/api";
import { tapLight } from "@/lib/haptics";

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  skeleton?: React.ReactNode;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 0) return error.message;
  return "Die Daten konnten nicht geladen werden.";
}

/** Declarative loading / error / empty handling around a React Query result. */
export function QueryBoundary<T>({
  query,
  children,
  isEmpty,
  emptyTitle = "Keine Daten",
  emptyMessage,
  skeleton,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  if (query.isError || query.data === undefined) {
    return (
      <ErrorState
        message={errorMessage(query.error)}
        retrying={query.isFetching}
        onRetry={() => {
          query.refetch();
        }}
      />
    );
  }

  if (isEmpty?.(query.data)) {
    return (
      <EmptyState
        icon="file-tray-outline"
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return <>{children(query.data)}</>;
}

export function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const t = useTheme();
  return (
    <View>
      <EmptyState
        icon="alert-circle-outline"
        title="Etwas ist schiefgelaufen"
        message={message}
      />
      {onRetry ? (
        <Pressable
          onPress={() => {
            tapLight();
            onRetry();
          }}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="Erneut versuchen"
          style={({ pressed }) => ({
            alignSelf: "center",
            marginTop: -spacing.xl,
            marginBottom: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.sm,
            borderRadius: radius.full,
            backgroundColor: t.accentSoft,
            opacity: pressed || retrying ? 0.6 : 1,
          })}
        >
          <Text variant="callout" weight="semibold" tone="accent">
            {retrying ? "Lädt …" : "Erneut versuchen"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DefaultSkeleton() {
  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={72} radius={16} />
      ))}
    </View>
  );
}
