"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { OTHER_SHOW_OPTIONS, type ShowOption } from "@/types";
import { cn } from "@/lib/utils";

interface OtherShowsSelectProps {
  selectedShow: string;
  onShowChange: (show: string) => void;
  label?: string;
  options?: ShowOption[];
  isMultiSelect?: boolean;
}

export default function OtherShowsSelect({
  selectedShow,
  onShowChange,
  label = "Sonstige",
  options = OTHER_SHOW_OPTIONS,
  isMultiSelect = false,
}: OtherShowsSelectProps) {
  const selectedList = React.useMemo(() => {
    if (!selectedShow) return [];
    return selectedShow
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedShow]);

  // Check which other show options are currently selected
  const activeOtherShows = options.filter((opt) =>
    selectedList.includes(opt.value),
  );
  const isOtherActive = activeOtherShows.length > 0;

  const handleToggle = (showValue: string) => {
    if (isMultiSelect) {
      let newSelectedList: string[];
      if (selectedList.includes(showValue)) {
        // Remove it
        newSelectedList = selectedList.filter((s) => s !== showValue);
        if (newSelectedList.length === 0) {
          newSelectedList = ["all"];
        }
      } else {
        // Add it
        newSelectedList = [
          ...selectedList.filter((s) => s !== "all"),
          showValue,
        ];
      }
      onShowChange(newSelectedList.join(","));
    } else {
      // Single select mode
      if (selectedList.includes(showValue) && selectedList.length === 1) {
        onShowChange("all");
      } else {
        onShowChange(showValue);
      }
    }
  };

  const handleClear = () => {
    if (isMultiSelect) {
      const otherValues = new Set(options.map((o) => o.value));
      const mainShowsOnly = selectedList.filter((s) => !otherValues.has(s));
      if (mainShowsOnly.length === 0) {
        onShowChange("all");
      } else {
        onShowChange(mainShowsOnly.join(","));
      }
    } else {
      onShowChange("all");
    }
  };

  // Button Label
  let labelText = label;
  if (activeOtherShows.length === 1) {
    labelText = `${label}: ${activeOtherShows[0].label}`;
  } else if (activeOtherShows.length > 1) {
    labelText = `${label} (${activeOtherShows.length})`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border shadow-xs outline-none select-none",
            isOtherActive
              ? "bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900 dark:hover:text-white font-semibold"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-white",
          )}
        >
          <span>{labelText}</span>
          <ChevronDown className="size-4 opacity-60 transition-transform duration-200" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl z-50"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Weitere Sendungen
          </DropdownMenuLabel>
          {isOtherActive && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
            >
              Zurücksetzen
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="my-1" />

        <div className="space-y-0.5 py-0.5">
          {options.map((option) => {
            const isSelected = selectedList.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm text-left select-none",
                  isSelected
                    ? "bg-indigo-50 text-indigo-950 dark:bg-indigo-950/80 dark:text-white font-semibold"
                    : "text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-950 dark:hover:text-white",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "size-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                    )}
                  >
                    {isSelected && <Check className="size-3 stroke-[3]" />}
                  </div>
                  <span>{option.label}</span>
                </div>

                {option.value === "Sarah Tacke" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 font-bold uppercase">
                    ZDF
                  </span>
                )}
                {option.value.startsWith("Phoenix") && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold uppercase">
                    Phoenix
                  </span>
                )}

              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
