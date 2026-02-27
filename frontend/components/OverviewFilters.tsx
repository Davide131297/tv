"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
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
  const years = useYearList(2024);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue === "all" ? "" : showValue });
  };

  function handleYearChange(year: string) {
    updateUrl({ year });
  }

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Gesamtübersicht
      </h1>
      <p className="text-gray-600 mb-4">
        Übersicht über alle Politiker-Auftritte in deutschen TV-Talkshows
      </p>

      <div className="flex flex-col justify-between">
        {/* Show Auswahl */}
        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={initialShow}
        />
        <div className="flex gap-2 items-center">
          <p className="text-sm font-medium">Jahr</p>
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
    </div>
  );
}
