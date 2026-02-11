"use client";

import { useState, useEffect } from "react";
import { FETCH_HEADERS, cn } from "@/lib/utils";
import { BADGE_PARTY_COLORS } from "@/types";

interface PartyDominanceProps {
  selectedShow: string;
  selectedYear: string;
}

interface PartyDominance {
  party_name: string;
  count: number;
  baseline_count: number;
  baseline_percentage: number;
  topic_percentage: number;
  dominance_score: number;
  is_overrepresented: boolean;
  is_underrepresented: boolean;
}

interface TopicDominance {
  id: number;
  label: string;
  parties: PartyDominance[];
}

interface DominanceData {
  topics: TopicDominance[];
  metadata: {
    total_appearances: number;
    total_parties: number;
    show_filter: string;
    year_filter: string;
  };
}

export default function PartyDominanceChart({
  selectedShow,
  selectedYear,
}: PartyDominanceProps) {
  const [data, setData] = useState<DominanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDominance() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("type", "topic-party-dominance");
        if (selectedShow && selectedShow !== "all") {
          params.append("show", selectedShow);
        }
        if (selectedYear && selectedYear !== "all") {
          params.append("year", selectedYear);
        }

        const res = await fetch(`/api/politics?${params.toString()}`, {
          headers: FETCH_HEADERS,
        });

        if (!res.ok) throw new Error("Fehler beim Laden der Dominanz-Daten");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
        setError("Konnte Partei-Dominanz nicht laden.");
      } finally {
        setLoading(false);
      }
    }

    fetchDominance();
  }, [selectedShow, selectedYear]);

  if (loading)
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2 animate-pulse">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">Lade Dominanz-Analyse...</span>
      </div>
    );

  if (error)
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
        {error}
      </div>
    );

  if (!data || data.topics.length === 0)
    return (
      <div className="text-gray-500 italic text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        Keine Daten für diese Auswahl verfügbar.
      </div>
    );

  return (
    <div
      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mt-8"
      id="partei-dominanz"
    >
      <div className="p-4 md:p-6 border-b border-gray-100 bg-linear-to-r from-white to-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          🎯 Themen-Dominanz pro Partei
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          Welche Parteien sind bei welchen Themen am häufigsten vertreten?
          Sortiert nach Anzahl der Auftritte pro Themenbereich.
        </p>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {data.topics.map((topic) => (
          <div
            key={topic.id}
            className="border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {topic.label}
              </h3>
            </div>
            <div className="p-4 space-y-2.5">
              {topic.parties.slice(0, 5).map((party) => (
                <div
                  key={party.party_name}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border whitespace-nowrap font-medium",
                        BADGE_PARTY_COLORS[party.party_name] ??
                          BADGE_PARTY_COLORS["Unbekannt"],
                      )}
                    >
                      {party.party_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {party.count}
                    </span>
                    <span className="text-xs text-gray-400">
                      {party.count === 1 ? "Auftritt" : "Auftritte"}
                    </span>
                  </div>
                </div>
              ))}
              {topic.parties.length > 5 && (
                <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                  +{topic.parties.length - 5} weitere Parteien
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 md:px-6 md:py-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500">
        <div className="text-[10px] uppercase tracking-wider text-gray-400">
          Sortiert nach Häufigkeit der Auftritte pro Themenbereich
        </div>
      </div>
    </div>
  );
}
