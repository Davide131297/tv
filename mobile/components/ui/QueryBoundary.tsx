import React from "react";
import { View } from "react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";
import { spacing } from "@/lib/theme";

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => React.ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  skeleton?: React.ReactNode;
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
  if (query.isLoading) {
    return <>{skeleton ?? <DefaultSkeleton />}</>;
  }

  if (query.isError || query.data === undefined) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Etwas ist schiefgelaufen"
        message="Die Daten konnten nicht geladen werden. Zieh zum Aktualisieren nach unten."
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

function DefaultSkeleton() {
  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.md }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={72} radius={16} />
      ))}
    </View>
  );
}
