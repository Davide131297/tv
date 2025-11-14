"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PartyTimelineChart from "@/components/PartyTimelineChart";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import { SHOW_OPTIONS } from "@/types";
import { TV_CHANNEL } from "@/lib/utils";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { useSelectedChannel } from "@/hooks/useSelectedChannel";

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
  const updateUrl = useUrlUpdater();
  const searchParams = useSearchParams();
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const selectedChannel = useSelectedChannel(searchParams, TV_CHANNEL);
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<MonthlyPartyStats[]>([]);
  const [parties, setParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(
    () => searchParams.get("year") || String(currentYear)
  );

  const unionMode = useMemo(() => {
    return searchParams.get("union") === "true";
  }, [searchParams]);

  const selectedParties = useMemo(() => {
    const partiesParam = searchParams.get("parteien");
    return partiesParam ? partiesParam.split(",") : [];
  }, [searchParams]);

  const handleShowChange = (show: string) => {
    updateUrl({ show });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    updateUrl({ year });
  };

  const handleUnionModeChange = (union: boolean) => {
    updateUrl({ union });
  };

  const handleSelectedPartiesChange = (parties: string[]) => {
    updateUrl({ parties });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (selectedShow && selectedShow !== "all") {
          params.append("show", selectedShow);
        }
        if (selectedYear) {
          params.append("year", selectedYear);
        }
        if (selectedChannel) {
          params.append("tv_channel", selectedChannel);
        }

        const queryString = params.toString();

        const response = await fetch(`/api/party-timeline?${queryString}`);

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
  }, [selectedShow, selectedYear, searchParams]);

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
          <ShowOptionsButtons
            onShowChange={handleShowChange}
            selectedShow={selectedShow}
            selectedChannel={selectedChannel}
          />
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
          selectedYear={selectedYear}
          handleYearChange={handleYearChange}
          years={years}
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
