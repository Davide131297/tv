import PoliticianRankings from "@/components/PoliticianRankings";
import RankingsFilters from "@/components/RankingsFilters";
import type { Metadata } from "next";
import { Suspense } from "react";
import { RankingsOnlySkeleton } from "@/components/ui/page-skeletons";
import { getPoliticianRankings } from "@/lib/politics-data";

export const metadata: Metadata = {
  title: "Politiker-Rankings",
  description:
    "Rankings der häufigsten Talkshow-Gäste. Welche Politiker waren am öftesten bei Lanz, Illner, Maischberger und Co?",
  openGraph: {
    title: "Politiker-Rankings | Polittalk-Watcher",
    description:
      "Top-Listen: Die meistgeladenen Politiker in deutschen Polit-Talkshows.",
  },
};

export default async function PoliticianRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";
  const year = typeof params.year === "string" ? params.year : String(new Date().getFullYear());

  return (
    <div className="container mx-auto py-8 px-4">
      <RankingsFilters initialShow={show} initialYear={year} />
      
      <Suspense key={`${show}-${year}`} fallback={<RankingsOnlySkeleton />}>
        <RankingsDataWrapper show={show} year={year} />
      </Suspense>
    </div>
  );
}

async function RankingsDataWrapper({ 
  show, 
  year 
}: { 
  show: string; 
  year: string; 
}) {
  const rankings = await getPoliticianRankings({ show, year, limit: 50 });
  
  return (
    <>
      {/* This hack updates the count in the filters if we wanted to, 
          but for now let's just render the list */}
      <PoliticianRankings 
        initialData={rankings} 
      />
    </>
  );
}
