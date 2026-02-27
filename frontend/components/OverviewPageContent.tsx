"use client";

import type { SummaryData } from "@/types";
import { SHOW_OPTIONS } from "@/types";
import ColorBox from "./ui/color-box";

interface OverviewPageContentProps {
  initialData: SummaryData;
  initialShow: string;
}

function OverviewPageContent({ 
  initialData, 
  initialShow, 
}: OverviewPageContentProps) {
  return (
    <div className="animate-in fade-in duration-300">
      {initialData && (
        <>
          {/* Show-spezifische Überschrift */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              📊 Statistiken für:{" "}
              {initialData.show_name ||
                SHOW_OPTIONS.find((opt) => opt.value === initialShow)?.label}
            </h2>
          </div>

          {/* Hauptstatistiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ColorBox
              color="blue"
              number={initialData.total_appearances}
              text="Gesamt-Auftritte"
            />
            <ColorBox
              color="green"
              number={initialData.total_episodes}
              text="Sendungen"
            />
            <ColorBox
              color="purple"
              number={initialData.unique_politicians}
              text="Verschiedene Politiker"
            />
            <ColorBox
              color="orange"
              number={initialData.parties_represented}
              text="Vertretene Parteien"
            />
          </div>

          {/* Durchschnittswerte */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 Durchschnittswerte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    initialData.total_appearances / initialData.total_episodes || 0
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Politiker pro Sendung
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    initialData.total_appearances / initialData.unique_politicians || 0
                  ).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">
                  Auftritte pro Politiker
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(
                    initialData.unique_politicians / initialData.parties_represented ||
                    0
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

export default OverviewPageContent;
