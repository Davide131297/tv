"use client";

import { useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  unionMode: boolean;
  selectedParties: string[];
  onUnionModeChange: (value: boolean) => void;
  onSelectedPartiesChange: (parties: string[]) => void;
}

export default function PartyTimelineChart({
  data,
  parties,
  selectedShow,
  year,
  unionMode,
  selectedParties,
  onUnionModeChange,
  onSelectedPartiesChange,
}: PartyTimelineChartProps) {
  const toggleParty = (party: string) => {
    const newSelection = selectedParties.includes(party)
      ? selectedParties.filter((p) => p !== party)
      : [...selectedParties, party];
    onSelectedPartiesChange(newSelection);
  };

  const isPartySelected = (party: string) =>
    selectedParties.length === 0 || selectedParties.includes(party);

  // CDU & CSU zu Union zusammenfassen
  const processedData = useMemo(() => {
    if (!unionMode) return { data, parties };

    const newData = data.map((monthData) => {
      const { CDU = 0, CSU = 0, ...rest } = monthData;
      return {
        ...rest,
        Union: (CDU as number) + (CSU as number),
      };
    });

    const newParties = parties
      .filter((p) => p !== "CDU" && p !== "CSU")
      .concat(
        parties.includes("CDU") || parties.includes("CSU") ? ["Union"] : []
      );

    // Sortiere Parteien nach Gesamtauftritten
    const sortedParties = newParties.sort((a: string, b: string) => {
      const totalA = newData.reduce(
        (sum: number, month: MonthlyPartyStats) =>
          sum + ((month[a] as number) || 0),
        0
      );
      const totalB = newData.reduce(
        (sum: number, month: MonthlyPartyStats) =>
          sum + ((month[b] as number) || 0),
        0
      );
      return totalB - totalA;
    });

    return { data: newData, parties: sortedParties };
  }, [data, parties, unionMode]);

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
  const chartConfig: ChartConfig = processedData.parties.reduce(
    (config, party) => {
      config[party] = {
        label: party,
        color: party === "Union" ? "#000000" : PARTY_COLORS[party] || "#6b7280",
      };
      return config;
    },
    {} as ChartConfig
  );

  // Berechne Gesamtauftritte
  const totalAppearances = processedData.data.reduce(
    (sum: number, monthData: MonthlyPartyStats) => {
      return (
        sum +
        processedData.parties.reduce((monthSum: number, party: string) => {
          const value = monthData[party];
          return monthSum + (typeof value === "number" ? value : 0);
        }, 0)
      );
    },
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Monatliche Entwicklung der Partei-Auftritte über das Jahr
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Union Mode Switch */}
        <div className="mb-4 flex items-center gap-2">
          <Switch
            id="union-switch"
            checked={unionMode}
            onCheckedChange={onUnionModeChange}
          />
          <label
            htmlFor="union-switch"
            className="text-sm select-none cursor-pointer"
          >
            CDU & CSU als Union zusammenfassen
          </label>
        </div>

        {/* Party Selection Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {processedData.parties.map((party) => (
            <button
              key={party}
              onClick={() => toggleParty(party)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isPartySelected(party)
                  ? "opacity-100"
                  : "opacity-40 hover:opacity-60"
              }`}
              style={{
                backgroundColor: isPartySelected(party)
                  ? party === "Union"
                    ? "#000000"
                    : PARTY_COLORS[party] || "#6b7280"
                  : "#e5e7eb",
                color: isPartySelected(party) ? "white" : "#6b7280",
              }}
            >
              {party}
            </button>
          ))}
          {selectedParties.length > 0 && (
            <button
              onClick={() => onSelectedPartiesChange([])}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Alle anzeigen
            </button>
          )}
        </div>

        {/* Chart Container mit sichtbarer horizontaler Scrollbar */}
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 scrollbar-visible">
          <div className="min-w-[600px] sm:min-w-full">
            <ChartContainer
              config={chartConfig}
              className="h-[350px] sm:h-[400px]"
            >
              <LineChart
                accessibilityLayer
                data={processedData.data}
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
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                {processedData.parties.map((party) => {
                  const isSelected = isPartySelected(party);
                  const color =
                    party === "Union"
                      ? "#000000"
                      : PARTY_COLORS[party] || "#6b7280";
                  return (
                    <Line
                      key={party}
                      dataKey={party}
                      type="monotone"
                      stroke={isSelected ? color : "#d1d5db"}
                      strokeWidth={isSelected ? 2 : 1}
                      strokeOpacity={isSelected ? 1 : 0.3}
                      dot={{
                        fill: isSelected ? color : "#d1d5db",
                        r: isSelected ? 4 : 2,
                        fillOpacity: isSelected ? 1 : 0.3,
                      }}
                      activeDot={{
                        r: isSelected ? 6 : 3,
                      }}
                    />
                  );
                })}
              </LineChart>
            </ChartContainer>
          </div>
        </div>

        {/* Hinweis für Mobile Nutzer */}
        <div className="sm:hidden text-xs text-muted-foreground text-center mt-2">
          ← Wische horizontal um alle Daten zu sehen →
        </div>
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
