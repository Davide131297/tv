"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { usePeriodUpdater } from "@/hooks/usePeriodUpdater";
import DateRangePicker from "@/components/DateRangePicker";
import type { DateRange } from "@/utils/dateRange";
import ShowOptionsButtons from "./ShowOptionsButtons";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface OverviewFiltersProps {
  initialShow: string;
  initialYear: string;
}

export default function OverviewFilters({
  initialShow,
  initialYear,
}: OverviewFiltersProps) {
  const updateUrl = useUrlUpdater();
  const updatePeriod = usePeriodUpdater();

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue === "all" ? "" : showValue });
  };

  const handleRangeChange = (range: DateRange) => {
    updatePeriod(range);
  };

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">
        Gesamtübersicht
      </h1>
      <p className="text-gray-600 mb-4 dark:text-gray-400">
        Übersicht über alle Politiker-Auftritte in deutschen TV-Talkshows
      </p>

      <div className="flex flex-col justify-between">
        {/* Show Auswahl */}
        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={initialShow}
        />
        <div className="flex gap-2 items-center">
          <p className="text-sm font-medium">Zeitraum</p>
          <DateRangePicker period={initialYear} onChange={handleRangeChange} />
        </div>
      </div>
    </div>
  );
}
