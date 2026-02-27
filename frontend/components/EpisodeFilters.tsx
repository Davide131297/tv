"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
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
  const years = useYearList(2024);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue });
  };

  const handleYearChange = (yearValue: string) => {
    updateUrl({ year: yearValue });
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
          <p className="text-sm font-medium text-gray-700">Jahr</p>
          <NativeSelect
            value={initialYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleYearChange(e.target.value)
            }
          >
            <NativeSelectOption value="all">Insgesamt</NativeSelectOption>
            {years.map((y) => (
              <NativeSelectOption key={y} value={y}>
                {y}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-xl font-semibold text-gray-800">
          📊 Aktuelle Ansicht: {initialShow}
        </h2>
      </div>
    </div>
  );
}
