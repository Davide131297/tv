"use client";

import { TrendingUp } from "lucide-react";
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
import type { PoliticalAreasChartProps } from "@/types";

// Color scheme for political areas
const POLITICAL_AREA_COLORS: Record<number, string> = {
  1: "#ef4444", // Energie, Klima - Rot
  2: "#3b82f6", // Wirtschaft - Blau
  3: "#7c3aed", // Sicherheit, Verteidigung - Lila
  4: "#059669", // Migration, Integration - Grün
  5: "#dc2626", // Haushalt, Sozialpolitik - Dunkelrot
  6: "#0891b2", // Digitalisierung - Cyan
  7: "#ea580c", // Kultur, Identität - Orange
};

export default function PoliticalAreasChart({
  data,
  selectedShow,
}: PoliticalAreasChartProps) {
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

  // Custom Tooltip Komponente
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { full_label: string; auftritte: number } }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-2 py-1 border border-gray-200 rounded shadow-md text-xs">
          <p className="font-medium text-gray-900 leading-tight">
            {data.full_label}
          </p>
          <p className="text-gray-600 leading-tight">
            {label}: {data.auftritte} Episoden
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Verteilung der politischen Themenbereiche
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Tooltip content={<CustomTooltip />} />
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

        {/* Legende */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
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
                  >
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor:
                          POLITICAL_AREA_COLORS[parseInt(areaId)] || "#6b7280",
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
