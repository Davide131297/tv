"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  BarChart3,
  Loader2,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import type { PoliticianComparisonPoint } from "@/lib/politics-data";

type ComparisonOption = {
  label: string;
  value: string;
  party: string;
};

type ComparisonClientProps = {
  initialP1: string;
  initialP2: string;
  initialYear: string;
  initialPoliticians: ComparisonOption[];
  initialData: PoliticianComparisonPoint[];
};

type ComparisonSummary = {
  totalA: number;
  totalB: number;
  leadingName: string | null;
  leadingDelta: number;
  strongestShow: string | null;
  strongestValue: number;
  tieCount: number;
};

const YEAR_START = 2021;
const SERIES = {
  A: {
    stroke: "#2563eb",
    fill: "rgba(37, 99, 235, 0.24)",
    dotFill: "#2563eb",
  },
  B: {
    stroke: "#dc2626",
    fill: "rgba(220, 38, 38, 0.22)",
    dotFill: "#dc2626",
  },
} as const;

function buildYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - YEAR_START + 1 }, (_, index) =>
    String(currentYear - index),
  );
}

function getSummary(
  data: PoliticianComparisonPoint[],
  p1: string,
  p2: string,
): ComparisonSummary {
  const totalA = data.reduce((sum, item) => sum + item.A, 0);
  const totalB = data.reduce((sum, item) => sum + item.B, 0);
  const leadingDelta = Math.abs(totalA - totalB);
  const leadingName = totalA === totalB ? null : totalA > totalB ? p1 : p2;

  let strongestShow: string | null = null;
  let strongestValue = 0;
  let tieCount = 0;

  data.forEach((item) => {
    if (item.A === item.B) {
      tieCount += 1;
    }

    const maxForShow = Math.max(item.A, item.B);
    if (maxForShow > strongestValue) {
      strongestValue = maxForShow;
      strongestShow = item.show;
    }
  });

  return {
    totalA,
    totalB,
    leadingName,
    leadingDelta,
    strongestShow,
    strongestValue,
    tieCount,
  };
}

function getChartData(data: PoliticianComparisonPoint[]) {
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.A, item.B]));
  const fullMark = Math.max(4, Math.ceil(maxValue * 1.2));

  return data.map((item) => ({
    ...item,
    fullMark,
  }));
}

export default function ComparisonClient({
  initialP1,
  initialP2,
  initialYear,
  initialPoliticians,
  initialData,
}: ComparisonClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState(initialP2);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState<PoliticianComparisonPoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const availableYears = useMemo(buildYears, []);
  const chartData = useMemo(() => getChartData(data), [data]);
  const summary = useMemo(() => getSummary(data, p1, p2), [data, p1, p2]);

  useEffect(() => {
    if (!p1 || !p2) {
      return;
    }

    const currentP1 = searchParams.get("p1");
    const currentP2 = searchParams.get("p2");
    const currentYear = searchParams.get("year") ?? "all";

    if (currentP1 === p1 && currentP2 === p2 && currentYear === year) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("p1", p1);
    params.set("p2", p2);

    if (year === "all") {
      params.delete("year");
    } else {
      params.set("year", year);
    }

    router.replace(`/politiker/vergleich?${params.toString()}`, {
      scroll: false,
    });
  }, [p1, p2, year, router, searchParams]);

  useEffect(() => {
    let active = true;

    async function loadComparison() {
      if (!p1 || !p2) {
        setData([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ p1, p2 });
        if (year !== "all") {
          params.set("year", year);
        }

        const response = await fetch(
          `/api/politician-comparison?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error("Die Vergleichsdaten konnten nicht geladen werden.");
        }

        const nextData = (await response.json()) as PoliticianComparisonPoint[];
        if (!active) {
          return;
        }

        setData(nextData);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        console.error(fetchError);
        setError("Die Vergleichsdaten konnten nicht geladen werden.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const matchesInitialState =
      p1 === initialP1 && p2 === initialP2 && year === initialYear;

    if (matchesInitialState && initialData.length > 0) {
      setData(initialData);
      setLoading(false);
      setError(null);
      return;
    }

    void loadComparison();

    return () => {
      active = false;
    };
  }, [
    p1,
    p2,
    year,
    initialData,
    initialP1,
    initialP2,
    initialYear,
    reloadToken,
  ]);

  const handleSwap = () => {
    setP1(p2);
    setP2(p1);
  };

  const handleReset = () => {
    setP1(initialP1);
    setP2(initialP2);
    setYear("all");
    setError(null);
  };

  const disableDuplicateOption = (candidate: string, current: string) =>
    candidate !== current && (candidate === p1 || candidate === p2);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] xl:items-start">
      <Card className="order-2 overflow-hidden rounded-[2rem] border-white/70 bg-white/90 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/85 xl:order-1">
        <CardContent className="p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                Radar Chart
              </p>
              <h2 className="mt-2 text-3xl font-black text-gray-950 dark:text-white">
                Show-Profil im direkten Vergleich
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Jede Achse steht Für ein Leitformat. Je weiter die Flaeche nach
                aussen reicht, desto haeufiger war die Person dort zu Gast.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                <span className="size-2.5 rounded-full bg-blue-600" />
                {p1}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-red-700 dark:bg-red-950/50 dark:text-red-200">
                <span className="size-2.5 rounded-full bg-red-600" />
                {p2}
              </span>
            </div>
          </div>

          <div className="relative min-h-[420px] sm:min-h-[460px]">
            {loading ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400 sm:min-h-[460px]">
                <Loader2 className="size-9 animate-spin text-blue-600" />
                <p className="text-sm font-semibold">
                  Vergleichsdaten werden aktualisiert...
                </p>
              </div>
            ) : error ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-red-200 bg-red-50/70 px-6 text-center dark:border-red-950 dark:bg-red-950/20 sm:min-h-[460px]">
                <p className="text-lg font-bold text-gray-950 dark:text-white">
                  Daten nicht verfuegbar
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 rounded-full"
                  onClick={() => setReloadToken((current) => current + 1)}
                >
                  Erneut versuchen
                </Button>
              </div>
            ) : !p1 || !p2 ? (
              <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50/70 px-6 text-center dark:border-slate-800 dark:bg-slate-900/40 sm:min-h-[460px]">
                <p className="max-w-md text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                  Waehle zwei unterschiedliche Politiker aus, um den Vergleich
                  zu starten.
                </p>
              </div>
            ) : chartData.every((item) => item.A === 0 && item.B === 0) ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50/70 px-6 text-center dark:border-slate-800 dark:bg-slate-900/40 sm:min-h-[460px]">
                <p className="text-lg font-bold text-gray-950 dark:text-white">
                  Keine Auftritte im gewaehlten Zeitraum
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
                  Für diese Kombination gibt es in den beruecksichtigten Shows
                  aktuell keine Treffer.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={420}>
                <RadarChart
                  cx="50%"
                  cy="50%"
                  data={chartData}
                  outerRadius="72%"
                >
                  <PolarGrid stroke="#cbd5e1" strokeOpacity={0.75} />
                  <PolarAngleAxis
                    dataKey="show"
                    tick={{
                      fill: "#475569",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, "auto"]}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "18px",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      boxShadow: "0 24px 70px -30px rgba(15, 23, 42, 0.4)",
                      backgroundColor: "rgba(255,255,255,0.96)",
                      backdropFilter: "blur(12px)",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} Auftritte`,
                      name === "A" ? p1 : p2,
                    ]}
                    labelFormatter={(label) => `Show: ${label}`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "16px", fontWeight: 700 }}
                    formatter={(value) => (
                      <span className="text-sm text-slate-700">
                        {value === "A" ? p1 : p2}
                      </span>
                    )}
                  />
                  <Radar
                    name="A"
                    dataKey="A"
                    fill={SERIES.A.fill}
                    fillOpacity={1}
                    stroke={SERIES.A.stroke}
                    strokeWidth={3}
                    activeDot={{
                      r: 6,
                      strokeWidth: 0,
                      fill: SERIES.A.dotFill,
                    }}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: SERIES.A.dotFill,
                    }}
                  />
                  <Radar
                    name="B"
                    dataKey="B"
                    fill={SERIES.B.fill}
                    fillOpacity={1}
                    stroke={SERIES.B.stroke}
                    strokeWidth={3}
                    activeDot={{
                      r: 6,
                      strokeWidth: 0,
                      fill: SERIES.B.dotFill,
                    }}
                    dot={{
                      r: 4,
                      strokeWidth: 2,
                      fill: SERIES.B.dotFill,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {data.map((item) => {
              const leadingSide =
                item.A === item.B ? null : item.A > item.B ? "A" : "B";

              return (
                <div
                  key={item.show}
                  className={cn(
                    "rounded-[1.35rem] border px-4 py-4 transition-colors",
                    leadingSide === "A" &&
                      "border-blue-200 bg-blue-50/70 dark:border-blue-950 dark:bg-blue-950/20",
                    leadingSide === "B" &&
                      "border-red-200 bg-red-50/70 dark:border-red-950 dark:bg-red-950/20",
                    !leadingSide &&
                      "border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-900/60",
                  )}
                >
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.show}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {item.A}
                    </span>
                    <span className="text-gray-400">:</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {item.B}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="order-1 flex flex-col gap-4 xl:sticky xl:top-24 xl:order-2">
        <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/85 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.3)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
          <CardContent className="p-0">
            <div className="grid gap-0 sm:grid-cols-[1fr_auto_1fr] xl:grid-cols-1">
              <div className="border-b border-gray-100 p-5 sm:border-r sm:border-b-0 xl:border-b xl:border-r-0 dark:border-slate-800">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                  Spieler A
                </p>
                <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
                  Politiker
                </label>
                <NativeSelect
                  value={p1}
                  onChange={(event) => setP1(event.target.value)}
                  className="h-11 rounded-2xl border-blue-200 bg-blue-50/80 px-4 text-sm font-semibold text-gray-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-white"
                >
                  {initialPoliticians.map((politician) => (
                    <NativeSelectOption
                      key={`p1-${politician.value}`}
                      value={politician.value}
                      disabled={disableDuplicateOption(politician.value, p1)}
                    >
                      {politician.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-3 sm:border-b-0 xl:border-y dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-gray-200 bg-white shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  disabled={!p1 || !p2}
                  onClick={handleSwap}
                  aria-label="Politiker tauschen"
                >
                  <ArrowRightLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={handleReset}
                  aria-label="Auswahl zuruecksetzen"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>

              <div className="p-5 sm:border-l xl:border-l-0 dark:border-slate-800">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-red-600 dark:text-red-300">
                  Spieler B
                </p>
                <label className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
                  Politiker
                </label>
                <NativeSelect
                  value={p2}
                  onChange={(event) => setP2(event.target.value)}
                  className="h-11 rounded-2xl border-red-200 bg-red-50/80 px-4 text-sm font-semibold text-gray-900 dark:border-red-900/70 dark:bg-red-950/30 dark:text-white"
                >
                  {initialPoliticians.map((politician) => (
                    <NativeSelectOption
                      key={`p2-${politician.value}`}
                      value={politician.value}
                      disabled={disableDuplicateOption(politician.value, p2)}
                    >
                      {politician.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/85 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.3)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                Zeitraum
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
                Vergleichsfenster
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Ein Jahr isolieren oder die gesamte Historie vergleichen.
              </p>
            </div>
            <NativeSelect
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="h-11 rounded-2xl border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <NativeSelectOption value="all">Alle Jahre</NativeSelectOption>
              {availableYears.map((availableYear) => (
                <NativeSelectOption key={availableYear} value={availableYear}>
                  {availableYear}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.5rem] border-blue-100 bg-blue-50/80 dark:border-blue-950 dark:bg-blue-950/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
                    Führung
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-950 dark:text-white">
                    {summary.leadingName ?? "Gleichstand"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {summary.leadingName
                      ? `${summary.leadingDelta} Auftritte Vorsprung`
                      : "Beide liegen aktuell gleichauf."}
                  </p>
                </div>
                <Trophy className="size-8 text-blue-600 dark:text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-gray-200 bg-white/85 dark:border-slate-800 dark:bg-slate-950/80">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                    Dominanteste Show
                  </p>
                  <p className="mt-2 text-xl font-black text-gray-950 dark:text-white">
                    {summary.strongestShow ?? "Keine Daten"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Peak bei {summary.strongestValue} Auftritten
                  </p>
                </div>
                <BarChart3 className="size-8 text-gray-700 dark:text-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-red-100 bg-red-50/80 dark:border-red-950 dark:bg-red-950/25">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-700 dark:text-red-300">
                Kopf-an-Kopf
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-black text-gray-950 dark:text-white">
                    {summary.tieCount}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    Formate mit Gleichstand
                  </p>
                </div>
                <div className="text-right text-sm font-semibold text-gray-500 dark:text-gray-400">
                  <div>
                    {summary.totalA} Für {p1}
                  </div>
                  <div>
                    {summary.totalB} Für {p2}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
