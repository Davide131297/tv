"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
} from "@/components/ui/chart";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ELECTION_WINDOW_DAYS,
  analyzeElectionPhases,
  buildCountdown,
  getAnalyzableElections,
  type AppearanceRow,
  type PartyPhaseStats,
} from "@/lib/election-phase-analysis";
import { PARTY_COLORS, type Wahl } from "@/types";

interface ElectionPhaseAnalysisProps {
  rows: AppearanceRow[];
  wahlen: Wahl[];
  unionMode: boolean;
  selectedParties: string[];
}

/** Parteien mit weniger Auftritten insgesamt werden ausgeblendet (zu wenig Daten) */
const MIN_APPEARANCES = 5;
/** Ab dieser Zahl an Auftritten in der Wahlphase gilt das Ergebnis als belastbarer */
const SMALL_SAMPLE = 60;
const MAX_COUNTDOWN_PARTIES = 6;
const WINDOW_WEEKS = ELECTION_WINDOW_DAYS / 7;

type Selection = "all" | "bundestag" | "landtag" | string;

const partyColor = (party: string) =>
  party === "Union" ? "var(--color-foreground)" : PARTY_COLORS[party] || "#6b7280";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatPct = (value: number, digits = 1) =>
  `${(value * 100).toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;

const formatSigned = (value: number, unit: string, digits = 1) =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${unit}`;

export default function ElectionPhaseAnalysis({
  rows,
  wahlen,
  unionMode,
  selectedParties,
}: ElectionPhaseAnalysisProps) {
  const [selection, setSelection] = useState<Selection>("all");

  const today = new Date().toISOString().slice(0, 10);
  const elections = useMemo(
    () => getAnalyzableElections(wahlen, rows, today),
    [wahlen, rows, today],
  );
  const allElectionDates = useMemo(() => elections.map((e) => e.date), [elections]);

  const selectedDates = useMemo(() => {
    if (selection === "all") return allElectionDates;
    if (selection === "bundestag")
      return elections.filter((e) => e.hasBundestagswahl).map((e) => e.date);
    if (selection === "landtag")
      return elections.filter((e) => !e.hasBundestagswahl).map((e) => e.date);
    return allElectionDates.filter((d) => d === selection);
  }, [selection, elections, allElectionDates]);

  const analysis = useMemo(
    () => analyzeElectionPhases(rows, selectedDates, allElectionDates, unionMode),
    [rows, selectedDates, allElectionDates, unionMode],
  );

  const visibleParties = useMemo(() => {
    const unionSelected = selectedParties.map((p) =>
      unionMode && (p === "CDU" || p === "CSU") ? "Union" : p,
    );
    return analysis.parties.filter(
      (p) =>
        p.electionCount + p.normalCount >= MIN_APPEARANCES &&
        (unionSelected.length === 0 || unionSelected.includes(p.party)),
    );
  }, [analysis, selectedParties, unionMode]);

  const countdown = useMemo(() => {
    const bins = buildCountdown(rows, selectedDates, unionMode);
    const parties = visibleParties
      .slice()
      .sort((a, b) => b.electionCount - a.electionCount)
      .slice(0, MAX_COUNTDOWN_PARTIES)
      .map((p) => p.party);
    const data = bins.map((bin) => {
      const point: Record<string, string | number | null> = {
        label: bin.label,
        tick: bin.tick,
      };
      parties.forEach((party) => {
        const count = (bin[party] as number) || 0;
        point[party] = bin.total ? Math.round((count / bin.total) * 1000) / 10 : null;
      });
      return point;
    });
    const windowBins = bins.filter((b) => b.inElectionWindow);
    return {
      data,
      parties,
      windowStart: windowBins[0]?.label,
      windowEnd: windowBins[windowBins.length - 1]?.label,
      electionBin: bins.find((b) => b.startWeek === 0)?.label,
    };
  }, [rows, selectedDates, unionMode, visibleParties]);

  const chartConfig: ChartConfig = useMemo(
    () =>
      visibleParties.reduce((config, p) => {
        config[p.party] = { label: p.party, color: partyColor(p.party) };
        return config;
      }, {} as ChartConfig),
    [visibleParties],
  );

  const deltaData = visibleParties.map((p) => ({
    party: p.party,
    delta: Math.round(p.shareDeltaPp * 10) / 10,
  }));

  const gainer = visibleParties[0];
  const loser = visibleParties[visibleParties.length - 1];
  const selectedLabel =
    selection === "all"
      ? `allen ${elections.length} Wahlterminen`
      : selection === "bundestag"
        ? "Bundestagswahlen"
        : selection === "landtag"
          ? "Landtagswahlen"
          : elections.find((e) => e.date === selection)?.label ?? "";

  if (elections.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medienfokus vor Wahlen</CardTitle>
        <CardDescription>
          Wie verändert sich die Talkshow-Präsenz der Parteien in den{" "}
          {WINDOW_WEEKS} Wochen vor einer Wahl? Verglichen wird die{" "}
          <strong>Wahlphase</strong> ({WINDOW_WEEKS} Wochen vor dem Wahltermin)
          mit der <strong>Normalphase</strong> (alle Sendungen, die weder in
          einer Wahlphase noch in der Woche nach einer Wahl liegen). Berücksichtigt
          werden alle Jahre; Show- und Sender-Filter gelten.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <label className="text-sm font-medium mb-2 block" htmlFor="wahl-select">
              Wahl auswählen:
            </label>
            <NativeSelect
              id="wahl-select"
              value={selection}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelection(e.target.value)
              }
            >
              <NativeSelectOption value="all">Alle Wahlen</NativeSelectOption>
              {elections.some((e) => e.hasBundestagswahl) && (
                <NativeSelectOption value="bundestag">Nur Bundestagswahlen</NativeSelectOption>
              )}
              {elections.some((e) => !e.hasBundestagswahl) && (
                <NativeSelectOption value="landtag">Nur Landtagswahlen</NativeSelectOption>
              )}
              {elections
                .slice()
                .reverse()
                .map((e) => (
                  <NativeSelectOption key={e.date} value={e.date}>
                    {e.label} · {formatDate(e.date)}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>
          {selectedParties.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Parteiauswahl aus dem Chart oben wird übernommen.
            </p>
          )}
        </div>

        {/* Kennzahlen */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Wahlphase"
            value={`${analysis.electionTotal} Auftritte`}
            hint={`in ${analysis.electionEpisodes} Sendungen`}
          />
          <StatTile
            label="Normalphase"
            value={`${analysis.normalTotal} Auftritte`}
            hint={`in ${analysis.normalEpisodes} Sendungen`}
          />
          {gainer && (
            <StatTile
              label="Größter Zugewinn"
              value={gainer.party}
              hint={`${formatSigned(gainer.shareDeltaPp, " Pp.")} Anteil`}
              color={partyColor(gainer.party)}
            />
          )}
          {loser && loser !== gainer && (
            <StatTile
              label="Größter Verlust"
              value={loser.party}
              hint={`${formatSigned(loser.shareDeltaPp, " Pp.")} Anteil`}
              color={partyColor(loser.party)}
            />
          )}
        </div>

        {analysis.electionTotal < SMALL_SAMPLE && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Achtung: Nur {analysis.electionTotal} Auftritte in der Wahlphase –
            einzelne Sendungen können das Ergebnis stark verschieben.
          </p>
        )}

        {/* Veränderung des Anteils (Vergleich zwischen Parteien) */}
        <section>
          <h3 className="font-semibold">Anteil an allen Auftritten: Wahlphase vs. Normalphase</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Veränderung in Prozentpunkten vor {selectedLabel}. Die Anteile summieren
            sich auf 100 % – gewinnt eine Partei Sendezeit, verlieren andere.
          </p>
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(200, deltaData.length * 40) }}
          >
            <BarChart
              data={deltaData}
              layout="vertical"
              margin={{ left: 8, right: 56, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
                className="fill-muted-foreground text-xs"
                domain={[
                  (min: number) => Math.min(-1, Math.floor(min)),
                  (max: number) => Math.max(1, Math.ceil(max)),
                ]}
              />
              <YAxis
                type="category"
                dataKey="party"
                tickLine={false}
                axisLine={false}
                width={110}
                tickFormatter={(v: string) => (v === "BÜNDNIS 90/DIE GRÜNEN" ? "Grüne" : v)}
                className="fill-muted-foreground text-xs"
              />
              <ReferenceLine x={0} stroke="var(--color-muted-foreground)" />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                content={<DeltaTooltip parties={visibleParties} />}
              />
              <Bar dataKey="delta" radius={4} maxBarSize={22}>
                {deltaData.map((d) => (
                  <Cell key={d.party} fill={partyColor(d.party)} />
                ))}
                <LabelList
                  dataKey="delta"
                  position="right"
                  className="fill-foreground text-xs"
                  formatter={(v) => formatSigned(Number(v), "")}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>

        {/* Countdown-Verlauf */}
        <section>
          <div className="mb-3">
            <h3 className="font-semibold">Countdown zur Wahl</h3>
            <p className="text-sm text-muted-foreground">
              Anteil an allen Auftritten in 2-Wochen-Schritten vor und nach dem Wahltermin
              {selectedDates.length > 1 ? ` (${selectedDates.length} Wahltermine zusammengefasst)` : ""}.
              Markiert: die letzten {WINDOW_WEEKS} Wochen vor der Wahl.
            </p>
          </div>
          <div className="scrollbar-visible -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div style={{ minWidth: 640 }}>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <LineChart
                  data={countdown.data}
                  margin={{ top: 24, left: 4, right: 28, bottom: 4 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  {countdown.windowStart && countdown.windowEnd && (
                    <ReferenceArea
                      x1={countdown.windowStart}
                      x2={countdown.windowEnd}
                      fill="var(--color-muted-foreground)"
                      fillOpacity={0.08}
                      label={{
                        value: `${WINDOW_WEEKS} Wochen vor der Wahl`,
                        position: "insideTop",
                        fill: "var(--color-muted-foreground)",
                        fontSize: 11,
                      }}
                    />
                  )}
                  {countdown.electionBin && (
                    <ReferenceLine
                      x={countdown.electionBin}
                      stroke="var(--color-foreground)"
                      strokeWidth={1.5}
                    />
                  )}
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    tickFormatter={(_v, index) => String(countdown.data[index]?.tick ?? "")}
                    className="fill-muted-foreground text-xs"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v) => `${v} %`}
                    className="fill-muted-foreground text-xs"
                  />
                  <ChartTooltip
                    content={<CountdownTooltip />}
                  />
                  {countdown.parties.map((party) => (
                    <Line
                      key={party}
                      dataKey={party}
                      type="monotone"
                      stroke={partyColor(party)}
                      strokeWidth={2}
                      connectNulls
                      dot={{ r: 3, fill: partyColor(party) }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {countdown.parties.map((party) => (
              <span key={party} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: partyColor(party) }}
                />
                {party}
              </span>
            ))}
          </div>
        </section>

        {/* Tabelle: Anteile je Partei */}
        <section>
          <h3 className="font-semibold">Alle Parteien im Überblick</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Anteil jeder Partei an allen Auftritten in der Wahlphase verglichen mit
            ihrem eigenen Anteil in der Normalphase.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partei</TableHead>
                  <TableHead className="text-right">Auftritte Wahlphase</TableHead>
                  <TableHead className="text-right">Anteil Wahlphase</TableHead>
                  <TableHead className="text-right">Anteil Normal</TableHead>
                  <TableHead className="text-right">Δ Anteil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleParties.map((p) => (
                  <TableRow key={p.party}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: partyColor(p.party) }}
                        />
                        {p.party}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.electionCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(p.electionShare)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPct(p.normalShare)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatSigned(p.shareDeltaPp, " Pp.")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Parteien mit weniger als {MIN_APPEARANCES} Auftritten insgesamt sind
            ausgeblendet. Überschneiden sich Wahlphasen mehrerer Wahlen (z. B.
            Bundestagswahl und Hamburg-Wahl 2025), zählt eine Sendung nur einmal
            zur Wahlphase.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold leading-tight">
        {color && (
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-[3px]"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{value}</span>
      </div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-3 text-xs shadow-lg">{children}</div>
  );
}

function DeltaTooltip({ active, payload, parties }: TooltipProps & { parties: PartyPhaseStats[] }) {
  if (!active || !payload?.length) return null;
  const stats = parties.find((p) => p.party === payload[0].payload.party);
  if (!stats) return null;
  return (
    <TooltipBox>
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <span
          className="inline-block h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: partyColor(stats.party) }}
        />
        {stats.party}
      </div>
      <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        <span className="text-muted-foreground">Wahlphase</span>
        <span className="text-right tabular-nums">
          {formatPct(stats.electionShare)} ({stats.electionCount})
        </span>
        <span className="text-muted-foreground">Normalphase</span>
        <span className="text-right tabular-nums">
          {formatPct(stats.normalShare)} ({stats.normalCount})
        </span>
        <span className="text-muted-foreground">Veränderung</span>
        <span className="text-right font-semibold tabular-nums">
          {formatSigned(stats.shareDeltaPp, " Pp.")}
        </span>
      </div>
    </TooltipBox>
  );
}

function CountdownTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((item) => item.value !== null && item.value !== undefined)
    .sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <TooltipBox>
      <div className="mb-1 font-semibold">{label} zur Wahl</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">
            {Number(item.value).toLocaleString("de-DE")}
            {" %"}
          </span>
        </div>
      ))}
    </TooltipBox>
  );
}
