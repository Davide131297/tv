"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
import { SHOW_OPTIONS } from "@/types";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import OtherShowsSelect from "./OtherShowsSelect";

interface RankingsFiltersProps {
  initialShow: string;
  initialYear: string;
}

export default function RankingsFilters({
  initialShow,
  initialYear,
}: RankingsFiltersProps) {
  const years = useYearList(2024);
  const updateUrl = useUrlUpdater();

  const handleShowChange = (show: string) => {
    updateUrl({ show: show === "all" ? "" : show });
  };

  const handleYearChange = (year: string) => {
    updateUrl({ year: year });
  };

  const selectedList = initialShow
    ? initialShow.split(",").map((s) => s.trim()).filter(Boolean)
    : ["all"];

  const currentMainShow =
    selectedList.find((s) => SHOW_OPTIONS.some((o) => o.value === s)) || "all";

  const handleMainShowChange = (mainValue: string) => {
    const otherValues = selectedList.filter(
      (s) => !SHOW_OPTIONS.some((o) => o.value === s),
    );
    if (otherValues.length > 0) {
      updateUrl({ show: [mainValue, ...otherValues].join(",") });
    } else {
      updateUrl({ show: mainValue === "all" ? "" : mainValue });
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 items-start sm:items-center justify-between mb-4 sm:mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Politiker-Rankings
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Top-Listen der meistgeladenen Politiker
          {initialShow && initialShow !== "all" && ` in ${initialShow.split(",").join(", ")}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Jahr</label>
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
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Show</label>
          <NativeSelect
            value={currentMainShow}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleMainShowChange(e.target.value)
            }
          >
            {SHOW_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <OtherShowsSelect
          selectedShow={initialShow}
          onShowChange={handleShowChange}
          label="Sonstige einbinden"
          isMultiSelect={true}
        />
      </div>
    </div>
  );
}
