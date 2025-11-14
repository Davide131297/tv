"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PartyChart from "@/components/PartyChart";
import type { PartyStats } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "./ShowOptionsButtons";
import { TV_CHANNEL } from "@/lib/utils";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { useYearList } from "@/hooks/useYearList";
import { useSelectedShow } from "@/hooks/useSelectedShow";
import { useSelectedChannel } from "@/hooks/useSelectedChannel";

export default function PartiesPageContent() {
  const searchParams = useSearchParams();
  const [partyStats, setPartyStats] = useState<PartyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const years = useYearList(2024);
  const selectedShow = useSelectedShow(searchParams, SHOW_OPTIONS);
  const selectedChannel = useSelectedChannel(searchParams, TV_CHANNEL);
  const updateUrl = useUrlUpdater();

  const unionMode = useMemo(() => {
    return searchParams.get("union") === "true";
  }, [searchParams]);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue });
  };

  const handleUnionModeChange = (unionValue: boolean) => {
    updateUrl({ union: unionValue });
  };

  const handleYearChange = (yearValue: string) => {
    setSelectedYear(yearValue);
    updateUrl({ year: yearValue });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

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

      const url = `/api/politics?type=party-stats&${queryString}`;

      const response = await fetch(url, {
        method: "GET",
        headers: FETCH_HEADERS,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      if (data.success) {
        setPartyStats(data.data);
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
    const search = searchParams.get("year");
    if (search && search !== selectedYear) {
      setSelectedYear(search);
    }
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

  // Hilfsfunktion: CDU & CSU zu Union zusammenfassen
  const getUnionStats = (stats: PartyStats[]) => {
    if (!unionMode) return stats;
    let unionCount = 0;
    const filtered = stats.filter((p) => {
      if (p.party_name === "CDU" || p.party_name === "CSU") {
        unionCount += p.count;
        return false;
      }
      return true;
    });
    if (unionCount > 0) {
      filtered.push({ party_name: "Union", count: unionCount });
    }
    return filtered;
  };

  const displayedStats = getUnionStats(partyStats);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Partei-Statistiken
        </h1>
        <p className="text-gray-600 mb-4">
          Verteilung der Politiker-Auftritte nach Parteien in deutschen
          TV-Talkshows
        </p>

        {/* Show Auswahl */}
        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={selectedShow}
          selectedChannel={selectedChannel}
        />
      </div>

      <PartyChart
        data={displayedStats}
        selectedShow={selectedShow}
        selectedYear={selectedYear}
        years={years}
        handleYearChange={handleYearChange}
        unionMode={unionMode}
        onUnionChange={handleUnionModeChange}
      />

      {/* Partei-Details Tabelle */}
      {displayedStats.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Detaillierte Aufschlüsselung
            </h2>
          </div>

          {/* Mobile Card Layout */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {displayedStats
                .sort((a, b) => b.count - a.count)
                .map((party) => {
                  const totalAppearances = displayedStats.reduce(
                    (sum, p) => sum + p.count,
                    0
                  );
                  const percentage = (
                    (party.count / totalAppearances) *
                    100
                  ).toFixed(1);

                  return (
                    <div key={party.party_name} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">
                          {party.party_name}
                        </span>
                        <span className="text-sm text-gray-900 font-semibold">
                          {party.count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Anteil: {percentage}%
                      </div>
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
                    Partei
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auftritte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anteil
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedStats
                  .sort((a, b) => b.count - a.count)
                  .map((party, index) => {
                    const totalAppearances = displayedStats.reduce(
                      (sum, p) => sum + p.count,
                      0
                    );
                    const percentage = (
                      (party.count / totalAppearances) *
                      100
                    ).toFixed(1);

                    return (
                      <tr
                        key={party.party_name}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {party.party_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {party.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
