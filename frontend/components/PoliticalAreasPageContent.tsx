"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import PoliticalAreasChart from "@/components/PoliticalAreasChart";
import type { PoliticalAreaStats, PoliticalAreaEpisodeRow } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import PoliticalAreasTable from "./PoliticalAreasTable";
import { TV_CHANNEL } from "@/lib/utils";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { useSelectedChannel } from "@/hooks/useSelectedChannel";
import TopicPartyHeatmap from "@/components/TopicPartyHeatmap";
import PartyDominanceChart from "@/components/PartyDominanceChart";

export default function PoliticalAreasPageContent() {
  const searchParams = useSearchParams();
  const updateUrl = useUrlUpdater();
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const selectedChannel = useSelectedChannel(searchParams, TV_CHANNEL);
  const [politicalAreaStats, setPoliticalAreaStats] = useState<
    PoliticalAreaStats[]
  >([]);
  const [politicalAreaRows, setPoliticalAreaRows] = useState<
    PoliticalAreaEpisodeRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    () => searchParams.get("year") || String(currentYear),
  );

  const [localShow, setLocalShow] = useState<string>(selectedShow);

  // Sync localShow with URL on mount/navigation
  useEffect(() => {
    setLocalShow(selectedShow);
  }, [selectedShow]);

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
          {loading && <LoadingOverlay />}

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

          {/* Partei-Dominanz Analyse */}
          <PartyDominanceChart
            selectedShow={localShow}
            selectedYear={selectedYear}
          />
        </div>
      )}
    </div>
  );
}
