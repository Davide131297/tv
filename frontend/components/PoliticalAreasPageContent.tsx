"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PoliticalAreasChart from "@/components/PoliticalAreasChart";
import type { PoliticalAreaStats } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import PoliticalAreasTable from "./PoliticalAreasTable";
import { TV_CHANNEL } from "@/lib/utils";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { useSelectedChannel } from "@/hooks/useSelectedChannel";
import TopicPartyHeatmap from "@/components/TopicPartyHeatmap";

export default function PoliticalAreasPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const selectedChannel = useSelectedChannel(searchParams, TV_CHANNEL);
  const [politicalAreaStats, setPoliticalAreaStats] = useState<
    PoliticalAreaStats[]
  >([]);
  const [politicalAreaRows, setPoliticalAreaRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    () => searchParams.get("year") || String(currentYear)
  );

  const [localShow, setLocalShow] = useState<string>(selectedShow);

  // Sync localShow with URL on mount/navigation
  useEffect(() => {
    setLocalShow(selectedShow);
  }, [selectedShow]);

  // Update URL without page reload
  const updateUrl = (updates: {
    [key: string]: string | boolean | undefined;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === false || value === "") {
        params.delete(key);
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

  const handleShowChange = (showValue: string) => {
    setLocalShow(showValue);
    updateUrl({ show: showValue });
  };

  const handleYearChange = (yearValue: string) => {
    setSelectedYear(yearValue);
    updateUrl({ year: yearValue });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Direkt die Query-Parameter hier zusammenbauen (kein useMemo erforderlich)
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
      const url =
        "/api/political-areas" + (queryString ? `?${queryString}` : "");

      const response = await fetch(url, {
        method: "GET",
        headers: FETCH_HEADERS,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      if (data.success) {
        setPoliticalAreaStats(data.data);
        if (data.rows) setPoliticalAreaRows(data.rows);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  }, [localShow, selectedYear, selectedChannel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏛️ Politische Themenbereiche
        </h1>
        <p className="text-gray-600 mb-4">
          Verteilung der politischen Themen in deutschen TV-Talkshows
        </p>

        {/* Show Auswahl */}
        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={localShow}
          selectedChannel={selectedChannel}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {localShow === "Pinar Atalay" ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          Die Darstellung der politischen Themenbereiche für die Show{" "}
          <strong>Pinar Atalay</strong> ist derzeit nicht verfügbar.
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10 rounded-lg min-h-[400px]">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Lade Daten...</span>
              </div>
            </div>
          )}

          <PoliticalAreasChart
            data={politicalAreaStats}
            rows={politicalAreaRows}
            selectedShow={localShow}
            selectedYear={selectedYear}
            years={years}
            handleYearChange={handleYearChange}
          />

          {/* Themen-Details Tabelle */}
          <PoliticalAreasTable politicalAreaStats={politicalAreaStats} />

          {/* Themen-Partei Matrix */}
          <TopicPartyHeatmap
            selectedShow={localShow}
            selectedYear={selectedYear}
          />
        </div>
      )}
    </div>
  );
}
