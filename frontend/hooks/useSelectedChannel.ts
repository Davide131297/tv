import { useMemo } from "react";
import { getSelectedOption } from "@/utils/getSelectedOption";

export function useSelectedChannel(
  searchParams: URLSearchParams,
  channels: string[]
) {
  return useMemo(
    () => getSelectedOption(searchParams, "tv_channel", channels, ""),
    [searchParams, channels]
  );
}
