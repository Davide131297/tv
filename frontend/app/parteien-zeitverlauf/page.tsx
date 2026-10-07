import PartyTimelinePageContent from "@/components/PartyTimelinePageContent";
import { Suspense } from "react";
import { periodFromSearchParams } from "@/utils/dateRange";
import { ChartSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getPartyTimeline } from "@/lib/politics-data";

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

export default async function PartyTimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";
  const year = periodFromSearchParams(params);
  const tv_channel = typeof params.tv_channel === "string" ? params.tv_channel : undefined;

  return (
    <Suspense key={`${show}-${year}-${tv_channel}`} fallback={<ChartSkeleton />}>
      <PartyTimelineDataWrapper show={show} year={year} tv_channel={tv_channel} />
    </Suspense>
  );
}

async function PartyTimelineDataWrapper({ 
  show, 
  year, 
  tv_channel 
}: { 
  show: string; 
  year: string; 
  tv_channel?: string 
}) {
  const { data, parties } = await getPartyTimeline({ show, year, tv_channel });
  
  return (
    <PartyTimelinePageContent 
      initialData={data} 
      initialParties={parties}
      initialShow={show} 
      initialYear={year}
      initialChannel={tv_channel}
    />
  );
}
