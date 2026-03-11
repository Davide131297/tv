import { Suspense } from "react";
import type { Metadata } from "next";
import ComparisonClient from "./ComparisonClient";
import {
  getPoliticianComparisonStats,
  getPoliticianRankings,
  type PoliticianComparisonPoint,
} from "@/lib/politics-data";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type ComparisonOption = {
  label: string;
  value: string;
  party: string;
};

export const metadata: Metadata = {
  title: "Direkt-Vergleich",
  description:
    "Zwei Politiker direkt gegeneinander stellen und ihre Präsenz in den wichtigsten deutschen TV-Talkshows vergleichen.",
  openGraph: {
    title: "Direkt-Vergleich | Polittalk-Watcher",
    description:
      "Head-to-Head-Vergleich der wichtigsten Talkshow-Auftritte deutscher Politiker.",
  },
};

function buildComparisonOptions(
  rankings: Awaited<ReturnType<typeof getPoliticianRankings>>,
): ComparisonOption[] {
  return rankings.map((item) => ({
    label: `${item.politician_name} (${item.party_name})`,
    value: item.politician_name,
    party: item.party_name,
  }));
}

function getInitialSelection(options: ComparisonOption[], value?: string) {
  return value && options.some((option) => option.value === value)
    ? value
    : (options[0]?.value ?? "");
}

function getSecondSelection(
  options: ComparisonOption[],
  firstSelection: string,
  value?: string,
) {
  if (
    value &&
    value !== firstSelection &&
    options.some((option) => option.value === value)
  ) {
    return value;
  }

  return options.find((option) => option.value !== firstSelection)?.value ?? "";
}

async function ComparisonPageContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedP1 = typeof params.p1 === "string" ? params.p1 : undefined;
  const requestedP2 = typeof params.p2 === "string" ? params.p2 : undefined;
  const year = typeof params.year === "string" ? params.year : "all";

  const rankings = await getPoliticianRankings({ year: "all" });
  const politicianOptions = buildComparisonOptions(rankings);
  const initialP1 = getInitialSelection(politicianOptions, requestedP1);
  const initialP2 = getSecondSelection(
    politicianOptions,
    initialP1,
    requestedP2,
  );

  let initialData: PoliticianComparisonPoint[] = [];
  if (initialP1 && initialP2) {
    initialData = await getPoliticianComparisonStats(
      initialP1,
      initialP2,
      year,
    );
  }

  return (
    <ComparisonClient
      initialP1={initialP1}
      initialP2={initialP2}
      initialYear={year}
      initialPoliticians={politicianOptions}
      initialData={initialData}
    />
  );
}

function ComparisonPageFallback() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-3xl border border-gray-200/70 bg-white/80 dark:border-gray-800 dark:bg-gray-900/70"
          />
        ))}
      </div>
      <div className="h-[560px] rounded-[2rem] border border-gray-200/70 bg-white/80 dark:border-gray-800 dark:bg-gray-900/70" />
    </div>
  );
}

export default function ComparisonPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] pb-16 pt-6 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(3,7,18,1))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),transparent_55%,rgba(239,68,68,0.10))]" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur dark:border-blue-900/70 dark:bg-slate-950/70 dark:text-blue-300">
            Head-to-Head Analyse
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-950 dark:text-white md:text-6xl">
            Direkt-Vergleich
          </h1>
          <p className="mt-3 text-balance text-base leading-7 text-gray-600 dark:text-gray-300 md:text-lg">
            Zwei Politiker, fuenf Leitformate, ein direkter Blick auf ihre
            TV-Praesenz. Vergleiche Reichweite, Dominanz und Schwerpunkte je
            Sendung oder für alle Jahre zusammen.
          </p>
        </div>

        <Suspense fallback={<ComparisonPageFallback />}>
          <ComparisonPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
