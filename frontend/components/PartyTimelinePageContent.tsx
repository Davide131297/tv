"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PartyTimelineChart from "@/components/PartyTimelineChart";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const selectedYear = useMemo(() => {
    return searchParams.get("year") || new Date().getFullYear().toString();
  }, [searchParams]);

  const unionMode = useMemo(() => {
    return searchParams.get("union") === "true";
  }, [searchParams]);

  const selectedParties = useMemo(() => {
    const partiesParam = searchParams.get("parteien");
    return partiesParam ? partiesParam.split(",") : [];
  }, [searchParams]);

  const [data, setData] = useState<MonthlyPartyStats[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateUrlParams = useCallback(
    (updates: {
      show?: string;
      year?: string;
      union?: boolean;
      parties?: string[];
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.show !== undefined) {
        if (updates.show === "all") {
          params.delete("show");
        } else {
          params.set("show", updates.show);
        }
      }

      if (updates.year !== undefined) {
        const currentYear = new Date().getFullYear().toString();
        if (updates.year === currentYear) {
          params.delete("year");
        } else {
          params.set("year", updates.year);
        }
      }

      if (updates.union !== undefined) {
        if (updates.union) {
          params.set("union", "true");
        } else {
          params.delete("union");
        }
      }

      if (updates.parties !== undefined) {
        if (updates.parties.length === 0) {
          params.delete("parteien");
        } else {
          params.set("parteien", updates.parties.join(","));
        }
      }

      const newUrl = params.toString()
        ? `/parteien-zeitverlauf?${params.toString()}`
        : "/parteien-zeitverlauf";
      router.push(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const handleShowChange = (show: string) => {
    updateUrlParams({ show });
  };

  const handleYearChange = (year: string) => {
    updateUrlParams({ year });
  };

  const handleUnionModeChange = (union: boolean) => {
    updateUrlParams({ union });
  };

  const handleSelectedPartiesChange = (parties: string[]) => {
    updateUrlParams({ parties });
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
          <label className="text-sm font-medium mb-2 block">
            Jahr auswählen:
          </label>
          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Jahr wählen" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          unionMode={unionMode}
          selectedParties={selectedParties}
          onUnionModeChange={handleUnionModeChange}
          onSelectedPartiesChange={handleSelectedPartiesChange}
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
