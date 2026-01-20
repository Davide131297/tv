"use client";

import { useState, useEffect } from "react";
import { FETCH_HEADERS, cn } from "@/lib/utils";

interface TopicPartyHeatmapProps {
  selectedShow: string;
  selectedYear: string;
}

interface MatrixData {
  topics: { id: number; label: string }[];
  parties: string[];
  matrix: { party: string; topicId: number; count: number }[];
}

export default function TopicPartyHeatmap({
  selectedShow,
  selectedYear,
}: TopicPartyHeatmapProps) {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatrix() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("type", "topic-party-matrix");
        if (selectedShow && selectedShow !== "all") {
          params.append("show", selectedShow);
        }
        if (selectedYear && selectedYear !== "all") {
          params.append("year", selectedYear);
        }

        const res = await fetch(`/api/politics?${params.toString()}`, {
          headers: FETCH_HEADERS,
        });

        if (!res.ok) throw new Error("Fehler beim Laden der Matrix-Daten");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
        setError("Konnte Themen-Matrix nicht laden.");
      } finally {
        setLoading(false);
      }
    }

    fetchMatrix();
  }, [selectedShow, selectedYear]);

  if (loading)
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2 animate-pulse">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">Lade Themen-Matrix...</span>
      </div>
    );
  if (error)
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
        {error}
      </div>
    );
  if (!data || data.parties.length === 0)
    return (
      <div className="text-gray-500 italic text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Keine Daten für diese Auswahl verfügbar.
      </div>
    );

  const maxCount = Math.max(...data.matrix.map((d) => d.count), 1);

  const getCount = (party: string, topicId: number) => {
    return (
      data.matrix.find((d) => d.party === party && d.topicId === topicId)
        ?.count || 0
    );
  };

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-gray-50 text-gray-300";
    const ratio = count / maxCount;
    // Modern Indigo Palette
    if (ratio < 0.2) return "bg-indigo-100 text-indigo-900";
    if (ratio < 0.4) return "bg-indigo-300 text-indigo-900";
    if (ratio < 0.6) return "bg-indigo-500 text-white shadow-sm";
    if (ratio < 0.8) return "bg-indigo-600 text-white shadow-md";
    return "bg-indigo-800 text-white shadow-lg font-bold";
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mt-8 flex flex-col"
      id="themen-partei-matrix"
    >
      <div className="p-4 md:p-6 border-b border-gray-100 bg-linear-to-r from-white to-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Themen-Partei Matrix
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Visualisierung der Gesprächshäufigkeit: Wer spricht wie oft über
          welches Thema?
        </p>
      </div>

      <div className="relative overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="bg-gray-50/95 backdrop-blur z-20 sticky top-0">
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[160px] md:min-w-[200px] border-b border-r border-gray-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                Themenbereich
              </th>
              {data.parties.map((party) => (
                <th
                  key={party}
                  className="px-2 py-3 text-center font-semibold text-gray-800 min-w-[80px] border-b border-gray-200"
                >
                  <div className="truncate w-full px-1" title={party}>
                    {party}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.topics.map((topic) => (
              <tr
                key={topic.id}
                className="group hover:bg-gray-50/50 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 px-4 py-3 text-gray-700 font-medium text-xs md:text-sm border-r border-gray-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                  <span className="line-clamp-2">{topic.label}</span>
                </td>
                {data.parties.map((party) => {
                  const count = getCount(party, topic.id);
                  return (
                    <td key={party} className="p-1.5 md:p-2">
                      <div
                        className={cn(
                          "h-10 md:h-12 w-full flex items-center justify-center rounded-lg transition-transform hover:scale-105 duration-200 cursor-default",
                          getIntensityClass(count),
                        )}
                        title={`${party}: ${count} mal zu "${topic.label}"`}
                      >
                        {count > 0 ? (
                          <span className="text-xs md:text-sm font-variant-numeric tabular-nums">
                            {count}
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-30">•</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend / Footer */}
      <div className="p-4 md:px-6 md:py-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <span>Häufigkeit:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-indigo-100"></div>
            <div className="w-3 h-3 rounded bg-indigo-300"></div>
            <div className="w-3 h-3 rounded bg-indigo-500"></div>
            <div className="w-3 h-3 rounded bg-indigo-800"></div>
          </div>
          <span className="ml-1">(Niedrig → Hoch)</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400">
          Daten basieren anhand der Episodenbeschreibung und automatisierter
          zuordnung mit Künstlicher Intelligenz
        </div>
      </div>
    </div>
  );
}
