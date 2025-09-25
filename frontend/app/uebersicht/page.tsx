"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface SummaryData {
  total_appearances: number;
  total_episodes: number;
  unique_politicians: number;
  parties_represented: number;
  show_name?: string;
}

interface ShowOption {
  value: string;
  label: string;
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string>("all");

  const showOptions: ShowOption[] = [
    { value: "all", label: "Beide Shows" },
    { value: "Markus Lanz", label: "Markus Lanz" },
    { value: "Maybrit Illner", label: "Maybrit Illner" },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url =
        selectedShow === "all"
          ? "/api/politics?type=summary"
          : `/api/politics?type=summary&show=${encodeURIComponent(
              selectedShow
            )}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
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
  }, [selectedShow, fetchData]);

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
          Gesamtübersicht
        </h1>
        <p className="text-gray-600 mb-4">
          Übersicht über alle Politiker-Auftritte in deutschen TV-Talkshows
        </p>

        {/* Show Auswahl */}
        <div className="flex flex-wrap gap-2">
          {showOptions.map((option) => (
            <Button
              key={option.value}
              onClick={() => setSelectedShow(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedShow === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {summary && (
        <>
          {/* Show-spezifische Überschrift */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              📊 Statistiken für:{" "}
              {summary.show_name ||
                showOptions.find((opt) => opt.value === selectedShow)?.label}
            </h2>
          </div>

          {/* Hauptstatistiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {summary.total_appearances}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                Gesamt-Auftritte
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {summary.total_episodes}
              </div>
              <div className="text-sm text-green-700 font-medium">
                Sendungen
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {summary.unique_politicians}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Verschiedene Politiker
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {summary.parties_represented}
              </div>
              <div className="text-sm text-orange-700 font-medium">
                Vertretene Parteien
              </div>
            </div>
          </div>

          {/* Durchschnittswerte */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 Durchschnittswerte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(summary.total_appearances / summary.total_episodes).toFixed(
                    1
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Sendung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.total_appearances / summary.unique_politicians
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Auftritte pro Politiker
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    summary.unique_politicians / summary.parties_represented
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Partei
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
