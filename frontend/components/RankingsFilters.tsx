"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { usePeriodUpdater } from "@/hooks/usePeriodUpdater";
import DateRangePicker from "@/components/DateRangePicker";
import type { DateRange } from "@/utils/dateRange";
import { SHOW_OPTIONS } from "@/types";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface RankingsFiltersProps {
  initialShow: string;
  initialYear: string;
}

export default function RankingsFilters({
  initialShow,
  initialYear,
}: RankingsFiltersProps) {
  const updatePeriod = usePeriodUpdater();
  const updateUrl = useUrlUpdater();

  const handleShowChange = (show: string) => {
    updateUrl({ show: show === "all" ? "" : show });
  };

  const handleRangeChange = (range: DateRange) => {
    updatePeriod(range);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-center justify-between mb-4 sm:mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Politiker-Rankings
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Top-Listen der meistgeladenen Politiker
          {initialShow !== "all" && ` in ${initialShow}`}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Zeitraum</label>
          <DateRangePicker period={initialYear} onChange={handleRangeChange} />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Show</label>
          <NativeSelect
            value={initialShow}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleShowChange(e.target.value)
            }
          >
            {SHOW_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
