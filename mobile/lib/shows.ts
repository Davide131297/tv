import type { ShowOption } from "./types";

// The talk shows the app filters on. "all" == alle Shows.
export const SHOWS: ShowOption[] = [
  { value: "all", label: "Alle Shows", accent: "#38BDF8" },
  { value: "Markus Lanz", label: "Markus Lanz", accent: "#F59E0B" },
  { value: "Maybrit Illner", label: "Maybrit Illner", accent: "#A855F7" },
  { value: "Caren Miosga", label: "Caren Miosga", accent: "#22C55E" },
  { value: "Maischberger", label: "Maischberger", accent: "#14B8A6" },
  { value: "Hart aber fair", label: "Hart aber fair", accent: "#3B82F6" },
];

export const SHOWS_WITHOUT_ALL = SHOWS.filter((s) => s.value !== "all");

export function showAccent(value: string | null | undefined): string {
  return SHOWS.find((s) => s.value === value)?.accent ?? "#38BDF8";
}

export function showLabel(value: string | null | undefined): string {
  if (!value || value === "all") return "Alle Shows";
  return SHOWS.find((s) => s.value === value)?.label ?? value;
}

// Years offered in the year filter (current back to 2023).
export function availableYears(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = ["all"];
  for (let y = current; y >= 2023; y--) years.push(String(y));
  return years;
}
