"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SummaryData } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "./ShowOptionsButtons";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

function OverviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  // generate years from 2024 up to current year (descending order)
  const years = useMemo(() => {
    const start = 2024;
    const end = new Date().getFullYear();
    const list: string[] = [];
    for (let y = end; y >= start; y--) list.push(String(y));
    return list;
  }, []);

  // Derive selectedShow directly from URL parameters
  const selectedShow = useMemo(() => {
    const showParam = searchParams.get("show");
    if (
      showParam &&
      SHOW_OPTIONS.some((option) => option.value === showParam)
    ) {
      return showParam;
    }
    return "all";
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    console.log(
      "Fetching data for show:",
      selectedShow,
      "and year:",
      selectedYear
    );
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=summary&year=" +
            encodeURIComponent(selectedYear)
          : `/api/politics?type=summary&show=${encodeURIComponent(
              selectedShow
            )}&year=${encodeURIComponent(selectedYear)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: FETCH_HEADERS,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  }, [selectedShow, selectedYear]);

  useEffect(() => {
    fetchData();
    const search = searchParams.get("year");
    if (search && search !== selectedYear) {
      setSelectedYear(search);
    }
  }, [selectedShow, selectedYear, fetchData, searchParams]);

  const handleShowChange = (showValue: string) => {
    // Update URL parameters
    const params = new URLSearchParams(searchParams.toString());
    if (showValue === "all") {
      params.delete("show");
    } else {
      params.set("show", showValue);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "/uebersicht";
    router.push(newUrl, { scroll: false });
  };

  function handleYearChange(year: string) {
    setSelectedYear(year);
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    const newUrl = params.toString() ? `?${params.toString()}` : "/uebersicht";
    router.push(newUrl, { scroll: false });
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Lade Daten...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gesamtübersicht
        </h1>
        <p className="text-gray-600 mb-4">
          Übersicht über alle Politiker-Auftritte in deutschen TV-Talkshows
        </p>

        <div className="flex flex-col md:flex-row gap-2 justify-between">
          {/* Show Auswahl */}
          <div className="flex flex-wrap gap-2">
            {SHOW_OPTIONS.map((option) => {
              const getButtonColors = (
                showValue: string,
                isSelected: boolean
              ) => {
                if (!isSelected)
                  return "bg-gray-100 text-gray-700 hover:bg-gray-200";

                return ShowOptionsButtons(showValue);
              };

              return (
                <Button
                  key={option.value}
                  onClick={() => handleShowChange(option.value)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${getButtonColors(
                    option.value,
                    selectedShow === option.value
                  )}`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
          <div className="flex gap-2 items-center">
            <p>Jahr</p>
            <NativeSelect
              value={selectedYear}
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

      {summary && (
        <>
          {/* Show-spezifische Überschrift */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              📊 Statistiken für:{" "}
              {summary.show_name ||
                SHOW_OPTIONS.find((opt) => opt.value === selectedShow)?.label}
            </h2>
          </div>

          {/* Hauptstatistiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {summary.total_appearances}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                Gesamt-Auftritte
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {summary.total_episodes}
              </div>
              <div className="text-sm text-green-700 font-medium">
                Sendungen
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {summary.unique_politicians}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Verschiedene Politiker
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {summary.parties_represented}
              </div>
              <div className="text-sm text-orange-700 font-medium">
                Vertretene Parteien
              </div>
            </div>
          </div>

          {/* Durchschnittswerte */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 Durchschnittswerte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(summary.total_appearances / summary.total_episodes).toFixed(
                    1
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Sendung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.total_appearances / summary.unique_politicians
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Auftritte pro Politiker
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.unique_politicians / summary.parties_represented
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Partei
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OverviewPageContent;
