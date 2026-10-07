"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { usePeriodUpdater } from "@/hooks/usePeriodUpdater";
import DateRangePicker from "@/components/DateRangePicker";
import type { DateRange } from "@/utils/dateRange";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import ShowOptionsButtons from "./ShowOptionsButtons";

interface EpisodeFiltersProps {
  initialShow: string;
  initialYear: string;
}

export default function EpisodeFilters({
  initialShow,
  initialYear,
}: EpisodeFiltersProps) {
  const updateUrl = useUrlUpdater();
  const updatePeriod = usePeriodUpdater();

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue });
  };

  const handleRangeChange = (range: DateRange) => {
    updatePeriod(range);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
        <ShowOptionsButtons
          selectedShow={initialShow}
          onShowChange={handleShowChange}
          withAll={false}
        />

        <div className="flex gap-2 items-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Zeitraum</p>
          <DateRangePicker period={initialYear} onChange={handleRangeChange} />
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-400">
          📊 Aktuelle Ansicht: {initialShow}
        </h2>
      </div>
    </div>
  );
}
