"use client";

import { useState, useEffect, useCallback } from "react";
import PartyChart from "@/components/PartyChart";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface PartyStats {
  party_name: string;
  count: number;
}

interface ShowOption {
  value: string;
  label: string;
}

export default function PartiesPage() {
  const [partyStats, setPartyStats] = useState<PartyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>("all");
  const [unionMode, setUnionMode] = useState(false);

  const showOptions: ShowOption[] = [
    { value: "all", label: "Alle Shows" },
    { value: "Markus Lanz", label: "Markus Lanz" },
    { value: "Maybrit Illner", label: "Maybrit Illner" },
    { value: "Caren Miosga", label: "Caren Miosga" },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=party-stats"
          : `/api/politics?type=party-stats&show=${encodeURIComponent(
              selectedShow
            )}`;

      const response = await fetch(url);

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Partei-Statistiken
        </h1>
        <p className="text-gray-600 mb-4">
          Verteilung der Politiker-Auftritte nach Parteien in deutschen
          TV-Talkshows
        </p>

        {/* Show Auswahl */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
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
          <div className="flex items-center gap-2 ml-6">
            <Switch
              id="union-switch"
              checked={unionMode}
              onCheckedChange={setUnionMode}
            />
            <label
              htmlFor="union-switch"
              className="text-sm select-none cursor-pointer"
            >
              CDU & CSU als Union zusammenfassen
            </label>
          </div>
        </div>
      </div>

      <PartyChart data={displayedStats} selectedShow={selectedShow} />

      {/* Partei-Details Tabelle */}
      {displayedStats.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Detaillierte Aufschlüsselung
            </h2>
          </div>
          <div className="overflow-x-auto">
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
