"use client";

import { useState, useEffect } from "react";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { usePeriodUpdater } from "@/hooks/usePeriodUpdater";
import DateRangePicker from "@/components/DateRangePicker";
import type { DateRange } from "@/utils/dateRange";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import ShowOptionsButtons from "./ShowOptionsButtons";

interface PoliticianFiltersProps {
  initialShow: string;
  initialYear: string;
  initialSearch: string;
}

export default function PoliticianFilters({
  initialShow,
  initialYear,
  initialSearch,
}: PoliticianFiltersProps) {
  const updatePeriod = usePeriodUpdater();
  const updateUrl = useUrlUpdater();
  const [searchInput, setSearchInput] = useState(initialSearch);

  useEffect(() => {
    setSearchInput(initialSearch);
  }, [initialSearch]);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue, page: "1" });
  };

  const handleSearchSubmit = () => {
    updateUrl({ search: searchInput, page: "1" });
  };

  const handleRangeChange = (range: DateRange) => {
    updatePeriod(range, { page: "1" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-transparent rounded-t-lg shadow-lg border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Politiker-Auftritte
          </h2>
          <div className="flex gap-2 items-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Zeitraum</p>
            <DateRangePicker period={initialYear} onChange={handleRangeChange} />
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 xl:justify-between">
          <ShowOptionsButtons
            onShowChange={handleShowChange}
            selectedShow={initialShow}
          />

          <div className="relative w-full md:w-96">
            <InputGroup>
              <InputGroupInput
                placeholder="Suche nach Name oder Partei..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant={"secondary"}
                  onClick={handleSearchSubmit}
                >
                  Suchen
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
