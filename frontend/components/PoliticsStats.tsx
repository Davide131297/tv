"use client";

import { useState, useEffect } from "react";
import PartyChart from "./PartyChart";
import PoliticianTable from "./PoliticianTable";

// Types
interface PartyStats {
  party_id: number;
  count: number;
  party_name: string;
}

interface SummaryData {
  total_appearances: number;
  total_episodes: number;
  unique_politicians: number;
  parties_represented: number;
}

interface EpisodeData {
  episode_date: string;
  politician_count: number;
}

export default function PoliticsStats() {
  const [partyStats, setPartyStats] = useState<PartyStats[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "chart" | "table" | "summary" | "episodes"
  >("chart");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Parallel API calls
      const [partyRes, summaryRes, episodesRes] = await Promise.all([
        fetch("/api/politics?type=party-stats"),
        fetch("/api/politics?type=summary"),
        fetch("/api/politics?type=episodes"),
      ]);

      if (!partyRes.ok || !summaryRes.ok || !episodesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const partyData = await partyRes.json();
      const summaryData = await summaryRes.json();
      const episodesData = await episodesRes.json();

      if (partyData.success) setPartyStats(partyData.data);
      if (summaryData.success) setSummary(summaryData.data);
      if (episodesData.success) setEpisodes(episodesData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Lade Daten...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const renderSummary = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gesamtübersicht</h2>
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">
              {summary.total_appearances}
            </div>
            <div className="text-sm text-blue-700 font-medium">
              Gesamt-Auftritte
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="text-3xl font-bold text-green-600">
              {summary.total_episodes}
            </div>
            <div className="text-sm text-green-700 font-medium">Sendungen</div>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="text-3xl font-bold text-purple-600">
              {summary.unique_politicians}
            </div>
            <div className="text-sm text-purple-700 font-medium">
              Verschiedene Politiker
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="text-3xl font-bold text-orange-600">
              {summary.parties_represented}
            </div>
            <div className="text-sm text-orange-700 font-medium">
              Vertretene Parteien
            </div>
          </div>
        </div>
      )}

      {/* Durchschnitte */}
      {summary && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Durchschnittswerte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Politiker pro Sendung: </span>
              <span className="font-semibold">
                {(summary.total_appearances / summary.total_episodes).toFixed(
                  1
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Auftritte pro Politiker: </span>
              <span className="font-semibold">
                {(
                  summary.total_appearances / summary.unique_politicians
                ).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderEpisodes = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6">Letzte Sendungen</h2>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Politiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {episodes.slice(0, 15).map((episode, index) => {
                const date = new Date(episode.episode_date).toLocaleDateString(
                  "de-DE"
                );
                return (
                  <tr
                    key={episode.episode_date}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {episode.politician_count}{" "}
                      {episode.politician_count === 1
                        ? "Politiker"
                        : "Politiker"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          episode.politician_count > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {episode.politician_count > 0
                          ? "Politik-Gäste"
                          : "Andere Gäste"}
                      </span>
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("chart")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "chart"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              📊 Partei-Chart
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "table"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              📋 Politiker-Tabelle
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "summary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              📈 Übersicht
            </button>
            <button
              onClick={() => setActiveTab("episodes")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "episodes"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              📺 Sendungen
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === "chart" && <PartyChart data={partyStats} />}
      {activeTab === "table" && <PoliticianTable />}
      {activeTab === "summary" && renderSummary()}
      {activeTab === "episodes" && renderEpisodes()}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Daten aktualisieren
        </button>
      </div>
    </div>
  );
}
