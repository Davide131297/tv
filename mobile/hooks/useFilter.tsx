// Global show/year filter shared across all tabs via React context.

import React, { createContext, useContext, useMemo, useState } from "react";
import type { Filter } from "@/lib/api";
import { currentYear } from "@/lib/shows";

interface FilterContextValue extends Filter {
  show: string;
  year: string;
  union: boolean;
  setShow: (show: string) => void;
  setYear: (year: string) => void;
  setUnion: (union: boolean) => void;
  reset: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<string>("all");
  const [year, setYear] = useState<string>(currentYear());
  const [union, setUnion] = useState<boolean>(false);

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

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within a FilterProvider");
  return ctx;
}
