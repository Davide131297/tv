import PartiesPageContent from "@/components/PartiesPageContent";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getPartyStats } from "@/lib/politics-data";

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

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";
  const year = typeof params.year === "string" ? params.year : String(new Date().getFullYear());
  const tv_channel = typeof params.tv_channel === "string" ? params.tv_channel : undefined;

  return (
    <Suspense key={`${show}-${year}-${tv_channel}`} fallback={<ChartSkeleton />}>
      <PartiesDataWrapper show={show} year={year} tv_channel={tv_channel} />
    </Suspense>
  );
}

async function PartiesDataWrapper({ 
  show, 
  year, 
  tv_channel 
}: { 
  show: string; 
  year: string; 
  tv_channel?: string 
}) {
  const partyStats = await getPartyStats({ show, year, tv_channel });
  
  return (
    <PartiesPageContent 
      initialData={partyStats} 
      initialShow={show} 
      initialYear={year}
      initialChannel={tv_channel}
    />
  );
}
