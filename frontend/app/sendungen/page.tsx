"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { EpisodeData, Statistics } from "@/types";
import { SHOW_OPTIONS_WITHOUT_ALL } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive selectedShow from URL parameters
  const selectedShow = useMemo(() => {
    const showParam = searchParams.get("show");
    if (
      showParam &&
      SHOW_OPTIONS_WITHOUT_ALL.some((option) => option.value === showParam)
    ) {
      return showParam;
    }
    return "Markus Lanz";
  }, [searchParams]);

  const handleShowChange = (showValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("show", showValue);

    const newUrl = `?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Hole Episoden-Daten
      const episodesResponse = await fetch(
        `/api/politics?type=episodes-with-politicians&show=${encodeURIComponent(
          selectedShow
        )}`,
        {
          method: "GET",
          headers: FETCH_HEADERS,
        }
      );

      if (!episodesResponse.ok) {
        throw new Error("Failed to fetch episodes data");
      }

      const episodesData = await episodesResponse.json();
      console.log("Fetched episodes data:", episodesData.data);
      if (episodesData.success) {
        setEpisodes(episodesData.data);
      }

      // Hole Statistiken separat für die gesamte Datenbank
      const statsResponse = await fetch(
        `/api/politics?type=episode-statistics&show=${encodeURIComponent(
          selectedShow
        )}`,
        {
          method: "GET",
          headers: FETCH_HEADERS,
        }
      );

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
  }, [selectedShow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          0
        ),
        episodesWithPoliticians: episodes.filter(
          (ep) => ep.politician_count > 0
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📺 Sendungsübersicht
        </h1>
        <p className="text-gray-600 mb-4">
          Chronologische Übersicht aller Sendungen mit Politik-Gästen
        </p>

        {/* Show Auswahl */}
        <div className="flex flex-wrap gap-2">
          {SHOW_OPTIONS_WITHOUT_ALL.map((option) => {
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

        {/* Show-spezifische Überschrift */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-800">
            📊 Aktuelle Ansicht: {selectedShow}
          </h2>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
            {statisticsData.totalEpisodes}
          </div>
          <div className="text-xs sm:text-sm text-blue-700 font-medium">
            Gesamt-Sendungen
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 sm:p-6 border border-red-200">
          <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
            {statisticsData.totalAppearances}
          </div>
          <div className="text-xs sm:text-sm text-red-700 font-medium">
            Politiker-Auftritte
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 sm:p-6 border border-green-200">
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-2">
            {statisticsData.episodesWithPoliticians}
          </div>
          <div className="text-xs sm:text-sm text-green-700 font-medium">
            Mit Politik-Gästen
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 sm:p-6 border border-purple-200">
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">
            ø {statisticsData.averagePoliticiansPerEpisode}
          </div>
          <div className="text-xs sm:text-sm text-purple-700 font-medium">
            Politiker pro Sendung
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 sm:p-6 border border-orange-200">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">
            {statisticsData.maxPoliticiansInEpisode}
          </div>
          <div className="text-xs sm:text-sm text-orange-700 font-medium">
            Max. Politiker/Sendung
          </div>
        </div>
      </div>

      {/* Sendungsliste */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Letzte Sendungen
          </h2>
        </div>

        {/* Mobile Card Layout */}
        <div className="block sm:hidden">
          <div className="divide-y divide-gray-200">
            {episodes.map((episode) => {
              const date = new Date(episode.episode_date);
              const formattedDate = date.toLocaleDateString("de-DE");
              const weekday = date.toLocaleDateString("de-DE", {
                weekday: "long",
              });

              return (
                <div key={episode.episode_date} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {formattedDate}
                      </div>
                      <div className="text-xs text-gray-500">{weekday}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {episode.politician_count} Politiker
                      </div>
                    </div>
                  </div>

                  {episode.politicians.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anwesende Politiker
                      </div>
                      <div className="space-y-1">
                        {episode.politicians.map((politician, idx) => (
                          <div
                            key={`${episode.episode_date}-${politician.name}-${idx}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="font-medium text-gray-900">
                              {politician.name}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {politician.party_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Keine Politik-Gäste
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anzahl
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anwesende Politiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wochentag
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {episodes.map((episode, index) => {
                const date = new Date(episode.episode_date);
                const formattedDate = date.toLocaleDateString("de-DE");
                const weekday = date.toLocaleDateString("de-DE", {
                  weekday: "long",
                });

                return (
                  <tr
                    key={episode.episode_date}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {episode.politician_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      {episode.politicians.length > 0 ? (
                        <div className="space-y-1">
                          {episode.politicians.map((politician, idx) => (
                            <div
                              key={`${episode.episode_date}-${politician.name}-${idx}`}
                              className="flex items-center space-x-2"
                            >
                              <span className="font-medium">
                                {politician.name}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {politician.party_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">
                          Keine Politik-Gäste
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {weekday}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function EpisodesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page />
    </Suspense>
  );
}
