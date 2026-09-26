// Global show/year filter shared across all tabs via React context.
// The selection is persisted with AsyncStorage so it survives app restarts.

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Filter } from "@/lib/api";
import { availableYears, currentYear, isKnownShow } from "@/lib/shows";

const STORAGE_KEY = "polittalk.filter.v1";

interface FilterContextValue extends Filter {
  show: string;
  year: string;
  union: boolean;
  setShow: (show: string) => void;
  setYear: (year: string) => void;
  setUnion: (union: boolean) => void;
  reset: () => void;
}

interface PersistedFilter {
  show: string;
  year: string;
  union: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

/** Validates persisted data so stale / corrupt values never reach the API. */
export function sanitizeFilter(raw: unknown): Partial<PersistedFilter> {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const result: Partial<PersistedFilter> = {};
  if (typeof value.show === "string" && isKnownShow(value.show)) {
    result.show = value.show;
  }
  if (typeof value.year === "string" && availableYears().includes(value.year)) {
    result.year = value.year;
  }
  if (typeof value.union === "boolean") result.union = value.union;
  return result;
}

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<string>("all");
  const [year, setYear] = useState<string>(currentYear());
  const [union, setUnion] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore the last selection once on start.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled || !stored) return;
        const restored = sanitizeFilter(JSON.parse(stored));
        if (restored.show !== undefined) setShow(restored.show);
        if (restored.year !== undefined) setYear(restored.year);
        if (restored.union !== undefined) setUnion(restored.union);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist changes (only after hydration to avoid overwriting stored values).
  useEffect(() => {
    if (!hydrated) return;
    const value: PersistedFilter = { show, year, union };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)).catch(() => {});
  }, [show, year, union, hydrated]);

  const value = useMemo<FilterContextValue>(
    () => ({
      show,
      year,
      union,
      setShow,
      setYear,
      setUnion,
      reset: () => {
        setShow("all");
        setYear(currentYear());
        setUnion(false);
      },
    }),
    [show, year, union],
  );

  // Render nothing until the stored selection is restored, so screens don't
  // fire their requests twice (default filter first, then the stored one).
  if (!hydrated) return null;

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within a FilterProvider");
  return ctx;
}
