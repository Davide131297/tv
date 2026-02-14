"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import type { EpisodeData, Statistics } from "@/types";
import { SHOW_OPTIONS_WITHOUT_ALL } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import LastShowTable from "@/components/LastShowTable";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import ColorBox from "./ui/color-box";
import ShowOptionsButtons from "./ShowOptionsButtons";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { useYearList } from "@/hooks/useYearList";

export default function SendungenPageContent() {
  const searchParams = useSearchParams();

  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  const years = useYearList(2024);
  const selectedShow = useSelectedShow(
    searchParams,
    SHOW_OPTIONS_WITHOUT_ALL,
    "Markus Lanz",
  );

  const [localShow, setLocalShow] = useState<string>(selectedShow);

  // Sync localShow with URL on mount/navigation
  useEffect(() => {
    setLocalShow(selectedShow);
  }, [selectedShow]);

  const updateUrl = useUrlUpdater();

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

      // Hole Episoden-Daten und Statistiken parallel
      const [episodesResponse, statsResponse] = await Promise.all([
        fetch(
          `/api/politics?type=episodes-with-politicians&show=${encodeURIComponent(
            localShow,
          )}&year=${encodeURIComponent(selectedYear)}`,
          {
            method: "GET",
            headers: FETCH_HEADERS,
          },
        ),
        fetch(
          `/api/politics?type=episode-statistics&show=${encodeURIComponent(
            localShow,
          )}&year=${encodeURIComponent(selectedYear)}`,
          {
            method: "GET",
            headers: FETCH_HEADERS,
          },
        ),
      ]);

      if (!episodesResponse.ok) {
        throw new Error("Failed to fetch episodes data");
      }

      const episodesData = await episodesResponse.json();
      if (episodesData.success) {
        setEpisodes(episodesData.data);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStatistics(statsData.data);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  }, [localShow, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const search = searchParams.get("year");
    if (search && search !== selectedYear) {
      setSelectedYear(search);
    }
  }, [searchParams, selectedYear]);

  const statisticsData = statistics
    ? {
        totalEpisodes: statistics.total_episodes,
        totalAppearances: statistics.total_appearances,
        episodesWithPoliticians: statistics.episodes_with_politicians,
        averagePoliticiansPerEpisode:
          statistics.average_politicians_per_episode.toString(),
        maxPoliticiansInEpisode: statistics.max_politicians_in_episode,
      }
    : {
        // Fallback auf die lokalen Episoden-Daten falls Statistiken noch nicht geladen
        totalEpisodes: episodes.length,
        totalAppearances: episodes.reduce(
          (sum, ep) => sum + ep.politician_count,
          0,
        ),
        episodesWithPoliticians: episodes.filter(
          (ep) => ep.politician_count > 0,
        ).length,
        averagePoliticiansPerEpisode:
          episodes.length > 0
            ? (
                episodes.reduce((sum, ep) => sum + ep.politician_count, 0) /
                episodes.length
              ).toFixed(1)
            : "0",
        maxPoliticiansInEpisode:
          episodes.length > 0
            ? Math.max(...episodes.map((ep) => ep.politician_count))
            : 0,
      };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📺 Sendungsübersicht
        </h1>
        <p className="text-gray-600 mb-4">
          Chronologische Übersicht aller Sendungen mit Politik-Gästen
        </p>

        <div className="flex flex-col md:flex-row md:justify-between gap-4 md:gap-0">
          {/* Show Auswahl */}
          <ShowOptionsButtons
            selectedShow={localShow}
            onShowChange={handleShowChange}
            withAll={false}
          />

          {/* Jahr Auswahl */}
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

        {/* Show-spezifische Überschrift */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-800">
            📊 Aktuelle Ansicht: {localShow}
          </h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      <div className="relative">
        {loading && <LoadingOverlay />}

        {/* Statistiken */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          <ColorBox
            color="blue"
            number={statisticsData.totalEpisodes}
            text="Gesamt-Sendungen"
          />
          <ColorBox
            color="red"
            number={statisticsData.totalAppearances}
            text="Politiker-Auftritte"
          />
          <ColorBox
            color="green"
            number={statisticsData.episodesWithPoliticians}
            text="Mit Politik-Gästen"
          />
          <ColorBox
            color="purple"
            number={statisticsData.averagePoliticiansPerEpisode}
            text="Politiker pro Sendung"
            withSymbol
          />
          <ColorBox
            color="orange"
            number={statisticsData.maxPoliticiansInEpisode}
            text="Max. Politiker/Sendung"
          />
        </div>

        {/* Sendungsliste */}
        <LastShowTable episodes={episodes} />
      </div>
    </div>
  );
}
