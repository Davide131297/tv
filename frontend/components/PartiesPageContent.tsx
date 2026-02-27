"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import PartyChart from "@/components/PartyChart";
import type { PartyStats } from "@/types";
import ShowOptionsButtons from "./ShowOptionsButtons";
import { useYearList } from "@/hooks/useYearList";
import { useSearchParams } from "next/navigation";

interface PartiesPageContentProps {
  initialData: PartyStats[];
  initialShow: string;
  initialYear: string;
  initialChannel?: string;
}

export default function PartiesPageContent({
  initialData,
  initialShow,
  initialYear,
  initialChannel,
}: PartiesPageContentProps) {
  const searchParams = useSearchParams();
  const updateUrl = useUrlUpdater();
  const years = useYearList(2024);

  const unionMode = searchParams.get("union") === "true";

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue });
  };

  const handleUnionModeChange = (unionValue: boolean) => {
    updateUrl({ union: unionValue });
  };

  const handleYearChange = (yearValue: string) => {
    updateUrl({ year: yearValue });
  };

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

  const displayedStats = getUnionStats(initialData);
  const totalAppearances = displayedStats.reduce((sum, p) => sum + p.count, 0);

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

        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={initialShow}
          selectedChannel={initialChannel}
        />
      </div>

      <div className="relative">
        <PartyChart
          data={displayedStats}
          selectedShow={initialShow}
          selectedYear={initialYear}
          years={years}
          handleYearChange={handleYearChange}
          unionMode={unionMode}
          onUnionChange={handleUnionModeChange}
        />
      </div>

      {displayedStats.length > 0 && (
        <div
          className="mt-8 bg-white rounded-lg shadow-md overflow-hidden relative"
          id="aufschluesselung"
        >
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Detaillierte Aufschlüsselung
            </h2>
          </div>

          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {displayedStats
                .sort((a, b) => b.count - a.count)
                .map((party) => {
                  const percentage = totalAppearances > 0 ? (
                    (party.count / totalAppearances) *
                    100
                  ).toFixed(1) : "0";

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
                    const percentage = totalAppearances > 0 ? (
                      (party.count / totalAppearances) *
                      100
                    ).toFixed(1) : "0";

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
