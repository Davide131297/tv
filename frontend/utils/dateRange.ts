/**
 * Zeitraum-Hilfen für die "Von–Bis"-Filterung.
 *
 * Ein "Zeitraum" (period) wird intern als String durchgereicht, damit die
 * bestehenden `year`-Parameter weiterverwendet werden können:
 *   - "all"                      → kein Filter
 *   - "2025"                     → ganzes Jahr (Abwärtskompatibilität)
 *   - "2025-01-01..2025-12-31"   → beliebige Zeitspanne (von..bis, inklusiv)
 */

export const PERIOD_SEPARATOR = "..";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function getDefaultRange(now = new Date()): DateRange {
  const y = now.getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function toPeriod(range: DateRange): string {
  return `${range.from}${PERIOD_SEPARATOR}${range.to}`;
}

/** Datum → YYYY-MM-DD in lokaler Zeit (ohne UTC-Verschiebung). */
export function formatIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** DD.MM.YYYY */
export function formatDisplayDate(value: string): string {
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Ermittelt den Zeitraum aus den URL-/Query-Parametern.
 * Reihenfolge: from+to → year (legacy) → Standard (aktuelles Jahr).
 */
export function periodFromParams(params: {
  from?: string | null;
  to?: string | null;
  year?: string | null;
}): string {
  const { from, to, year } = params;
  if (isIsoDate(from) && isIsoDate(to)) {
    return from <= to ? toPeriod({ from, to }) : toPeriod({ from: to, to: from });
  }
  if (year) return year;
  return toPeriod(getDefaultRange());
}

/** Wie `periodFromParams`, aber für Next.js-`searchParams`-Objekte. */
export function periodFromSearchParams(params: {
  [key: string]: string | string[] | undefined;
}): string {
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : null;
  return periodFromParams({
    from: str(params.from),
    to: str(params.to),
    year: str(params.year),
  });
}

/** Liefert Start/Ende (inklusiv) oder null bei "all"/ungültig. */
export function parsePeriod(period?: string | null): DateRange | null {
  if (!period || period === "all") return null;
  if (period.includes(PERIOD_SEPARATOR)) {
    const [from, to] = period.split(PERIOD_SEPARATOR);
    if (isIsoDate(from) && isIsoDate(to)) return { from, to };
    return null;
  }
  if (/^\d{4}$/.test(period)) {
    return { from: `${period}-01-01`, to: `${period}-12-31` };
  }
  return null;
}

/** Wendet den Zeitraum auf eine Supabase-Query an (`episode_date`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPeriodFilter<T = any>(query: T, period?: string | null): T {
  const range = parsePeriod(period);
  if (!range) return query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).gte("episode_date", range.from).lte("episode_date", range.to);
}

/** Alle Monate (YYYY-MM) zwischen from und to (inklusiv). */
export function monthKeysForRange(range: DateRange): string[] {
  const start = parseIsoDate(range.from);
  const end = parseIsoDate(range.to);
  const keys: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    keys.push(formatIsoDate(cur).slice(0, 7));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

/** Lesbare Bezeichnung: "Alle Jahre", "2025" oder "01.03.2025 – 30.06.2025". */
export function describePeriod(period?: string | null): string {
  const range = parsePeriod(period);
  if (!range) return "Alle Jahre";
  if (
    range.from.slice(0, 4) === range.to.slice(0, 4) &&
    range.from.endsWith("-01-01") &&
    range.to.endsWith("-12-31")
  ) {
    return range.from.slice(0, 4);
  }
  return `${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)}`;
}

/**
 * Liest den Zeitraum aus API-Query-Parametern (`from`+`to` oder `year`).
 * Ohne Angabe: `fallback` (Standard: null = kein Filter).
 */
export function periodFromQuery(
  searchParams: URLSearchParams,
  fallback: string | null = null,
): string | null {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const year = searchParams.get("year");
  if (isIsoDate(from) && isIsoDate(to)) return periodFromParams({ from, to });
  return year || fallback;
}
