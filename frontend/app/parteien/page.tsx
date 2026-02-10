import PartiesPageContent from "@/components/PartiesPageContent";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parteien",
  description:
    "Interaktive Charts zur Verteilung der Politiker nach Parteien in deutschen TV-Talkshows. CDU, SPD, Grüne, FDP, AfD und mehr im Vergleich.",
  openGraph: {
    title: "Parteien-Statistiken | Polittalk-Watcher",
    description:
      "Analyse der Parteienverteilung in deutschen Polit-Talkshows wie Lanz, Illner und Maischberger.",
  },
};

export default function PartiesPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <PartiesPageContent />
    </Suspense>
  );
}
