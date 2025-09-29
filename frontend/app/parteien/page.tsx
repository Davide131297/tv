"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PartyChart from "@/components/PartyChart";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PartyStats } from "@/types";
import { SHOW_OPTIONS } from "@/types";

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [partyStats, setPartyStats] = useState<PartyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const unionMode = useMemo(() => {
    return searchParams.get("union") === "true";
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (updates: { show?: string; union?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.show !== undefined) {
        if (updates.show === "all") {
          params.delete("show");
        } else {
          params.set("show", updates.show);
        }
      }

      if (updates.union !== undefined) {
        if (updates.union) {
          params.set("union", "true");
        } else {
          params.delete("union");
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "/parteien";
      router.push(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  const handleShowChange = (showValue: string) => {
    updateUrlParams({ show: showValue });
  };

  const handleUnionModeChange = (unionValue: boolean) => {
    updateUrlParams({ union: unionValue });
  };

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
          {SHOW_OPTIONS.map((option) => {
            const getButtonColors = (
              showValue: string,
              isSelected: boolean
            ) => {
              if (!isSelected)
                return "bg-gray-100 text-gray-700 hover:bg-gray-200";

              switch (showValue) {
                case "Markus Lanz":
                  return "bg-blue-100 text-blue-800 hover:bg-blue-200";
                case "Maybrit Illner":
                  return "bg-purple-100 text-purple-800 hover:bg-purple-200";
                case "Caren Miosga":
                  return "bg-green-100 text-green-800 hover:bg-green-200";
                case "Maischberger":
                  return "bg-orange-100 text-orange-800 hover:bg-orange-200";
                default:
                  return "bg-black text-white hover:bg-gray-800 hover:text-white";
              }
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
          <div className="flex items-center gap-2 ml-6">
            <Switch
              id="union-switch"
              checked={unionMode}
              onCheckedChange={handleUnionModeChange}
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

export default function PartiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page />
    </Suspense>
  );
}
