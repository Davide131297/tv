import { useCallback } from "react";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { type DateRange } from "@/utils/dateRange";

/** Schreibt einen Von–Bis-Zeitraum in die URL (und entfernt den alten `year`-Param). */
export function usePeriodUpdater() {
  const updateUrl = useUrlUpdater();
  return useCallback(
    (range: DateRange, extra: Record<string, string> = {}) => {
      updateUrl({ from: range.from, to: range.to, year: "", ...extra });
    },
    [updateUrl],
  );
}
