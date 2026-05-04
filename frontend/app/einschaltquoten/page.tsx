import type { Metadata } from "next";
import TvRatingsPageContent from "@/components/TvRatingsPageContent";
import { getTvRatingsDashboardData } from "@/lib/politics-data";

export const metadata: Metadata = {
  title: "Einschaltquoten",
  description:
    "Übersicht aller gespeicherten TV-Einschaltquoten inklusive Analyse nach Politikern und Parteien.",
  openGraph: {
    title: "Einschaltquoten | Polittalk-Watcher",
    description:
      "Gespeicherte TV-Quoten mit Ranking der Politiker und Parteien nach kumulierten Zuschauerzahlen.",
  },
};

const PAGE_SIZE = 10;

function getPageParam(
  value: string | string[] | undefined,
  totalItems: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : 1;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, totalPages);
}

function paginate<T>(items: T[], page: number) {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
}

export default async function TvRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const data = await getTvRatingsDashboardData();
  const ratingsPage = getPageParam(params.ratingsPage, data.ratings.length);
  const politicianPage = getPageParam(
    params.politicianPage,
    data.politicianStats.length,
  );
  const partyPage = getPageParam(params.partyPage, data.partyStats.length);
  const partyAbsoluteStats = [...data.partyStats].sort((a, b) => {
    if (b.total_viewers_millions !== a.total_viewers_millions) {
      return b.total_viewers_millions - a.total_viewers_millions;
    }

    if (b.rated_episodes !== a.rated_episodes) {
      return b.rated_episodes - a.rated_episodes;
    }

    return b.average_viewers_millions - a.average_viewers_millions;
  });
  const partyAbsolutePage = getPageParam(
    params.partyAbsolutePage,
    partyAbsoluteStats.length,
  );

  return (
    <TvRatingsPageContent
      summary={data.summary}
      ratings={paginate(data.ratings, ratingsPage)}
      ratingsTotalCount={data.ratings.length}
      ratingsCurrentPage={ratingsPage}
      politicianStats={paginate(data.politicianStats, politicianPage)}
      politicianStatsTotalCount={data.politicianStats.length}
      politicianStatsCurrentPage={politicianPage}
      topPolitician={data.politicianStats[0] ?? null}
      partyStats={paginate(data.partyStats, partyPage)}
      partyStatsTotalCount={data.partyStats.length}
      partyStatsCurrentPage={partyPage}
      topParty={data.partyStats[0] ?? null}
      partyAbsoluteStats={paginate(partyAbsoluteStats, partyAbsolutePage)}
      partyAbsoluteStatsTotalCount={partyAbsoluteStats.length}
      partyAbsoluteStatsCurrentPage={partyAbsolutePage}
      pageSize={PAGE_SIZE}
    />
  );
}
