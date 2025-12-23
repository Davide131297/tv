import PartyTimelinePageContent from "@/components/PartyTimelinePageContent";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zeitverlauf Parteien",
  description: "Monatliche Entwicklung der Partei-Auftritte über das Jahr",
};

export default function PartyTimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">Lade Daten...</div>
      }
    >
      <PartyTimelinePageContent />
    </Suspense>
  );
}
