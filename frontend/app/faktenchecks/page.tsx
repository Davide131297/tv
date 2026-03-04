import { Suspense } from "react";
import type { Metadata } from "next";
import { getFactchecks } from "@/lib/factcheck-data";
import FactcheckList from "@/components/FactcheckList";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Faktenchecks | Polittalk-Watcher",
  description:
    "KI-gestützte Faktcheck-Analysen der politischen Talkshows. Kernaussagen und Bewertungen aus transkribierten Sendungen.",
  robots: { index: false, follow: false },
};

export default async function FaktenchecksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const show = typeof params.show === "string" ? params.show : "all";

  const factchecks = await getFactchecks({ show });

  return (
    <div className="min-h-screen text-gray-900">
      {/* Hero Header */}
      <div className="border-b border-gray-200 pb-8 mb-8">
        <div className="max-w-4xl mx-auto px-4 pt-12">
          <div className="flex items-start gap-4 mb-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-2xl">
              🧠
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
                KI-Faktenchecks
              </h1>
              <p className="text-gray-500 text-sm max-w-xl leading-relaxed">
                Automatisch generierte Analysen aus transkribierten Sendungen.
                Die KI extrahiert Kernaussagen und bewertet deren Richtigkeit.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                <span>Analyse durchgeführt von</span>
                <span className="inline-flex items-center gap-1 font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                  ✨ Gemini
                </span>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 w-fit">
            <span>⚠️</span>
            <span>
              <strong>Experimentell</strong> – KI-Analysen können Fehler
              enthalten. Kein Ersatz für journalistische Recherche.
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16">
        {/* Show Filter */}
        <ShowFilter currentShow={show} />

        {/* Content */}
        <Suspense key={show} fallback={<LoadingSkeleton />}>
          <FactcheckList factchecks={factchecks} />
        </Suspense>
      </div>
    </div>
  );
}

function ShowFilter({ currentShow }: { currentShow: string }) {
  const shows = [
    { value: "all", label: "Alle Shows" },
    { value: "Caren Miosga", label: "Caren Miosga" },
    { value: "Markus Lanz", label: "Markus Lanz" },
    { value: "Maybrit Illner", label: "Maybrit Illner" },
    { value: "Maischberger", label: "Maischberger" },
    { value: "Hart aber fair", label: "Hart aber fair" },
  ];

  return (
    <div className="mb-8">
      <p className="text-xs text-gray-400 uppercase tracking-widest font-medium mb-3">
        Sendung filtern
      </p>
      <div className="flex flex-wrap gap-2">
        {shows.map((s) => (
          <a
            key={s.value}
            href={`/faktenchecks${s.value !== "all" ? `?show=${encodeURIComponent(s.value)}` : ""}`}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
              currentShow === s.value
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300",
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 bg-gray-200 rounded-full w-24" />
            <div className="h-3 bg-gray-100 rounded-full w-20" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="space-y-1.5 mt-3">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
