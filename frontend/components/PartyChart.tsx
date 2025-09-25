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

interface PartyStats {
  party_name: string;
  count: number;
}

interface PartyChartProps {
  data: PartyStats[];
  selectedShow?: string;
}

// Party colors für recharts
const PARTY_COLORS: Record<string, string> = {
  CDU: "#000000",
  CSU: "#1e40af",
  SPD: "#dc2626",
  FDP: "#facc15",
  "Die Linke": "#9333ea",
  "BÜNDNIS 90/DIE GRÜNEN": "#22c55e",
  Grüne: "#22c55e",
  AfD: "#2563eb",
  BSW: "#a16207",
  parteilos: "#6b7280",
};

export default function PartyChart({ data, selectedShow }: PartyChartProps) {
  // Sortiere Daten nach Anzahl
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Dynamischer Titel basierend auf der ausgewählten Show
  const getTitle = () => {
    switch (selectedShow) {
      case "all":
        return "Partei-Auftritte in beiden Shows";
      case "Markus Lanz":
        return "Partei-Auftritte bei Markus Lanz";
      case "Maybrit Illner":
        return "Partei-Auftritte bei Maybrit Illner";
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
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="party"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-30}
              textAnchor="end"
              height={110}
              fontSize={11}
            />
            <Bar dataKey="auftritte" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
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
