import SendungenPageContent from "@/components/SendungenPageContent";
import EpisodeFilters from "@/components/EpisodeFilters";
import { Suspense } from "react";
import { StatsAndTableSkeleton } from "@/components/ui/page-skeletons";
import type { Metadata } from "next";
import { getEpisodesWithPoliticians, getEpisodeStatistics } from "@/lib/politics-data";

export const metadata: Metadata = {
  title: "Sendungen",
  description:
    "Chronologische Übersicht aller Sendungen mit Politik-Gästen. Alle Episoden von Markus Lanz, Maybrit Illner, Caren Miosga und mehr.",
  openGraph: {
    title: "Sendungen | Polittalk-Watcher",
    description:
      "Komplettes Archiv aller Polit-Talkshow-Sendungen mit Gästelisten.",
  },
};

export default async function EpisodesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "Markus Lanz";
  const year = typeof params.year === "string" ? params.year : String(new Date().getFullYear());

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📺 Sendungsübersicht
        </h1>
        <p className="text-gray-600 mb-4">
          Chronologische Übersicht aller Sendungen mit Politik-Gästen
        </p>

        <EpisodeFilters initialShow={show} initialYear={year} />
      </div>

      <Suspense key={`${show}-${year}`} fallback={<StatsAndTableSkeleton />}>
        <EpisodesDataWrapper show={show} year={year} />
      </Suspense>
    </div>
  );
}

async function EpisodesDataWrapper({ 
  show, 
  year 
}: { 
  show: string; 
  year: string; 
}) {
  const [episodes, stats] = await Promise.all([
    getEpisodesWithPoliticians({ show, year, limit: 100 }),
    getEpisodeStatistics({ show, year })
  ]);
  
  return (
    <SendungenPageContent 
      initialEpisodes={episodes} 
      initialStats={stats}
      initialShow={show} 
      initialYear={year}
    />
  );
}
