import {
  ALL_SHOWS,
  OTHER_SHOWS,
  SHOWS,
  availableYears,
  filterSummary,
  isKnownShow,
  showLabel,
} from "@/lib/shows";

describe("shows", () => {
  it("contains standard and additional shows", () => {
    expect(SHOWS.map((s) => s.value)).toContain("Markus Lanz");
    expect(OTHER_SHOWS.map((s) => s.value)).toEqual(
      expect.arrayContaining(["Sarah Tacke", "Phoenix Runde", "Phoenix Persönlich"]),
    );
    expect(ALL_SHOWS.find((s) => s.value === "all")).toBeUndefined();
  });

  it("recognises known shows", () => {
    expect(isKnownShow("all")).toBe(true);
    expect(isKnownShow("Sarah Tacke")).toBe(true);
    expect(isKnownShow("Unbekannte Show")).toBe(false);
  });

  it("labels shows and filters", () => {
    expect(showLabel("all")).toBe("Alle Shows");
    expect(showLabel(null)).toBe("Alle Shows");
    expect(showLabel("maybrit illner")).toBe("Maybrit Illner");
    expect(showLabel("Neue Show")).toBe("Neue Show");
    expect(filterSummary("Maischberger", "2026")).toBe("Maischberger · 2026");
    expect(filterSummary("all", "all")).toBe("Alle Shows · Alle Jahre");
  });

  it("offers years from now back to 2023", () => {
    expect(availableYears(new Date("2026-09-26"))).toEqual([
      "all",
      "2026",
      "2025",
      "2024",
      "2023",
    ]);
  });
});
