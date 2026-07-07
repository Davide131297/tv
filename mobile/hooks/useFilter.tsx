// Global show/year filter shared across all tabs via React context.

import React, { createContext, useContext, useMemo, useState } from "react";
import type { Filter } from "@/lib/api";

interface FilterContextValue extends Filter {
  show: string;
  year: string;
  setShow: (show: string) => void;
  setYear: (year: string) => void;
  reset: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<string>("all");
  const [year, setYear] = useState<string>("all");

  const value = useMemo<FilterContextValue>(
    () => ({
      show,
      year,
      setShow,
      setYear,
      reset: () => {
        setShow("all");
        setYear("all");
      },
    }),
    [show, year],
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
