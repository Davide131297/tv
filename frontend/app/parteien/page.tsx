"use client";

import { useState, useEffect } from "react";
import PartyChart from "../components/PartyChart";

interface PartyStats {
  party_id: number;
  count: number;
  party_name: string;
}

export default function PartiesPage() {
  const [partyStats, setPartyStats] = useState<PartyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/politics?type=party-stats");

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
          📊 Partei-Statistiken
        </h1>
        <p className="text-gray-600">
          Verteilung der Politiker-Auftritte nach Parteien in der Markus Lanz
          Sendung
        </p>
      </div>

      <PartyChart data={partyStats} />

      {/* Partei-Details Tabelle */}
      {partyStats.length > 0 && (
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
                {partyStats
                  .sort((a, b) => b.count - a.count)
                  .map((party, index) => {
                    const totalAppearances = partyStats.reduce(
                      (sum, p) => sum + p.count,
                      0
                    );
                    const percentage = (
                      (party.count / totalAppearances) *
                      100
                    ).toFixed(1);

                    return (
                      <tr
                        key={party.party_id}
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
    </div>
  );
}
