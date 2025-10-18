"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PoliticalAreasChart from "@/components/PoliticalAreasChart";
import { Button } from "@/components/ui/button";
import type { PoliticalAreaStats } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import { FETCH_HEADERS } from "@/lib/utils";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";

export default function PoliticalAreasPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [politicalAreaStats, setPoliticalAreaStats] = useState<
    PoliticalAreaStats[]
  >([]);
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

  const updateUrlParams = useCallback(
    (updates: { show?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.show !== undefined) {
        if (updates.show === "all") {
          params.delete("show");
        } else {
          params.set("show", updates.show);
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/political-areas"
          : `/api/political-areas?show=${encodeURIComponent(selectedShow)}`;

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏛️ Politische Themenbereiche
        </h1>
        <p className="text-gray-600 mb-4">
          Verteilung der politischen Themen in deutschen TV-Talkshows
        </p>

        <div className="mx-auto bg-red-300 text-red-600 rounded-lg p-4 mb-4">
          <strong>Achtung:</strong> Diese Seite ist noch experimentell. Die
          Datenqualität wird in Zukunft verbessert es können einige Sendungen in
          der Bewertung fehlen.
        </div>

        {/* Show Auswahl */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {SHOW_OPTIONS.map((option) => {
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
      </div>

      <PoliticalAreasChart
        data={politicalAreaStats}
        selectedShow={selectedShow}
      />

      {/* Themen-Details Tabelle */}
      {politicalAreaStats.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Detaillierte Aufschlüsselung
            </h2>
          </div>

          {/* Mobile Card Layout */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {politicalAreaStats
                .sort((a, b) => b.count - a.count)
                .map((area) => {
                  const totalEpisodes = politicalAreaStats.reduce(
                    (sum, a) => sum + a.count,
                    0
                  );
                  const percentage = (
                    (area.count / totalEpisodes) *
                    100
                  ).toFixed(1);

                  return (
                    <div key={area.area_id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900">
                          {area.area_label}
                        </span>
                        <span className="text-sm text-gray-900 font-semibold">
                          {area.count}
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
                    Themenbereich
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Episoden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anteil
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {politicalAreaStats
                  .sort((a, b) => b.count - a.count)
                  .map((area, index) => {
                    const totalEpisodes = politicalAreaStats.reduce(
                      (sum, a) => sum + a.count,
                      0
                    );
                    const percentage = (
                      (area.count / totalEpisodes) *
                      100
                    ).toFixed(1);

                    return (
                      <tr
                        key={area.area_id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {area.area_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {area.count}
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
