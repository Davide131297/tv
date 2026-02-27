"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import PoliticalAreasChart from "@/components/PoliticalAreasChart";
import type { PoliticalAreaStats, PoliticalAreaEpisodeRow } from "@/types";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import PoliticalAreasTable from "./PoliticalAreasTable";
import { useYearList } from "@/hooks/useYearList";
import TopicPartyHeatmap from "@/components/TopicPartyHeatmap";
import PartyDominanceChart from "@/components/PartyDominanceChart";

interface PoliticalAreasPageContentProps {
  initialStats: PoliticalAreaStats[];
  initialRows: PoliticalAreaEpisodeRow[];
  initialShow: string;
  initialYear: string;
  initialChannel?: string;
}

export default function PoliticalAreasPageContent({
  initialStats,
  initialRows,
  initialShow,
  initialYear,
  initialChannel,
}: PoliticalAreasPageContentProps) {
  const updateUrl = useUrlUpdater();
  const years = useYearList(2024);

  const handleShowChange = (showValue: string) => {
    updateUrl({ show: showValue });
  };

  const handleYearChange = (yearValue: string) => {
    updateUrl({ year: yearValue });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏛️ Politische Themenbereiche
        </h1>
        <p className="text-gray-600 mb-4">
          Verteilung der politischen Themen in deutschen TV-Talkshows
        </p>

        <ShowOptionsButtons
          onShowChange={handleShowChange}
          selectedShow={initialShow}
          selectedChannel={initialChannel}
        />
      </div>

      {initialShow === "Pinar Atalay" ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          Die Darstellung der politischen Themenbereiche für die Show{" "}
          <strong>Pinar Atalay</strong> ist derzeit nicht verfügbar.
        </div>
      ) : (
        <div className="relative">
          <PoliticalAreasChart
            data={initialStats}
            rows={initialRows}
            selectedShow={initialShow}
            selectedYear={initialYear}
            years={years}
            handleYearChange={handleYearChange}
          />

          {/* Themen-Details Tabelle */}
          <PoliticalAreasTable politicalAreaStats={initialStats} />

          {/* Themen-Partei Matrix */}
          <TopicPartyHeatmap
            selectedShow={initialShow}
            selectedYear={initialYear}
          />

          {/* Partei-Dominanz Analyse */}
          <PartyDominanceChart
            selectedShow={initialShow}
            selectedYear={initialYear}
          />
        </div>
      )}
    </div>
  );
}
