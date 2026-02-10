import { Suspense } from "react";
import OverviewPageContent from "@/components/OverviewPageContent";
import { OverviewSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Übersicht",
  description:
    "Gesamtstatistiken und Durchschnittswerte aller Politik-Auftritte in deutschen TV-Talkshows. Zahlen, Daten, Fakten auf einen Blick.",
  openGraph: {
    title: "Statistik-Übersicht | Polittalk-Watcher",
    description:
      "Dashboard mit allen wichtigen Kennzahlen zu Politiker-Auftritten in Talkshows.",
  },
};

export default function OverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewPageContent />
    </Suspense>
  );
}
