import PoliticalAreasPageContent from "@/components/PoliticalAreasPageContent";
import { Suspense } from "react";
import { ChartSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getPoliticalAreas } from "@/lib/politics-data";

export const metadata: Metadata = {
  title: "Politische Themen",
  description:
    "Analyse der diskutierten politischen Themen in deutschen Talkshows. Welche Themen dominieren bei Lanz, Illner und Co?",
  openGraph: {
    title: "Politische Themen | Polittalk-Watcher",
    description:
      "Themenanalyse: Welche politischen Bereiche werden in Talkshows am häufigsten besprochen?",
  },
};

export default async function PoliticalAreasPage({
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
      <PoliticalAreasDataWrapper show={show} year={year} tv_channel={tv_channel} />
    </Suspense>
  );
}

async function PoliticalAreasDataWrapper({ 
  show, 
  year, 
  tv_channel 
}: { 
  show: string; 
  year: string; 
  tv_channel?: string 
}) {
  const { stats, rows } = await getPoliticalAreas({ show, year, tv_channel });
  
  return (
    <PoliticalAreasPageContent 
      initialStats={stats} 
      initialRows={rows}
      initialShow={show} 
      initialYear={year}
      initialChannel={tv_channel}
    />
  );
}
