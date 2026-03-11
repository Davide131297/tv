"use client";

import { TrendingUp, Filter } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Switch } from "./ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PartyChartProps } from "@/types";
import { PARTY_COLORS } from "@/types";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import ChannelOptionsButtons from "./ChannelOptionsButtons";

export default function PartyChart({
  data,
  selectedShow,
  selectedYear,
  years,
  handleYearChange,
  unionMode,
  onUnionChange,
}: PartyChartProps) {
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
      case "Hart aber fair":
        return "Partei-Auftritte bei Hart aber fair";
      default:
        return "Partei-Auftritte alle Shows";
    }
  };

  // Transformiere Daten für recharts
  const chartData = sortedData.map((item) => ({
    party: item.party_name,
    Auftritte: item.count,
    fill: PARTY_COLORS[item.party_name] || "#6b7280",
  }));

  // Chart-Konfiguration
  const chartConfig = {
    Auftritte: {
      label: "Auftritte",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const totalAuftritte = sortedData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="border-none shadow-lg bg-white/50 dark:bg-transparent dark:border-solid dark:border-gray-800 dark:border overflow-hidden mb-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
              Verteilung der Politiker nach Parteien{" "}
              {selectedYear !== "all" && `im Jahr ${selectedYear}`}
            </CardDescription>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-sm shrink-0 border border-blue-100 dark:border-blue-800/50">
            <TrendingUp className="h-4 w-4" />
            <span>Gesamt: {totalAuftritte} Auftritte</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between mt-3 gap-5 md:gap-0">
          <div className="flex flex-col md:flex-row gap-2.5 md:gap-10">
            <div>
              <label className="text-sm font-medium mb-2 block dark:text-gray-300">Jahr:</label>
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
          </div>
          <div className="flex items-center gap-2 ml-0 md:ml-6">
            <Switch
              id="union-switch"
              checked={unionMode}
              onCheckedChange={onUnionChange}
            />
            <label
              htmlFor="union-switch"
              className="text-sm select-none cursor-pointer dark:text-gray-300"
            >
              CDU & CSU als Union zusammenfassen
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-6 px-2 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[430px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 30,
              bottom: 40,
              left: -15,
              right: 15,
            }}
          >
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`colorGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={entry.fill} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={entry.fill} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="4 4"
              stroke="var(--color-border)"
            />
            <XAxis
              dataKey="party"
              tickLine={false}
              tickMargin={15}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={140}
              className="text-xs sm:text-sm font-medium fill-slate-600 dark:fill-slate-400"
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              className="text-xs sm:text-sm font-medium fill-slate-500 dark:fill-slate-400"
            />
            <ChartTooltip
              cursor={{ fill: "rgba(100, 116, 139, 0.1)" }}
              content={
                <ChartTooltipContent className="bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 shadow-xl rounded-xl dark:text-slate-100" />
              }
            />
            <Bar
              dataKey="Auftritte"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#colorGradient-${index})`}
                  stroke={entry.fill}
                  strokeWidth={1}
                />
              ))}
              <LabelList
                dataKey="Auftritte"
                position="top"
                offset={10}
                className="fill-slate-700 font-bold"
                content={(props: any) => {
                  const { x, y, width, value } = props;
                  const radius = 10;
                  // Dynamische Schriftgröße: Wenn der Balken sehr schmal ist (z.B. auf Handys bei vielen Parteien)
                  // oder die Zahl sehr groß ist
                  const fontSize = width < 30 ? 10 : 12;

                  return (
                    <text
                      x={x + width / 2}
                      y={y - radius}
                      fill="currentColor"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs sm:text-sm font-bold fill-slate-700 dark:fill-slate-300"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {value}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
