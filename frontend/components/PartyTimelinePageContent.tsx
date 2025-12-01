"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PartyTimelineChart from "@/components/PartyTimelineChart";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import { SHOW_OPTIONS } from "@/types";
import { TV_CHANNEL } from "@/lib/utils";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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

  const [localShow, setLocalShow] = useState<string>(selectedShow);
  const [localUnionMode, setLocalUnionMode] = useState<boolean>(
    searchParams.get("union") === "true"
  );
  const [localSelectedParties, setLocalSelectedParties] = useState<string[]>(
    () => {
      const partiesParam = searchParams.get("parteien");
      return partiesParam ? partiesParam.split(",") : [];
    }
  );

  // Sync localShow with URL on mount/navigation
  useEffect(() => {
    setLocalShow(selectedShow);
  }, [selectedShow]);

  // Update URL without page reload
  const updateUrl = (updates: {
    [key: string]: string | boolean | string[] | undefined;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === false || value === "") {
        params.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(","));
        } else {
          params.delete(key);
        }
      } else if (typeof value === "boolean") {
        params.set(key, String(value));
      } else {
        params.set(key, value);
      }
    });

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleShowChange = (show: string) => {
    setLocalShow(show);
    updateUrl({ show });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    updateUrl({ year });
  };

  const handleUnionModeChange = (union: boolean) => {
    setLocalUnionMode(union);
    updateUrl({ union });
  };

  const handleSelectedPartiesChange = (parties: string[]) => {
    setLocalSelectedParties(parties);
    updateUrl({ parteien: parties });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (localShow && localShow !== "all") {
          params.append("show", localShow);
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
  }, [localShow, selectedYear, selectedChannel]);

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
            selectedShow={localShow}
            selectedChannel={selectedChannel}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10 rounded-lg min-h-[400px]">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Lade Daten...</span>
            </div>
          </div>
        )}

        <PartyTimelineChart
          data={data}
          parties={parties}
          selectedShow={localShow}
          year={selectedYear}
          unionMode={localUnionMode}
          selectedParties={localSelectedParties}
          onUnionModeChange={handleUnionModeChange}
          onSelectedPartiesChange={handleSelectedPartiesChange}
          selectedYear={selectedYear}
          handleYearChange={handleYearChange}
          years={years}
        />

        {!isLoading && data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center py-12 text-muted-foreground">
              Keine Daten für das ausgewählte Jahr verfügbar.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
