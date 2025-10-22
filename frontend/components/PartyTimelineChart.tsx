"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PARTY_COLORS } from "@/types";

interface MonthlyPartyStats {
  month: string;
  [party: string]: string | number;
}

interface PartyTimelineChartProps {
  data: MonthlyPartyStats[];
  parties: string[];
  selectedShow?: string;
  year?: string;
}

export default function PartyTimelineChart({
  data,
  parties,
  selectedShow,
  year,
}: PartyTimelineChartProps) {
  // Dynamischer Titel basierend auf der ausgewählten Show
  const getTitle = () => {
    const baseTitle = `Partei-Auftritte ${year || "2025"}`;
    switch (selectedShow) {
      case "all":
        return `${baseTitle} - Alle Shows`;
      case "Markus Lanz":
        return `${baseTitle} - Markus Lanz`;
      case "Maybrit Illner":
        return `${baseTitle} - Maybrit Illner`;
      case "Caren Miosga":
        return `${baseTitle} - Caren Miosga`;
      case "Maischberger":
        return `${baseTitle} - Maischberger`;
      case "Hart aber fair":
        return `${baseTitle} - Hart aber fair`;
      case "Phoenix Runde":
        return `${baseTitle} - Phoenix Runde`;
      default:
        return `${baseTitle} - Alle Shows`;
    }
  };

  // Erstelle Chart-Konfiguration dynamisch basierend auf Parteien
  const chartConfig: ChartConfig = parties.reduce((config, party) => {
    config[party] = {
      label: party,
      color: PARTY_COLORS[party] || "#6b7280",
    };
    return config;
  }, {} as ChartConfig);

  // Berechne Gesamtauftritte
  const totalAppearances = data.reduce((sum, monthData) => {
    return (
      sum +
      parties.reduce((monthSum, party) => {
        return monthSum + ((monthData[party] as number) || 0);
      }, 0)
    );
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Monatliche Entwicklung der Partei-Auftritte über das Jahr
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
              left: 12,
              right: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {parties.map((party) => (
              <Line
                key={party}
                dataKey={party}
                type="monotone"
                stroke={PARTY_COLORS[party] || "#6b7280"}
                strokeWidth={2}
                dot={{
                  fill: PARTY_COLORS[party] || "#6b7280",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Gesamt: {totalAppearances} Auftritte{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Verteilung der Partei-Auftritte nach Monaten im Jahr {year || "2025"}
        </div>
      </CardFooter>
    </Card>
  );
}
