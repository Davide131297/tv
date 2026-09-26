import type { ShowOption } from "./types";

// The talk shows the app filters on. "all" == alle Standard-Shows.
// Mirrors SHOW_OPTIONS in frontend/types.ts.
export const SHOWS: ShowOption[] = [
  { value: "all", label: "Alle Shows", accent: "#38BDF8" },
  { value: "Markus Lanz", label: "Markus Lanz", accent: "#F59E0B" },
  { value: "Maybrit Illner", label: "Maybrit Illner", accent: "#A855F7" },
  { value: "Caren Miosga", label: "Caren Miosga", accent: "#22C55E" },
  { value: "Maischberger", label: "Maischberger", accent: "#14B8A6" },
  { value: "Hart aber fair", label: "Hart aber fair", accent: "#3B82F6" },
];

// Additional shows that are not part of "Alle Shows" (the backend excludes
// them by default) but can be selected explicitly.
// Mirrors OTHER_SHOW_OPTIONS in frontend/types.ts.
export const OTHER_SHOWS: ShowOption[] = [
  { value: "Sarah Tacke", label: "Sarah Tacke", accent: "#6366F1" },
  { value: "Phoenix Runde", label: "Phoenix Runde", accent: "#06B6D4" },
  { value: "Phoenix Persönlich", label: "Phoenix Persönlich", accent: "#0EA5E9" },
];

export const SHOWS_WITHOUT_ALL = SHOWS.filter((s) => s.value !== "all");

/** Every concrete show (standard + additional), e.g. for the episode browser. */
export const ALL_SHOWS: ShowOption[] = [...SHOWS_WITHOUT_ALL, ...OTHER_SHOWS];

const KNOWN_SHOWS = [...SHOWS, ...OTHER_SHOWS];

// Some tables store show names in a different casing (e.g. "maybrit illner").
function findShow(value: string | null | undefined): ShowOption | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLocaleLowerCase("de-DE");
  return KNOWN_SHOWS.find((s) => s.value.toLocaleLowerCase("de-DE") === normalized);
}

export function isKnownShow(value: string | null | undefined): boolean {
  return KNOWN_SHOWS.some((s) => s.value === value);
}

export function showAccent(value: string | null | undefined): string {
  return findShow(value)?.accent ?? "#38BDF8";
}

export function showLabel(value: string | null | undefined): string {
  if (!value || value === "all") return "Alle Shows";
  return findShow(value)?.label ?? value;
}

// First year with data in the database.
export const FIRST_YEAR = 2023;

// Years offered in the year filter (current back to FIRST_YEAR).
export function availableYears(now: Date = new Date()): string[] {
  const current = now.getFullYear();
  const years: string[] = ["all"];
  for (let y = current; y >= FIRST_YEAR; y--) years.push(String(y));
  return years;
}

export function currentYear(now: Date = new Date()): string {
  return String(now.getFullYear());
}

/** Short human readable description of the active filter, e.g. "Markus Lanz · 2026". */
export function filterSummary(show: string, year: string): string {
  return `${showLabel(show)}${year !== "all" ? ` · ${year}` : " · Alle Jahre"}`;
}
