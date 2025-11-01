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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

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
  selectedYear: string;
  handleYearChange: (year: string) => void;
  years: string[];
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
  selectedYear,
  handleYearChange,
  years,
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
    const newData: MonthlyPartyStats[] = unionMode
      ? data.map((monthData) => {
          const { CDU = 0, CSU = 0, ...rest } = monthData;
          return {
            ...rest,
            Union: (CDU as number) + (CSU as number),
          };
        })
      : data;

    const newParties = unionMode
      ? parties
          .filter((p) => p !== "CDU" && p !== "CSU")
          .concat(
            parties.includes("CDU") || parties.includes("CSU") ? ["Union"] : []
          )
      : parties.slice();

    const totals: Record<string, number> = newParties.reduce(
      (acc: Record<string, number>, p: string) => {
        acc[p] = newData.reduce(
          (sum: number, month: MonthlyPartyStats) =>
            sum + ((month[p] as number) || 0),
          0
        );
        return acc;
      },
      {}
    );

    const sortedParties = newParties.slice().sort((a: string, b: string) => {
      return (totals[b] || 0) - (totals[a] || 0);
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

  const yearValue = selectedYear ?? year ?? "all";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Monatliche Entwicklung der Partei-Auftritte über das Jahr
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-4">
          {/* Year Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Jahr auswählen:
            </label>
            {/* Use either selectedYear prop or fallback to year prop for robustness */}
            <NativeSelect
              value={yearValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleYearChange?.(e.target.value)
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
        </div>

        {/* Party Selection Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {processedData.parties.map((party) => (
            <button
              key={party}
              onClick={() => toggleParty(party)}
              className={`cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
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
              className="cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Alle anzeigen
            </button>
          )}
        </div>

        {/* Chart Container mit sichtbarer horizontaler Scrollbar */}
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 scrollbar-visible bg-gray-50 rounded-md">
          {/* Make the inner container wider depending on number of months so user can scroll */}
          <div
            style={{ minWidth: Math.max(600, processedData.data.length * 80) }}
          >
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
                  tickFormatter={(value) => {
                    // expected month format: YYYY-MM, fallback: take first 3 chars
                    if (
                      typeof value === "string" &&
                      /^\d{4}-\d{2}$/.test(value)
                    ) {
                      const d = new Date(`${value}-01`);
                      try {
                        return d.toLocaleString("de-DE", {
                          month: "short",
                          year: "2-digit",
                        });
                      } catch {
                        return value.slice(5);
                      }
                    }
                    if (typeof value === "string") return value.slice(0, 3);
                    return String(value);
                  }}
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
          Verteilung der Partei-Auftritte nach Monaten im Jahr{" "}
          {year === "all" ? "Alle Jahre" : year || "2025"}
        </div>
      </CardFooter>
    </Card>
  );
}
