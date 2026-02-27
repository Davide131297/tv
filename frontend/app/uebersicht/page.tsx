import { Suspense } from "react";
import OverviewPageContent from "@/components/OverviewPageContent";
import OverviewFilters from "@/components/OverviewFilters";
import { OverviewOnlySkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getSummaryStats } from "@/lib/politics-data";

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

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";
  const year = typeof params.year === "string" ? params.year : String(new Date().getFullYear());
  const tv_channel = typeof params.tv_channel === "string" ? params.tv_channel : undefined;

  return (
    <div className="container mx-auto py-8 px-4">
      <OverviewFilters initialShow={show} initialYear={year} />

      <Suspense key={`${show}-${year}-${tv_channel}`} fallback={<OverviewOnlySkeleton />}>
        <OverviewDataWrapper show={show} year={year} tv_channel={tv_channel} />
      </Suspense>
    </div>
  );
}

async function OverviewDataWrapper({ 
  show, 
  year, 
  tv_channel 
}: { 
  show: string; 
  year: string; 
  tv_channel?: string 
}) {
  const summary = await getSummaryStats({ show, year, tv_channel });
  
  return (
    <OverviewPageContent 
      initialData={summary} 
      initialShow={show} 
    />
  );
}
