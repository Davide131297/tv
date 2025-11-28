import { useMemo } from "react";
import { getSelectedOption } from "@/utils/getSelectedOption";

export function useSelectedShow(
  searchParams: URLSearchParams,
  options: { value: string }[],
  defaultValue: string = "all"
) {
  return useMemo(
    () =>
      getSelectedOption(
        searchParams,
        "show",
        options.map((o) => o.value),
        defaultValue
      ),
    [searchParams, options, defaultValue]
  );
}
