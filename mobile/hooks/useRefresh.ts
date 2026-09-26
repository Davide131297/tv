import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Pull-to-refresh helper that invalidates all active queries. */
export function useRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  return { refreshing, onRefresh };
}
