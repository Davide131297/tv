"use client";

import PoliticianTable from "../components/PoliticianTable";

export default function PoliticiansPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Politiker-Übersicht
        </h1>
        <p className="text-gray-600">
          Detaillierte Übersicht aller Politiker mit ihren Auftritten in
          deutschen TV-Talkshows
        </p>
      </div>

      <PoliticianTable />
    </div>
  );
}
