"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import ColorBox from "@/components/ui/color-box";
import { useUrlUpdater } from "@/hooks/useUrlUpdater";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  PartyTvRatingsStat,
  PoliticianTvRatingsStat,
  TvRatingOverview,
  TvRatingsSummary,
} from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TvRatingsPageContentProps {
  summary: TvRatingsSummary;
  ratings: TvRatingOverview[];
  ratingsTotalCount: number;
  ratingsCurrentPage: number;
  politicianStats: PoliticianTvRatingsStat[];
  politicianStatsTotalCount: number;
  politicianStatsCurrentPage: number;
  topPolitician: PoliticianTvRatingsStat | null;
  partyStats: PartyTvRatingsStat[];
  partyStatsTotalCount: number;
  partyStatsCurrentPage: number;
  topParty: PartyTvRatingsStat | null;
  partyAbsoluteStats: PartyTvRatingsStat[];
  partyAbsoluteStatsTotalCount: number;
  partyAbsoluteStatsCurrentPage: number;
  pageSize: number;
}

const numberFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

function formatPeople(rating: TvRatingOverview) {
  if (rating.politicians.length === 0) {
    return "Keine Politiker hinterlegt";
  }

  return rating.politicians
    .map((politician) => `${politician.name} (${politician.party_name})`)
    .join(", ");
}

function AnalysisTable({
  title,
  description,
  columns,
  rows,
  pagination,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: ReactNode[];
  pagination?: ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-transparent rounded-lg shadow-md overflow-hidden border border-transparent dark:border-gray-800">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {rows}
          </tbody>
        </table>
      </div>

      {pagination}
    </section>
  );
}

function TablePagination({
  queryParam,
  currentPage,
  totalCount,
  pageSize,
}: {
  queryParam: string;
  currentPage: number;
  totalCount: number;
  pageSize: number;
}) {
  const updateUrl = useUrlUpdater();
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    updateUrl({ [queryParam]: String(page) });
  };

  const pages: Array<number | "..."> = [];
  const delta = 1;

  for (let i = 1; i <= totalPages; i += 1) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="bg-white dark:bg-transparent px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Seite{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {currentPage}
        </span>{" "}
        von{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {totalPages}
        </span>
      </p>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 sm:h-9 sm:w-9"
          title="Erste Seite"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 sm:h-9 sm:w-9"
          title="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="hidden md:flex items-center gap-1">
          {pages.map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <Button
                key={`page-${page}`}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 p-0 font-medium",
                  currentPage === page && "pointer-events-none",
                )}
              >
                {page}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 sm:h-9 sm:w-9"
          title="Nächste Seite"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 sm:h-9 sm:w-9"
          title="Letzte Seite"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function TvRatingsPageContent({
  summary,
  ratings,
  ratingsTotalCount,
  ratingsCurrentPage,
  politicianStats,
  politicianStatsTotalCount,
  politicianStatsCurrentPage,
  topPolitician,
  partyStats,
  partyStatsTotalCount,
  partyStatsCurrentPage,
  topParty,
  partyAbsoluteStats,
  partyAbsoluteStatsTotalCount,
  partyAbsoluteStatsCurrentPage,
  pageSize,
}: TvRatingsPageContentProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Einschaltquoten
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          Gespeicherte TV-Quoten mit Zuordnung zu Episoden, Politikern und
          Parteien. Die Analysen basieren auf kumulierten Zuschauerzahlen der
          erfassten Auftritte.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <ColorBox
          color="blue"
          number={summary.total_ratings}
          text="Gespeicherte Quoten"
        />
        <ColorBox
          color="green"
          number={`${compactFormatter.format(summary.total_viewers_millions)} Mio.`}
          text="Zuschauer kumuliert"
        />
        <ColorBox
          color="purple"
          number={`${numberFormatter.format(summary.average_market_share)}%`}
          text="Marktanteil im Schnitt"
        />
        <ColorBox
          color="orange"
          number={`${compactFormatter.format(summary.average_viewers_millions)} Mio.`}
          text="Zuschauer pro Sendung"
        />
      </div>

      <section className="bg-white dark:bg-transparent rounded-lg shadow-md overflow-hidden border border-transparent dark:border-gray-800 mb-8">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
            1. Übersicht aller gespeicherten Quoten
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sendung
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Zuschauer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Marktanteil
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Politiker
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Episode
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {ratings.map((rating, index) => (
                <tr
                  key={`${rating.show_name}-${rating.episode_date}`}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-gray-50 dark:bg-gray-900/30"
                  }
                >
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">
                    {rating.show_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {formatDate(rating.episode_date)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {compactFormatter.format(rating.viewers_millions)} Mio.
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {numberFormatter.format(rating.market_share)}%
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 min-w-80">
                    {formatPeople(rating)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {rating.episode_url ? (
                      <Link
                        href={rating.episode_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Episode ansehen
                      </Link>
                    ) : (
                      "Kein Link"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          queryParam="ratingsPage"
          currentPage={ratingsCurrentPage}
          totalCount={ratingsTotalCount}
          pageSize={pageSize}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 p-4 sm:p-5">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Politiker mit den höchsten durchschnittlichen Einschaltquoten
            </p>
            {topPolitician ? (
              <p className="mt-2 text-lg text-emerald-950 dark:text-emerald-100">
                <span className="font-semibold">{topPolitician.politician_name}</span>
                {" · "}
                {topPolitician.party_name}
                {" · "}
                {compactFormatter.format(topPolitician.average_viewers_millions)} Mio.
                Zuschauer im Schnitt bei {topPolitician.appearances} bewerteten
                Auftritten
              </p>
            ) : (
              <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
                Keine Ratings vorhanden.
              </p>
            )}
          </div>

          <AnalysisTable
            title="Politiker-Ranking"
            description="Sortiert nach durchschnittlichen Zuschauerzahlen pro Politiker-Auftritt."
            columns={[
              "Politiker",
              "Partei",
              "Auftritte",
              "Zuschauer gesamt",
              "Zuschauer Ø",
              "Marktanteil Ø",
            ]}
            rows={politicianStats.map((stat, index) => (
              <tr
                key={stat.politician_name}
                className={
                  index % 2 === 0
                    ? "bg-white dark:bg-transparent"
                    : "bg-gray-50 dark:bg-gray-900/30"
                }
              >
                <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">
                  {stat.politician_name}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {stat.party_name}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {stat.appearances}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {compactFormatter.format(stat.total_viewers_millions)} Mio.
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {compactFormatter.format(stat.average_viewers_millions)} Mio.
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {numberFormatter.format(stat.average_market_share)}%
                </td>
              </tr>
            ))}
            pagination={
              <TablePagination
                queryParam="politicianPage"
                currentPage={politicianStatsCurrentPage}
                totalCount={politicianStatsTotalCount}
                pageSize={pageSize}
              />
            }
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 p-4 sm:p-5">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              3. Partei mit den höchsten durchschnittlichen Einschaltquoten
            </p>
            {topParty ? (
              <p className="mt-2 text-lg text-amber-950 dark:text-amber-100">
                <span className="font-semibold">{topParty.party_name}</span>
                {" · "}
                {compactFormatter.format(topParty.average_viewers_millions)} Mio.
                Zuschauer im Schnitt bei {topParty.rated_episodes} bewerteten
                Episoden
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
                Keine Ratings vorhanden.
              </p>
            )}
          </div>

          <AnalysisTable
            title="Partei-Ranking"
            description="Sortiert nach durchschnittlichen Zuschauerzahlen pro Episode. Parteien werden pro Episode nur einmal gezählt, auch wenn mehrere Politiker derselben Partei in derselben Sendung saßen."
            columns={[
              "Partei",
              "Episoden",
              "Zuschauer gesamt",
              "Zuschauer Ø",
              "Marktanteil Ø",
              "Letzte Episode",
            ]}
            rows={partyStats.map((stat, index) => (
              <tr
                key={stat.party_name}
                className={
                  index % 2 === 0
                    ? "bg-white dark:bg-transparent"
                    : "bg-gray-50 dark:bg-gray-900/30"
                }
              >
                <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">
                  {stat.party_name}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {stat.rated_episodes}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {compactFormatter.format(stat.total_viewers_millions)} Mio.
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {compactFormatter.format(stat.average_viewers_millions)} Mio.
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {numberFormatter.format(stat.average_market_share)}%
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(stat.latest_episode)}
                </td>
              </tr>
            ))}
            pagination={
              <TablePagination
                queryParam="partyPage"
                currentPage={partyStatsCurrentPage}
                totalCount={partyStatsTotalCount}
                pageSize={pageSize}
              />
            }
          />
        </div>
      </div>

      <div className="mt-8">
        <AnalysisTable
          title="4. Partei-Ranking nach absoluten Zuschauerzahlen"
          description="Sortiert nach kumulierten Zuschauerzahlen pro Partei. Parteien werden pro Episode nur einmal gezählt, auch wenn mehrere Politiker derselben Partei in derselben Sendung saßen."
          columns={[
            "Partei",
            "Episoden",
            "Zuschauer gesamt",
            "Zuschauer Ø",
            "Marktanteil Ø",
            "Letzte Episode",
          ]}
          rows={partyAbsoluteStats.map((stat, index) => (
            <tr
              key={`${stat.party_name}-absolute`}
              className={
                index % 2 === 0
                  ? "bg-white dark:bg-transparent"
                  : "bg-gray-50 dark:bg-gray-900/30"
              }
            >
              <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">
                {stat.party_name}
              </td>
              <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                {stat.rated_episodes}
              </td>
              <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                {compactFormatter.format(stat.total_viewers_millions)} Mio.
              </td>
              <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                {compactFormatter.format(stat.average_viewers_millions)} Mio.
              </td>
              <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                {numberFormatter.format(stat.average_market_share)}%
              </td>
              <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                {formatDate(stat.latest_episode)}
              </td>
            </tr>
          ))}
          pagination={
            <TablePagination
              queryParam="partyAbsolutePage"
              currentPage={partyAbsoluteStatsCurrentPage}
              totalCount={partyAbsoluteStatsTotalCount}
              pageSize={pageSize}
            />
          }
        />
      </div>
    </div>
  );
}
