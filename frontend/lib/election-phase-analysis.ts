import type { Wahl } from "@/types";

/**
 * Analyse: Wie verändert sich die Talkshow-Präsenz der Parteien, wenn eine Wahl
 * bevorsteht? Verglichen wird die "Wahlphase" (die N Tage vor einem Wahltermin)
 * mit der "Normalphase" (alle Sendungen, die weder vor noch kurz nach einer Wahl liegen).
 */

export interface AppearanceRow {
  party_name: string;
  episode_date: string; // YYYY-MM-DD
  show_name: string;
}

export interface ElectionGroup {
  /** Wahltermin (YYYY-MM-DD); Wahlen am selben Tag werden zusammengefasst */
  date: string;
  wahlen: Wahl[];
  hasBundestagswahl: boolean;
  label: string;
}

export interface PartyPhaseStats {
  party: string;
  electionCount: number;
  normalCount: number;
  /** Anteil an allen Partei-Auftritten in der Wahlphase (0–1) */
  electionShare: number;
  normalShare: number;
  /** Differenz in Prozentpunkten */
  shareDeltaPp: number;
}

export interface PhaseAnalysisResult {
  parties: PartyPhaseStats[];
  electionTotal: number;
  normalTotal: number;
  electionEpisodes: number;
  normalEpisodes: number;
}

export interface CountdownBin {
  /** Wochen relativ zum Wahltermin, Beginn des Bins (negativ = davor) */
  startWeek: number;
  label: string;
  /** Kurzlabel für die Achse */
  tick: string;
  inElectionWindow: boolean;
  total: number;
  episodes: number;
  [party: string]: number | string | boolean;
}

export const ELECTION_WINDOW_DAYS = 42; // 6 Wochen
/** Die Tage direkt nach einer Wahl (Wahlabend, Analyse) zählen nicht zur Normalphase */
export const POST_ELECTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const toDayNumber = (date: string) =>
  Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY_MS);

/** Tage bis zur Wahl: > 0 = Sendung vor der Wahl, 0 = Wahltag, < 0 = danach */
export const daysUntil = (episodeDate: string, electionDate: string) =>
  toDayNumber(electionDate) - toDayNumber(episodeDate);

const episodeKey = (row: AppearanceRow) => `${row.show_name}|${row.episode_date}`;

export function mergeUnion(party: string, unionMode: boolean) {
  return unionMode && (party === "CDU" || party === "CSU") ? "Union" : party;
}

/**
 * Gruppiert vergangene Wahlen nach Datum. Berücksichtigt werden nur Wahlen, deren
 * komplette Wahlphase im Datenzeitraum liegt.
 */
export function getAnalyzableElections(
  wahlen: Wahl[],
  rows: AppearanceRow[],
  today: string,
  windowDays = ELECTION_WINDOW_DAYS,
): ElectionGroup[] {
  if (rows.length === 0) return [];
  const firstDay = Math.min(...rows.map((r) => toDayNumber(r.episode_date)));
  const todayDay = toDayNumber(today);

  const byDate = new Map<string, Wahl[]>();
  wahlen.forEach((wahl) => {
    const day = toDayNumber(wahl.election_date);
    if (day - windowDays < firstDay || day > todayDay) return;
    byDate.set(wahl.election_date, [...(byDate.get(wahl.election_date) ?? []), wahl]);
  });

  return Array.from(byDate, ([date, group]) => {
    const hasBundestagswahl = group.some((w) => w.election_type === "bundestag");
    const landtagCodes = group
      .filter((w) => w.election_type === "landtag")
      .map((w) => w.state_code);
    const label = [
      hasBundestagswahl ? "Bundestagswahl" : null,
      landtagCodes.length > 0 ? `LTW ${landtagCodes.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join(" + ");
    return { date, wahlen: group, hasBundestagswahl, label };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Liegt die Sendung in der Wahlphase einer der Wahlen? */
function isInElectionWindow(row: AppearanceRow, dates: string[], windowDays: number) {
  return dates.some((date) => {
    const d = daysUntil(row.episode_date, date);
    return d >= 1 && d <= windowDays;
  });
}

/** Liegt die Sendung in der Wahlphase oder in der Woche nach einer Wahl? */
function isElectionInfluenced(row: AppearanceRow, dates: string[], windowDays: number) {
  return dates.some((date) => {
    const d = daysUntil(row.episode_date, date);
    return d >= -POST_ELECTION_DAYS && d <= windowDays;
  });
}

export function analyzeElectionPhases(
  rows: AppearanceRow[],
  selectedDates: string[],
  allElectionDates: string[],
  unionMode: boolean,
  windowDays = ELECTION_WINDOW_DAYS,
): PhaseAnalysisResult {
  const electionCounts: Record<string, number> = {};
  const normalCounts: Record<string, number> = {};
  const electionEpisodes = new Set<string>();
  const normalEpisodes = new Set<string>();
  let electionTotal = 0;
  let normalTotal = 0;

  rows.forEach((row) => {
    const party = mergeUnion(row.party_name, unionMode);
    if (isInElectionWindow(row, selectedDates, windowDays)) {
      electionCounts[party] = (electionCounts[party] || 0) + 1;
      electionEpisodes.add(episodeKey(row));
      electionTotal++;
    } else if (!isElectionInfluenced(row, allElectionDates, windowDays)) {
      normalCounts[party] = (normalCounts[party] || 0) + 1;
      normalEpisodes.add(episodeKey(row));
      normalTotal++;
    }
  });

  const partyNames = new Set([...Object.keys(electionCounts), ...Object.keys(normalCounts)]);
  const parties = Array.from(partyNames).map((party): PartyPhaseStats => {
    const electionCount = electionCounts[party] || 0;
    const normalCount = normalCounts[party] || 0;
    const electionShare = electionTotal ? electionCount / electionTotal : 0;
    const normalShare = normalTotal ? normalCount / normalTotal : 0;
    return {
      party,
      electionCount,
      normalCount,
      electionShare,
      normalShare,
      shareDeltaPp: (electionShare - normalShare) * 100,
    };
  });

  parties.sort((a, b) => b.shareDeltaPp - a.shareDeltaPp);

  return {
    parties,
    electionTotal,
    normalTotal,
    electionEpisodes: electionEpisodes.size,
    normalEpisodes: normalEpisodes.size,
  };
}

/**
 * Countdown-Verlauf: Partei-Anteile in 2-Wochen-Schritten relativ zum Wahltermin,
 * über alle ausgewählten Wahlen aufsummiert.
 */
export function buildCountdown(
  rows: AppearanceRow[],
  selectedDates: string[],
  unionMode: boolean,
  { weeksBefore = 16, weeksAfter = 4, binWeeks = 2, windowDays = ELECTION_WINDOW_DAYS } = {},
): CountdownBin[] {
  const bins: { startWeek: number; counts: Record<string, number>; total: number; episodes: Set<string> }[] = [];
  for (let w = -weeksBefore; w < weeksAfter; w += binWeeks) {
    bins.push({ startWeek: w, counts: {}, total: 0, episodes: new Set() });
  }

  rows.forEach((row) => {
    const party = mergeUnion(row.party_name, unionMode);
    selectedDates.forEach((date) => {
      // Woche -1 = 1–7 Tage vor der Wahl, Woche 0 = Wahltag bis 6 Tage danach
      const week = Math.floor(-daysUntil(row.episode_date, date) / 7);
      if (week < -weeksBefore || week >= weeksAfter) return;
      const bin = bins[Math.floor((week + weeksBefore) / binWeeks)];
      bin.counts[party] = (bin.counts[party] || 0) + 1;
      bin.total++;
      bin.episodes.add(`${episodeKey(row)}|${date}`);
    });
  });

  const fmt = (w: number) => (w > 0 ? `+${w}` : w === 0 ? "0" : `−${Math.abs(w)}`);

  return bins.map((bin) => {
    const end = bin.startWeek + binWeeks;
    const result: CountdownBin = {
      startWeek: bin.startWeek,
      label: `${fmt(bin.startWeek)} bis ${fmt(end)} W.`,
      tick: bin.startWeek === 0 ? "Wahl" : `${fmt(bin.startWeek)} W.`,
      inElectionWindow: bin.startWeek < 0 && bin.startWeek >= -Math.ceil(windowDays / 7),
      total: bin.total,
      episodes: bin.episodes.size,
    };
    Object.entries(bin.counts).forEach(([party, count]) => {
      result[party] = count;
    });
    return result;
  });
}
