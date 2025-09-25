"use client";

import { useState, useEffect } from "react";

interface SummaryData {
  total_appearances: number;
  total_episodes: number;
  unique_politicians: number;
  parties_represented: number;
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/politics?type=summary");

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
  };

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
        <p className="text-gray-600">
          Übersicht über alle Politiker-Auftritte in der Markus Lanz Sendung
        </p>
      </div>

      {summary && (
        <>
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

          {/* Aktualisieren Button */}
          <div className="mt-8 text-center">
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? "Laden..." : "Daten aktualisieren"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
