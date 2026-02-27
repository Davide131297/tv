"use client";

import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import PartyTimelineChart from "@/components/PartyTimelineChart";
import ShowOptionsButtons from "@/components/ShowOptionsButtons";
import { useYearList } from "@/hooks/useYearList";
import { useSearchParams } from "next/navigation";

interface MonthlyPartyStats {
  month: string;
  [party: string]: string | number;
}

interface PartyTimelinePageContentProps {
  initialData: MonthlyPartyStats[];
  initialParties: string[];
  initialShow: string;
  initialYear: string;
  initialChannel?: string;
}

export default function PartyTimelinePageContent({
  initialData,
  initialParties,
  initialShow,
  initialYear,
  initialChannel,
}: PartyTimelinePageContentProps) {
  const searchParams = useSearchParams();
  const updateUrl = useUrlUpdater();
  const years = useYearList(2024);

  const unionMode = searchParams.get("union") === "true";
  const selectedParties = searchParams.get("parteien")?.split(",") || [];

  const handleShowChange = (show: string) => {
    updateUrl({ show });
  };

  const handleYearChange = (year: string) => {
    updateUrl({ year });
  };

  const handleUnionModeChange = (union: boolean) => {
    updateUrl({ union });
  };

  const handleSelectedPartiesChange = (parties: string[]) => {
    updateUrl({ parteien: parties });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Zeitverlauf Parteien</h1>
        <p className="text-muted-foreground">
          Monatliche Entwicklung der Partei-Auftritte über das Jahr
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Show auswählen:
          </label>
          <ShowOptionsButtons
            onShowChange={handleShowChange}
            selectedShow={initialShow}
            selectedChannel={initialChannel}
          />
        </div>
      </div>

      <div className="relative">
        <PartyTimelineChart
          data={initialData}
          parties={initialParties}
          selectedShow={initialShow}
          year={initialYear}
          unionMode={unionMode}
          selectedParties={selectedParties}
          onUnionModeChange={handleUnionModeChange}
          onSelectedPartiesChange={handleSelectedPartiesChange}
          selectedYear={initialYear}
          handleYearChange={handleYearChange}
          years={years}
        />

        {initialData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center py-12 text-muted-foreground">
              Keine Daten für das ausgewählte Jahr verfügbar.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
