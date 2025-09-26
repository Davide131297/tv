"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface PoliticianInEpisode {
  name: string;
  party_name: string;
}

interface EpisodeData {
  episode_date: string;
  politician_count: number;
  politicians: PoliticianInEpisode[];
}

interface ShowOption {
  value: string;
  label: string;
}

interface Statistics {
  total_episodes: number;
  total_appearances: number;
  episodes_with_politicians: number;
  average_politicians_per_episode: number;
  max_politicians_in_episode: number;
}

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>("Markus Lanz");

  const showOptions: ShowOption[] = [
    { value: "Markus Lanz", label: "Markus Lanz" },
    { value: "Maybrit Illner", label: "Maybrit Illner" },
    { value: "Caren Miosga", label: "Caren Miosga" },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Hole Episoden-Daten
      const episodesResponse = await fetch(
        `/api/politics?type=episodes-with-politicians&show=${encodeURIComponent(
          selectedShow
        )}`
      );

      if (!episodesResponse.ok) {
        throw new Error("Failed to fetch episodes data");
      }

      const episodesData = await episodesResponse.json();
      if (episodesData.success) {
        setEpisodes(episodesData.data);
      }

      // Hole Statistiken separat für die gesamte Datenbank
      const statsResponse = await fetch(
        `/api/politics?type=episode-statistics&show=${encodeURIComponent(
          selectedShow
        )}`
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
          {showOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => setSelectedShow(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedShow === option.value
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Show-spezifische Überschrift */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold text-gray-800">
            📊 Aktuelle Ansicht: {selectedShow}
          </h2>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {statisticsData.totalEpisodes}
          </div>
          <div className="text-sm text-blue-700 font-medium">
            Gesamt-Sendungen
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {statisticsData.totalAppearances}
          </div>
          <div className="text-sm text-red-700 font-medium">
            Politiker-Auftritte
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {statisticsData.episodesWithPoliticians}
          </div>
          <div className="text-sm text-green-700 font-medium">
            Mit Politik-Gästen
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            ø {statisticsData.averagePoliticiansPerEpisode}
          </div>
          <div className="text-sm text-purple-700 font-medium">
            Politiker pro Sendung
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {statisticsData.maxPoliticiansInEpisode}
          </div>
          <div className="text-sm text-orange-700 font-medium">
            Max. Politiker/Sendung
          </div>
        </div>
      </div>

      {/* Sendungsliste */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Letzte Sendungen
          </h2>
        </div>
        <div className="overflow-x-auto">
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
