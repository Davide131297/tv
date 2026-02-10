"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import type { SummaryData } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "./ShowOptionsButtons";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import ColorBox from "./ui/color-box";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { OverviewSkeleton } from "@/components/ui/page-skeletons";

function OverviewPageContent() {
  const searchParams = useSearchParams();
  const updateUrl = useUrlUpdater();
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  // Initialisiere selectedYear aus URL-Parameter oder verwende aktuelles Jahr
  const yearFromUrl = searchParams.get("year");
  const [selectedYear, setSelectedYear] = useState<string>(
    yearFromUrl || String(currentYear),
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=summary&year=" +
            encodeURIComponent(selectedYear)
          : `/api/politics?type=summary&show=${encodeURIComponent(
              selectedShow,
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
    // Synchronisiere selectedYear mit URL-Parameter
    const yearParam = searchParams.get("year");
    const yearToUse = yearParam || String(currentYear);

    if (yearToUse !== selectedYear) {
      setSelectedYear(yearToUse);
    }
  }, [searchParams, currentYear, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue === "all" ? "" : showValue });
  };

  function handleYearChange(year: string) {
    setSelectedYear(year);
    updateUrl({ year });
  }

  if (loading) {
    return <OverviewSkeleton />;
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
    <div className="container mx-auto py-8 px-4">
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
            selectedShow={selectedShow}
          />
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
            <ColorBox
              color="blue"
              number={summary.total_appearances}
              text="Gesamt-Auftritte"
            />
            <ColorBox
              color="green"
              number={summary.total_episodes}
              text="Sendungen"
            />
            <ColorBox
              color="purple"
              number={summary.unique_politicians}
              text="Verschiedene Politiker"
            />
            <ColorBox
              color="orange"
              number={summary.parties_represented}
              text="Vertretene Parteien"
            />
          </div>

          {/* Durchschnittswerte */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 Durchschnittswerte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.total_appearances / summary.total_episodes || 0
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Sendung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.total_appearances / summary.unique_politicians || 0
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Auftritte pro Politiker
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.unique_politicians / summary.parties_represented ||
                    0
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
