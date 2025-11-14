"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PoliticalAreasChart from "@/components/PoliticalAreasChart";
import type { PoliticalAreaStats } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import PoliticalAreasTable from "./PoliticalAreasTable";
import { TV_CHANNEL } from "@/lib/utils";

export default function PoliticalAreasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [politicalAreaStats, setPoliticalAreaStats] = useState<
    PoliticalAreaStats[]
  >([]);
  const [politicalAreaRows, setPoliticalAreaRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  // Initialize selectedYear from URL params so first fetch uses correct year
  const [selectedYear, setSelectedYear] = useState<string>(
    () => searchParams.get("year") || String(currentYear)
  );

  // generate years from 2024 up to current year (descending order)
  const years = useMemo(() => {
    const start = 2024;
    const end = new Date().getFullYear();
    const list: string[] = [];
    for (let y = end; y >= start; y--) list.push(String(y));
    return list;
  }, []);

  // Derive state from URL parameters
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

  const selectedChannel = useMemo(() => {
    const channelParam = searchParams.get("tv_channel");
    if (channelParam && TV_CHANNEL.includes(channelParam)) {
      return channelParam;
    }
    return "";
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (updates: { show?: string; year?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.show !== undefined) {
        if (updates.show === "all") {
          params.delete("show");
        } else {
          params.delete("tv_channel");
          params.set("show", updates.show);
        }
      }
      if (updates.year !== undefined) {
        if (updates.year) {
          params.set("year", updates.year);
        } else {
          params.delete("year");
        }
      }

      const newUrl = params.toString()
        ? `?${params.toString()}`
        : "/politische-themen";
      router.push(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const handleShowChange = (showValue: string) => {
    updateUrlParams({ show: showValue });
  };

  const handleYearChange = (yearValue: string) => {
    setSelectedYear(yearValue);
    updateUrlParams({ year: yearValue });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Direkt die Query-Parameter hier zusammenbauen (kein useMemo erforderlich)
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
  }, [selectedShow, selectedYear, selectedChannel]);

  useEffect(() => {
    fetchData();
  }, [fetchData, searchParams, selectedYear, selectedChannel]);

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
          selectedShow={selectedShow}
          selectedChannel={selectedChannel}
        />
      </div>

      {selectedShow === "Pinar Atalay" ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          Die Darstellung der politischen Themenbereiche für die Show{" "}
          <strong>Pinar Atalay</strong> ist derzeit nicht verfügbar.
        </div>
      ) : (
        <>
          <PoliticalAreasChart
            data={politicalAreaStats}
            rows={politicalAreaRows}
            selectedShow={selectedShow}
            selectedYear={selectedYear}
            years={years}
            handleYearChange={handleYearChange}
          />

          {/* Themen-Details Tabelle */}
          <PoliticalAreasTable politicalAreaStats={politicalAreaStats} />
        </>
      )}
    </div>
  );
}
