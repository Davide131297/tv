"use client";

import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import type {
  PoliticalAreasChartPropsExtended,
  PoliticalAreaEpisodeRow,
} from "@/types";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Tooltip as ChadcnTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ChannelOptionsButtons from "./ChannelOptionsButtons";

import { POLITICAL_AREA_COLORS } from "@/lib/political-area-colors";

export default function PoliticalAreasChart({
  data,
  rows,
  selectedShow,
  selectedYear,
  years,
  handleYearChange,
}: PoliticalAreasChartPropsExtended) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  // Sortiere Daten nach Anzahl
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Dynamischer Titel basierend auf der ausgewählten Show
  const getTitle = () => {
    switch (selectedShow) {
      case "all":
        return "Politische Themen in allen Shows";
      case "Markus Lanz":
        return "Politische Themen bei Markus Lanz";
      case "Maybrit Illner":
        return "Politische Themen bei Maybrit Illner";
      case "Caren Miosga":
        return "Politische Themen bei Caren Miosga";
      case "Maischberger":
        return "Politische Themen bei Maischberger";
      case "Hart aber fair":
        return "Politische Themen bei Hart aber fair";
      default:
        return "Politische Themen alle Shows";
    }
  };

  // Erstelle feste Zuordnung von area_id zu T-Nummer
  const AREA_ID_TO_T_NUMBER: Record<number, string> = {
    1: "T1", // Energie, Klima und Versorgungssicherheit
    2: "T2", // Wirtschaft, Innovation und Wettbewerbsfähigkeit
    3: "T3", // Sicherheit, Verteidigung und Außenpolitik
    4: "T4", // Migration, Integration und gesellschaftlicher Zusammenhalt
    5: "T5", // Haushalt, öffentliche Finanzen und Sozialpolitik
    6: "T6", // Digitalisierung, Medien und Demokratie
    7: "T7", // Kultur, Identität und Erinnerungspolitik
  };

  // Erstelle Chart-Daten mit festen T-Nummern (sortiert nach Häufigkeit für Anzeige)
  const chartData = sortedData.map((item) => ({
    thema: AREA_ID_TO_T_NUMBER[item.area_id] || `T${item.area_id}`,
    auftritte: item.count,
    full_label: item.area_label,
    area_id: item.area_id,
    fill: POLITICAL_AREA_COLORS[item.area_id] || "#6b7280",
  }));

  // Chart-Konfiguration
  const chartConfig = {
    auftritte: {
      label: "Themen-Auftritte",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const totalAuftritte = sortedData.reduce((sum, item) => sum + item.count, 0);

  const monthLabels = [
    "Jan",
    "Feb",
    "Mär",
    "Apr",
    "Mai",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dez",
  ];

  // Detect mobile viewport to adapt timeline for small screens
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640); // tailwind 'sm' breakpoint
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Build monthly timeline data.
  // If the user selected "all" years, build a month-year timeline (e.g. Jan 2023, Feb 2023, ...)
  // spanning from the earliest to the latest episode in `rows`. Otherwise build a Jan-Dec
  // aggregation for the selected single year.
  let monthlyData: Record<string, any>[] = [];

  if (selectedYear === "all") {
    // Build continuous month-year buckets between min and max episode_date
    if (rows && rows.length > 0) {
      // find min and max dates
      const dates = rows
        .map((r: PoliticalAreaEpisodeRow) => {
          try {
            return new Date(r.episode_date);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Date[];

      if (dates.length > 0) {
        let minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        let maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        // normalize to first day of month
        minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

        const buckets: { key: string; label: string; date: Date }[] = [];
        const cur = new Date(minDate);
        while (cur.getTime() <= maxDate.getTime()) {
          const y = cur.getFullYear();
          const m = cur.getMonth();
          const key = `${y}-${String(m + 1).padStart(2, "0")}`; // e.g. 2024-01
          const label = `${monthLabels[m]} ${y}`; // e.g. Jan 2024
          buckets.push({ key, label, date: new Date(cur) });
          cur.setMonth(cur.getMonth() + 1);
        }

        // initialize monthlyData with zeroed keys for each T
        monthlyData = buckets.map((b) => {
          const base: Record<string, any> = { month: b.label, __key: b.key };
          sortedData.forEach((item) => {
            const k = AREA_ID_TO_T_NUMBER[item.area_id] || `T${item.area_id}`;
            base[k] = 0;
          });
          return base;
        });

        // fill counts
        rows.forEach((r: PoliticalAreaEpisodeRow) => {
          try {
            if (!r || !r.episode_date) return;
            const d = new Date(r.episode_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}`;
            const idx = monthlyData.findIndex((md) => md.__key === key);
            if (idx === -1) return;
            const k =
              AREA_ID_TO_T_NUMBER[r.political_area_id] ||
              `T${r.political_area_id}`;
            if (monthlyData[idx][k] === undefined) monthlyData[idx][k] = 0;
            monthlyData[idx][k]++;
          } catch (e) {
            console.warn(
              "Fehler beim Verarbeiten der Episode für Timeline:",
              r,
              e
            );
          }
        });
      }
    }
  } else {
    // Single-year view: Jan - Dez buckets
    monthlyData = monthLabels.map((label) => {
      const base: Record<string, any> = { month: label };
      sortedData.forEach((item) => {
        const key = AREA_ID_TO_T_NUMBER[item.area_id] || `T${item.area_id}`;
        base[key] = 0;
      });
      return base;
    });

    if (rows && rows.length > 0) {
      rows.forEach((r: PoliticalAreaEpisodeRow) => {
        try {
          if (!r || !r.episode_date) return;
          const d = new Date(r.episode_date);
          const monthIndex = d.getMonth();
          if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11)
            return;
          const key =
            AREA_ID_TO_T_NUMBER[r.political_area_id] ||
            `T${r.political_area_id}`;
          if (monthlyData[monthIndex][key] === undefined)
            monthlyData[monthIndex][key] = 0;
          monthlyData[monthIndex][key]++;
        } catch (e) {
          console.warn("Fehler beim Verarbeiten der Episode:", r, e);
        }
      });
    }
  }

  const UnifiedTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;

    const first = payload[0];
    const firstPayload = first && first.payload ? first.payload : null;

    return (
      <div
        style={{ backgroundColor: "#ffffff", opacity: 1, zIndex: 9999 }}
        className="px-3 py-2 border border-gray-200 rounded shadow-md text-xs"
      >
        {firstPayload && firstPayload.full_label ? (
          <div>
            <p className="font-medium text-gray-900 leading-tight">
              {firstPayload.full_label}
            </p>
            <p className="text-gray-600 leading-tight">
              {label}: {firstPayload.auftritte} Episoden
            </p>
          </div>
        ) : (
          // Line chart: list each series value for the month
          <div>
            <p className="font-medium text-gray-900 leading-tight">{label}</p>
            <div className="mt-1 space-y-1">
              {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded"
                    style={{ backgroundColor: p.stroke || "#6b7280" }}
                  />
                  <span className="text-gray-700 text-xs">{p.name}</span>
                  <span className="ml-2 text-gray-900 text-xs font-medium">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription className="hidden">
          Verteilung der politischen Themenbereiche
        </CardDescription>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Jahr auswählen:
          </label>
          <NativeSelect
            value={selectedYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleYearChange && handleYearChange(e.target.value)
            }
          >
            <NativeSelectOption value="all">Insgesamt</NativeSelectOption>
            {years &&
              years.map((y) => (
                <NativeSelectOption key={y} value={y}>
                  {y}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        </div>
        <ChannelOptionsButtons />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-8">
          {/* Timeline (line chart) */}
          <div className="w-full bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">
              Themen nach Zeitverlauf
            </h3>
            <div className="max-h-[420px] overflow-y-auto">
              {/* Custom per-month stacked bars so each month shows segments ordered
                  from largest to smallest (left → right). This is implemented
                  with simple flex-based divs rather than Recharts to allow
                  per-row ordering of segments. */}
              <div className="space-y-2">
                {monthlyData.map((md) => {
                  // build segments for this month
                  const segments = Object.entries(md)
                    .filter(([k]) => k !== "month" && k !== "__key")
                    .map(([k, v]) => ({ key: k, value: Number(v) }))
                    .map((s) => {
                      // find meta (label + color) for this key
                      const metaItem = sortedData.find(
                        (it) =>
                          (AREA_ID_TO_T_NUMBER[it.area_id] ||
                            `T${it.area_id}`) === s.key
                      );
                      return {
                        ...s,
                        label: metaItem?.area_label || s.key,
                        color: metaItem
                          ? POLITICAL_AREA_COLORS[metaItem.area_id]
                          : "#6b7280",
                      };
                    })
                    .sort((a, b) => b.value - a.value);

                  const total = segments.reduce((sum, s) => sum + s.value, 0);

                  return (
                    <div
                      key={md.__key || md.month}
                      className="flex items-center"
                    >
                      <div className="w-10 text-xs text-gray-700">
                        {md.month}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6 flex">
                        {segments.map((seg) => {
                          const pct = total > 0 ? (seg.value / total) * 100 : 0;
                          return (
                            <ChadcnTooltip key={seg.key}>
                              <TooltipTrigger asChild>
                                <div
                                  key={seg.key}
                                  title={`${seg.label}: ${seg.value}`}
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: seg.color,
                                  }}
                                  className="h-full"
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{`${seg.label}: ${seg.value}`}</p>
                              </TooltipContent>
                            </ChadcnTooltip>
                          );
                        })}
                      </div>
                      <div className="w-12 text-right text-sm text-gray-700">
                        {total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-md">
            <h3 className="text-sm font-semibold mb-3">
              Verteilung der politischen Themenbereiche
            </h3>
            <ChartContainer config={chartConfig}>
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{
                  top: 20,
                  bottom: 40,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="thema"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  fontSize={12}
                  className="text-sm"
                  interval={0}
                />
                <Tooltip
                  content={<UnifiedTooltip />}
                  wrapperStyle={{ zIndex: 9999, pointerEvents: "auto" }}
                />
                <Bar dataKey="auftritte" radius={8}>
                  <LabelList
                    position="top"
                    offset={8}
                    className="fill-foreground text-xs"
                    fontSize={10}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Legende */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Themenbereiche (feste Zuordnung):
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {/* Zeige alle verfügbaren Themen in fester Reihenfolge */}
              {Object.entries(AREA_ID_TO_T_NUMBER)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([areaId, tNumber]) => {
                  const chartItem = chartData.find(
                    (item) => item.area_id === parseInt(areaId)
                  );
                  const isPresent = !!chartItem;

                  // Fallback für Themennamen basierend auf area_id
                  const getThemeName = (id: number) => {
                    switch (id) {
                      case 1:
                        return "Energie, Klima und Versorgungssicherheit";
                      case 2:
                        return "Wirtschaft, Innovation und Wettbewerbsfähigkeit";
                      case 3:
                        return "Sicherheit, Verteidigung und Außenpolitik";
                      case 4:
                        return "Migration, Integration und gesellschaftlicher Zusammenhalt";
                      case 5:
                        return "Haushalt, öffentliche Finanzen und Sozialpolitik";
                      case 6:
                        return "Digitalisierung, Medien und Demokratie";
                      case 7:
                        return "Kultur, Identität und Erinnerungspolitik";
                      default:
                        return "Unbekanntes Thema";
                    }
                  };

                  const themeName =
                    chartItem?.full_label || getThemeName(parseInt(areaId));

                  return (
                    <div
                      key={areaId}
                      className={`flex items-center gap-2 ${
                        !isPresent ? "opacity-50" : ""
                      }`}
                      style={{ alignItems: "center" }}
                    >
                      <div
                        className="w-3 h-3 rounded"
                        style={{
                          backgroundColor:
                            POLITICAL_AREA_COLORS[parseInt(areaId)] ||
                            "#6b7280",
                        }}
                      />
                      <span className="font-medium">{tNumber}:</span>
                      <span className="text-gray-600">{themeName}</span>
                      {!isPresent && (
                        <span className="text-xs text-gray-400">
                          (nicht vorhanden)
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Gesamt: {totalAuftritte} Themen-Auftritte{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Anzahl der Episoden nach politischen Themenbereichen sortiert
        </div>
      </CardFooter>
    </Card>
  );
}
