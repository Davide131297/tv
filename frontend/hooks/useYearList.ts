import { useMemo } from "react";
import { generateYearList } from "@/utils/generateYearList";

export function useYearList(start = 2024) {
  return useMemo(() => generateYearList(start), [start]);
}
