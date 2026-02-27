"use client";

import { useState, useEffect } from "react";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
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
  const years = useYearList(2024);
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

  const handleYearChange = (yearValue: string) => {
    updateUrl({ year: yearValue, page: "1" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <div className="bg-white rounded-t-lg shadow-lg border-b border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Politiker-Auftritte
          </h2>
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
