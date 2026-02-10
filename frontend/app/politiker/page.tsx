import PoliticianTable from "@/components/PoliticianTable";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politiker",
  description:
    "Detaillierte Übersicht aller Politiker mit ihren Auftritten in deutschen TV-Talkshows. Statistiken zu Häufigkeit und Sendungen.",
  openGraph: {
    title: "Politiker-Übersicht | Polittalk-Watcher",
    description:
      "Alle Politiker und ihre Auftritte bei Lanz, Illner, Maischberger, Miosga.",
  },
};

export default function PoliticiansPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📋 Politiker-Übersicht
        </h1>
        <p className="text-gray-600">
          Detaillierte Übersicht aller Politiker mit ihren Auftritten in
          deutschen TV-Talkshows
        </p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <PoliticianTable />
      </Suspense>
    </div>
  );
}
