"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PartyTimelineChart from "@/components/PartyTimelineChart";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import { Button } from "@/components/ui/button";
import { SHOW_OPTIONS } from "@/types";

interface MonthlyPartyStats {
  month: string;
  [party: string]: string | number;
}

interface ApiResponse {
  success: boolean;
  data: MonthlyPartyStats[];
  parties: string[];
  year: string;
}

export default function PartyTimelinePageContent() {
  const searchParams = useSearchParams();
  const selectedShow = searchParams.get("show") || "all";
  const selectedYear =
    searchParams.get("year") || new Date().getFullYear().toString();

  const [data, setData] = useState<MonthlyPartyStats[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleShowChange = (show: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("show", show);
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
    window.location.reload();
  };

  const handleYearChange = (year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
    window.location.reload();
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/party-timeline?show=${selectedShow}&year=${selectedYear}`
        );

        if (!response.ok) {
          throw new Error("Fehler beim Laden der Daten");
        }

        const result: ApiResponse = await response.json();

        if (result.success) {
          setData(result.data);
          setParties(result.parties);
        } else {
          throw new Error("Daten konnten nicht geladen werden");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
        );
        console.error("Error fetching party timeline data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedShow, selectedYear]);

  // Verfügbare Jahre (ab 2025 bis aktuelles Jahr)
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const availableYears = Array.from(
    { length: Math.max(currentYear - startYear + 1, 1) },
    (_, i) => (startYear + i).toString()
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Zeitverlauf Parteien</h1>
        <p className="text-muted-foreground">
          Monatliche Entwicklung der Partei-Auftritte über das Jahr
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* Show Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Show auswählen:
          </label>
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getButtonColors(
                    option.value,
                    selectedShow === option.value
                  )}`}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Year Filter */}
        <div>
          <label
            htmlFor="year-select"
            className="text-sm font-medium mb-2 block"
          >
            Jahr auswählen:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-lg text-muted-foreground">Lade Daten...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {!isLoading && !error && data.length > 0 && (
        <PartyTimelineChart
          data={data}
          parties={parties}
          selectedShow={selectedShow}
          year={selectedYear}
        />
      )}

      {!isLoading && !error && data.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Keine Daten für das ausgewählte Jahr verfügbar.
        </div>
      )}
    </div>
  );
}
