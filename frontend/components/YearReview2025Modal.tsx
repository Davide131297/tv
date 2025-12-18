"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { FETCH_HEADERS } from "@/lib/utils";
import { PARTY_COLORS } from "@/types";
import { POLITICAL_AREA_COLORS } from "@/lib/political-area-colors";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { SHOW_OPTIONS } from "@/types";

type PoliticianRanking = {
  politician_name: string;
  party_name: string;
  total_appearances: number;
};

type PartyStat = {
  party_name: string;
  count: number;
};

type PoliticalAreaStat = {
  area_id: number;
  area_label: string;
  count: number;
};

type PoliticianRankingsResponse = {
  success: boolean;
  data: PoliticianRanking[];
};

type PartyStatsResponse = {
  success: boolean;
  data: PartyStat[];
};

type PoliticalAreasResponse = {
  success: boolean;
  data: PoliticalAreaStat[];
  rows?: Array<{
    political_area_id: number;
    episode_date: string;
  }>;
};

type SummaryResponse = {
  success: boolean;
  data: {
    total_appearances: number;
    total_episodes: number;
    unique_politicians: number;
    parties_represented: number;
    show_name?: string;
  };
};

type ShowsResponse = {
  success: boolean;
  data: Array<{
    show_name: string;
    appearances: number;
    episodes: number;
    first_episode: string;
    latest_episode: string;
  }>;
};

type MonthlyResponse = {
  success: boolean;
  data: Array<{ month: string; count: number }>;
};

type PartyMonthlyResponse = {
  success: boolean;
  metadata?: { parties?: string[] };
  data: Array<Record<string, any>>;
};

const YEAR = 2025;

type PageKey =
  | "politicians"
  | "parties"
  | "topics"
  | "shows"
  | "monthly"
  | "seasonality"
  | "compare"
  | "totals";

const PAGES: { key: PageKey; title: string; description: string }[] = [
  {
    key: "politicians",
    title: `Top 3 Politiker ${YEAR}`,
    description: "Die häufigsten Talkshow-Gäste im Jahr.",
  },
  {
    key: "parties",
    title: `Top 3 Parteien ${YEAR}`,
    description: "Die Parteien mit den meisten Auftritten im Jahr.",
  },
  {
    key: "topics",
    title: `Top 3 Themen ${YEAR}`,
    description: "Die häufigsten politischen Themenbereiche im Jahr.",
  },
  {
    key: "shows",
    title: "Top Shows 2025",
    description: "Welche Sendungen waren am aktivsten.",
  },
  {
    key: "monthly",
    title: "Monatlicher Verlauf",
    description: "Wie sich 2025 über die Monate verteilt.",
  },
  {
    key: "seasonality",
    title: "Saisonalität",
    description: "Aktivität pro Monat",
  },
  {
    key: "compare",
    title: "Show Vergleich",
    description: "Top-3 im Vergleich zu einer ausgewählten Show.",
  },
  {
    key: "totals",
    title: "Gesamtzahlen 2025",
    description: "Die wichtigsten Summen auf einen Blick.",
  },
];

function ordinal(rank: number) {
  if (rank === 1) return "1.";
  if (rank === 2) return "2.";
  return "3.";
}

const TOP3_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

function Top3BarChart({
  data,
  valueLabel,
}: {
  data: { name: string; value: number; fill?: string }[];
  valueLabel: string;
}) {
  const chartConfig = {
    value: {
      label: valueLabel,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const chartData = data.map((d, idx) => ({
    rank: String(idx + 1),
    name: d.name,
    value: d.value,
    fill: d.fill ?? TOP3_COLORS[idx] ?? "var(--chart-1)",
  }));

  const toNumber = (v: string | number | undefined) =>
    typeof v === "number"
      ? v
      : typeof v === "string"
      ? Number.parseFloat(v)
      : undefined;

  const pickReadableTextColor = (fill?: string) => {
    if (!fill) return "#ffffff";

    const hex = fill.trim();
    if (!hex.startsWith("#")) {
      // e.g. var(--chart-1) – can't reliably compute here
      return "#ffffff";
    }

    const normalized =
      hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;

    const r = Number.parseInt(normalized.slice(1, 3), 16);
    const g = Number.parseInt(normalized.slice(3, 5), 16);
    const b = Number.parseInt(normalized.slice(5, 7), 16);

    if ([r, g, b].some((n) => Number.isNaN(n))) {
      return "#ffffff";
    }

    // Relative luminance (sRGB)
    const srgb = [r, g, b].map((v) => v / 255);
    const lin = srgb.map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    const luminance = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];

    // If bar is light -> use dark text, else light text
    return luminance > 0.55 ? "#111111" : "#ffffff";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderNameLabel = (props: any) => {
    const x = toNumber(props?.x);
    const y = toNumber(props?.y);
    const height = toNumber(props?.height);
    const value = props?.value;
    const fill = props?.payload?.fill as string | undefined;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof height !== "number"
    ) {
      return null;
    }

    const text = typeof value === "string" ? value : String(value ?? "");
    const color = pickReadableTextColor(fill);

    return (
      <text
        x={x + 10}
        y={y + height / 2}
        dominantBaseline="middle"
        fontSize={
          text === "Wirtschaft, Innovation und Wettbewerbsfähigkeit" ? 10 : 12
        }
        fill={color}
      >
        {text}
      </text>
    );
  };

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <ChartContainer config={chartConfig} className="h-56">
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="rank"
            type="category"
            tickLine={false}
            axisLine={false}
            width={20}
          />
          <XAxis dataKey="value" type="number" hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={8} name={valueLabel}>
            {chartData.map((entry) => (
              <Cell key={entry.rank} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="name"
              position="insideLeft"
              content={renderNameLabel}
            />
            <LabelList
              dataKey="value"
              position="right"
              offset={10}
              className="fill-muted-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mär",
  "04": "Apr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Okt",
  "11": "Nov",
  "12": "Dez",
};

export default function YearReview2025Modal() {
  const [open, setOpen] = useState(false);
  const hasAutoOpened = useRef(false);
  const pendingManualOpen = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topPoliticians, setTopPoliticians] = useState<PoliticianRanking[]>([]);
  const [topParties, setTopParties] = useState<PartyStat[]>([]);
  const [topTopics, setTopTopics] = useState<PoliticalAreaStat[]>([]);

  const [topicRows2025, setTopicRows2025] = useState<
    Array<{ political_area_id: number; episode_date: string }>
  >([]);

  const [summary2025, setSummary2025] = useState<
    SummaryResponse["data"] | null
  >(null);
  const [shows2025, setShows2025] = useState<ShowsResponse["data"]>([]);
  const [activityMonthly2025, setActivityMonthly2025] = useState<
    MonthlyResponse["data"]
  >([]);
  const [partyMonthly2025, setPartyMonthly2025] = useState<
    PartyMonthlyResponse["data"]
  >([]);

  const [compareShow, setCompareShow] = useState<string>("Markus Lanz");
  const [compareData, setCompareData] = useState<{
    politicians: PoliticianRanking[];
    parties: PartyStat[];
    topics: PoliticalAreaStat[];
  } | null>(null);

  const page = PAGES[pageIndex];

  const pageCount = PAGES.length;
  const canGoBack = pageIndex > 0;
  const canGoNext = pageIndex < pageCount - 1;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const politician2025Url = `/api/politics?type=politician-rankings&limit=300&year=${YEAR}`;
        const party2025Url = `/api/politics?type=party-stats&year=${YEAR}`;
        const topics2025Url = `/api/political-areas?year=${YEAR}`;
        const summaryUrl = `/api/politics?type=summary&year=${YEAR}`;
        const showsUrl = `/api/politics?type=shows&year=${YEAR}`;
        const activityMonthlyUrl = `/api/politics?type=activity-monthly&year=${YEAR}`;

        const [
          pol25Res,
          party25Res,
          topics25Res,
          summaryRes,
          showsRes,
          monthlyRes,
        ] = await Promise.all([
          fetch(politician2025Url, { method: "GET", headers: FETCH_HEADERS }),
          fetch(party2025Url, { method: "GET", headers: FETCH_HEADERS }),
          fetch(topics2025Url, { method: "GET", headers: FETCH_HEADERS }),
          fetch(summaryUrl, { method: "GET", headers: FETCH_HEADERS }),
          fetch(showsUrl, { method: "GET", headers: FETCH_HEADERS }),
          fetch(activityMonthlyUrl, { method: "GET", headers: FETCH_HEADERS }),
        ]);

        const responses = [
          pol25Res,
          party25Res,
          topics25Res,
          summaryRes,
          showsRes,
          monthlyRes,
        ];

        if (responses.some((r) => !r.ok)) {
          throw new Error("Fehler beim Laden des Jahresrückblicks.");
        }

        const [
          pol25Json,
          party25Json,
          topics25Json,
          summaryJson,
          showsJson,
          monthlyJson,
        ] = (await Promise.all(responses.map((r) => r.json()))) as [
          PoliticianRankingsResponse,
          PartyStatsResponse,
          PoliticalAreasResponse,
          SummaryResponse,
          ShowsResponse,
          MonthlyResponse
        ];

        if (
          !pol25Json.success ||
          !party25Json.success ||
          !topics25Json.success ||
          !summaryJson.success ||
          !showsJson.success ||
          !monthlyJson.success
        ) {
          throw new Error("Fehler beim Laden des Jahresrückblicks.");
        }

        const politicianTop3 = (pol25Json.data || []).slice(0, 3);
        const partyTop3 = [...(party25Json.data || [])]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        const topicsTop3 = [...(topics25Json.data || [])]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setSummary2025(summaryJson.data);
        setShows2025(showsJson.data || []);
        setActivityMonthly2025(monthlyJson.data || []);
        setTopicRows2025(topics25Json.rows || []);

        setTopPoliticians(politicianTop3);
        setTopParties(partyTop3);
        setTopTopics(topicsTop3);

        // Party monthly for top-3 parties
        const top3PartyNames = [...(party25Json.data || [])]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((p) => p.party_name);

        if (top3PartyNames.length > 0) {
          const partyMonthlyUrl = `/api/politics?type=party-monthly&year=${YEAR}&parties=${encodeURIComponent(
            top3PartyNames.join(",")
          )}`;
          const pmRes = await fetch(partyMonthlyUrl, {
            method: "GET",
            headers: FETCH_HEADERS,
          });
          if (pmRes.ok) {
            const pmJson = (await pmRes.json()) as PartyMonthlyResponse;
            if (pmJson.success) setPartyMonthly2025(pmJson.data || []);
          }
        }
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setError("Konnte den Jahresrückblick nicht laden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasAutoOpened.current) return;
    if (loading) return;
    hasAutoOpened.current = true;
    setOpen(true);
  }, [loading]);

  useEffect(() => {
    function onOpen() {
      if (loading) {
        pendingManualOpen.current = true;
        return;
      }
      setPageIndex(0);
      setOpen(true);
    }

    window.addEventListener("year-review-2025:open", onOpen);
    return () => {
      window.removeEventListener("year-review-2025:open", onOpen);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    if (!pendingManualOpen.current) return;
    pendingManualOpen.current = false;
    setPageIndex(0);
    setOpen(true);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompare() {
      try {
        const [pRes, partyRes, topicsRes] = await Promise.all([
          fetch(
            `/api/politics?type=politician-rankings&limit=3&year=${YEAR}&show=${encodeURIComponent(
              compareShow
            )}`,
            { method: "GET", headers: FETCH_HEADERS }
          ),
          fetch(
            `/api/politics?type=party-stats&year=${YEAR}&show=${encodeURIComponent(
              compareShow
            )}`,
            { method: "GET", headers: FETCH_HEADERS }
          ),
          fetch(
            `/api/political-areas?year=${YEAR}&show=${encodeURIComponent(
              compareShow
            )}`,
            { method: "GET", headers: FETCH_HEADERS }
          ),
        ]);

        if (!pRes.ok || !partyRes.ok || !topicsRes.ok) return;

        const [pJson, partyJson, topicsJson] = (await Promise.all([
          pRes.json(),
          partyRes.json(),
          topicsRes.json(),
        ])) as [
          PoliticianRankingsResponse,
          PartyStatsResponse,
          PoliticalAreasResponse
        ];

        if (!pJson.success || !partyJson.success || !topicsJson.success) return;
        if (cancelled) return;

        setCompareData({
          politicians: (pJson.data || []).slice(0, 3),
          parties: [...(partyJson.data || [])]
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
          topics: [...(topicsJson.data || [])]
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
        });
      } catch {
        // ignore compare errors
      }
    }

    loadCompare();
    return () => {
      cancelled = true;
    };
  }, [compareShow]);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Lade Daten…</p>;
    }

    if (error) {
      return <p className="text-sm text-red-600">{error}</p>;
    }

    if (page.key === "politicians") {
      const chartInput = topPoliticians.map((p) => ({
        name: p.politician_name,
        value: p.total_appearances,
      }));
      return (
        <div className="space-y-4">
          <Top3BarChart data={chartInput} valueLabel="Auftritte" />
          <ol className="space-y-3">
            {topPoliticians.map((p, idx) => (
              <li
                key={`${p.politician_name}-${idx}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {ordinal(idx + 1)} {p.politician_name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {p.party_name}
                  </div>
                </div>
                <div className="text-sm whitespace-nowrap text-muted-foreground">
                  {p.total_appearances} Auftritte
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    if (page.key === "parties") {
      const chartInput = topParties.map((p) => ({
        name: p.party_name,
        value: p.count,
        fill: PARTY_COLORS[p.party_name] || "#6b7280",
      }));
      return (
        <div className="space-y-4">
          <Top3BarChart data={chartInput} valueLabel="Auftritte" />
          <ol className="space-y-3">
            {topParties.map((p, idx) => (
              <li
                key={`${p.party_name}-${idx}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 font-medium truncate">
                  {ordinal(idx + 1)} {p.party_name}
                </div>
                <div className="text-sm whitespace-nowrap text-muted-foreground">
                  {p.count} Auftritte
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    if (page.key === "topics") {
      const chartInput = topTopics.map((t) => ({
        name: t.area_label,
        value: t.count,
        fill: POLITICAL_AREA_COLORS[t.area_id] || "#6b7280",
      }));
      return (
        <div className="space-y-4">
          <Top3BarChart data={chartInput} valueLabel="Episoden" />
          <ol className="space-y-3">
            {topTopics.map((t, idx) => (
              <li
                key={`${t.area_label}-${idx}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 font-medium truncate">
                  {ordinal(idx + 1)} {t.area_label}
                </div>
                <div className="text-sm whitespace-nowrap text-muted-foreground">
                  {t.count}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    if (page.key === "shows") {
      const top = [...shows2025]
        .sort((a, b) => b.appearances - a.appearances)
        .slice(0, 3);
      const chartInput = top.map((s) => ({
        name: s.show_name,
        value: s.appearances,
      }));

      return (
        <div className="space-y-4">
          <Top3BarChart data={chartInput} valueLabel="Auftritte" />
          <ol className="space-y-3">
            {top.map((s, idx) => (
              <li
                key={s.show_name}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 font-medium truncate">
                  {ordinal(idx + 1)} {s.show_name}
                </div>
                <div className="text-sm whitespace-nowrap text-muted-foreground">
                  {s.episodes} Episoden
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    if (page.key === "monthly") {
      const topPartyNames = topParties.map((p) => p.party_name);
      const partyLineData = partyMonthly2025.map((row) => ({
        ...row,
        monthLabel: MONTH_LABELS[row.month as string] || row.month,
      }));

      const partyChartConfig = Object.fromEntries(
        topPartyNames.map((p) => [
          p,
          { label: p, color: PARTY_COLORS[p] || "#6b7280" },
        ])
      ) satisfies ChartConfig;

      const topTopicIds = topTopics.map((t) => t.area_id);
      const topicIdToLabel = new Map(
        topTopics.map((t) => [t.area_id, t.area_label])
      );

      const topicMonthMap: Record<string, Record<number, number>> = {};
      topicRows2025.forEach((r) => {
        if (!topTopicIds.includes(r.political_area_id)) return;
        const d = new Date(r.episode_date);
        if (Number.isNaN(d.getTime())) return;
        const m = String(d.getMonth() + 1).padStart(2, "0");
        topicMonthMap[m] = topicMonthMap[m] || {};
        topicMonthMap[m][r.political_area_id] =
          (topicMonthMap[m][r.political_area_id] || 0) + 1;
      });

      const months = Array.from({ length: 12 }, (_, i) =>
        String(i + 1).padStart(2, "0")
      );
      const topicLineData = months.map((m) => {
        const base: Record<string, any> = {
          month: m,
          monthLabel: MONTH_LABELS[m] || m,
        };
        topTopicIds.forEach((id) => {
          base[`T${id}`] = topicMonthMap[m]?.[id] || 0;
        });
        return base;
      });

      const topicChartConfig = Object.fromEntries(
        topTopicIds.map((id) => [
          `T${id}`,
          {
            label: topicIdToLabel.get(id) || `T${id}`,
            color: POLITICAL_AREA_COLORS[id] || "#6b7280",
          },
        ])
      ) satisfies ChartConfig;

      return (
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold mb-2">
              Top Parteien (Monatsverlauf)
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <ChartContainer config={partyChartConfig} className="h-56">
                <LineChart
                  data={partyLineData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {topPartyNames.map((p) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={PARTY_COLORS[p] || "#6b7280"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">
              Top Themen (Monatsverlauf)
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <ChartContainer config={topicChartConfig} className="h-56">
                <LineChart
                  data={topicLineData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {topTopicIds.map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={`T${id}`}
                      name={topicIdToLabel.get(id) || `T${id}`}
                      stroke={POLITICAL_AREA_COLORS[id] || "#6b7280"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      );
    }

    if (page.key === "seasonality") {
      const chartConfig = {
        count: { label: "Auftritte", color: "var(--chart-1)" },
      } satisfies ChartConfig;

      const data = activityMonthly2025.map((d) => ({
        month: MONTH_LABELS[d.month] || d.month,
        count: d.count,
      }));

      return (
        <div className="rounded-md border bg-muted/40 p-3">
          <ChartContainer config={chartConfig} className="h-56">
            <BarChart
              data={data}
              margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                radius={8}
                name="Auftritte"
                fill="var(--chart-1)"
              >
                <LabelList
                  position="top"
                  dataKey="count"
                  fontSize={12}
                  className="fill-muted-foreground"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      );
    }

    if (page.key === "compare") {
      const showPolit = (compareData?.politicians || []).map((p) => ({
        name: p.politician_name,
        value: p.total_appearances,
      }));
      const showParty = (compareData?.parties || []).map((p) => ({
        name: p.party_name,
        value: p.count,
        fill: PARTY_COLORS[p.party_name] || "#6b7280",
      }));
      const showTopic = (compareData?.topics || []).map((t) => ({
        name: t.area_label,
        value: t.count,
        fill: POLITICAL_AREA_COLORS[t.area_id] || "#6b7280",
      }));

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show:</span>
            <NativeSelect
              value={compareShow}
              onChange={(e) => setCompareShow(e.target.value)}
            >
              {SHOW_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Politiker:</div>
            <Top3BarChart data={showPolit} valueLabel="Auftritte" />
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Parteien:</div>
            <Top3BarChart data={showParty} valueLabel="Auftritte" />
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Themen:</div>
            <Top3BarChart data={showTopic} valueLabel="Episoden" />
          </div>
        </div>
      );
    }

    if (page.key === "totals") {
      if (!summary2025) return null;
      return (
        <div className="grid gap-3">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Auftritte</div>
            <div className="text-2xl font-bold">
              {summary2025.total_appearances}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Episoden</div>
            <div className="text-2xl font-bold">
              {summary2025.total_episodes}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              Einzigartige Politiker
            </div>
            <div className="text-2xl font-bold">
              {summary2025.unique_politicians}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              Parteien vertreten
            </div>
            <div className="text-2xl font-bold">
              {summary2025.parties_represented}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }, [
    activityMonthly2025,
    compareData,
    compareShow,
    error,
    loading,
    page.key,
    partyMonthly2025,
    shows2025,
    summary2025,
    topicRows2025,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Jahresrückblick {YEAR}</DialogTitle>
          <DialogDescription>
            {page.title} — {page.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex-1 overflow-y-auto space-y-4">
          <div className="text-xs text-muted-foreground">
            Seite {pageIndex + 1} / {pageCount}
          </div>
          {content}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={!canGoBack}
          >
            Zurück
          </Button>
          {pageCount !== pageIndex + 1 ? (
            <Button
              onClick={() =>
                setPageIndex((p) => Math.min(pageCount - 1, p + 1))
              }
              disabled={!canGoNext}
            >
              Weiter
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Schließen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
