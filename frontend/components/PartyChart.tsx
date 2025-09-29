"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import type { PartyChartProps } from "@/types";
import { PARTY_COLORS } from "@/types";

export default function PartyChart({ data, selectedShow }: PartyChartProps) {
  // Sortiere Daten nach Anzahl
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Dynamischer Titel basierend auf der ausgewählten Show
  const getTitle = () => {
    switch (selectedShow) {
      case "all":
        return "Partei-Auftritte in allen Shows";
      case "Markus Lanz":
        return "Partei-Auftritte bei Markus Lanz";
      case "Maybrit Illner":
        return "Partei-Auftritte bei Maybrit Illner";
      case "Caren Miosga":
        return "Partei-Auftritte bei Caren Miosga";
      case "Maischberger":
        return "Partei-Auftritte bei Maischberger";
      default:
        return "Partei-Auftritte";
    }
  };

  // Transformiere Daten für recharts
  const chartData = sortedData.map((item) => ({
    party: item.party_name,
    auftritte: item.count,
    fill: PARTY_COLORS[item.party_name] || "#6b7280",
  }));

  // Chart-Konfiguration
  const chartConfig = {
    auftritte: {
      label: "Auftritte",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const totalAuftritte = sortedData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Verteilung der Politiker nach Parteien
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="party"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={120}
              fontSize={10}
              className="text-xs sm:text-sm"
              interval={0}
            />
            <Bar dataKey="auftritte" radius={8}>
              <LabelList
                position="top"
                offset={8}
                className="fill-foreground text-xs sm:text-sm"
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Gesamt: {totalAuftritte} Auftritte <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Anzahl der Politiker-Auftritte nach Parteien sortiert
        </div>
      </CardFooter>
    </Card>
  );
}
