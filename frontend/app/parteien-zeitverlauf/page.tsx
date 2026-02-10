import PartyTimelinePageContent from "@/components/PartyTimelinePageContent";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zeitverlauf Parteien",
  description:
    "Monatliche Entwicklung der Partei-Auftritte über das Jahr. Trends und Veränderungen in der Talkshow-Präsenz.",
  openGraph: {
    title: "Parteien-Zeitverlauf | Polittalk-Watcher",
    description:
      "Zeitliche Analyse: Wie entwickelt sich die Parteien-Präsenz in Talkshows?",
  },
};

export default function PartyTimelinePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <PartyTimelinePageContent />
    </Suspense>
  );
}
