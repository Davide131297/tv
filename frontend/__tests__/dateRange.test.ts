import {
  describePeriod,
  getDefaultRange,
  monthKeysForRange,
  parsePeriod,
  periodFromParams,
} from "@/utils/dateRange";

describe("dateRange", () => {
  it("defaults to the current calendar year", () => {
    const y = new Date().getFullYear();
    expect(getDefaultRange()).toEqual({ from: `${y}-01-01`, to: `${y}-12-31` });
    expect(periodFromParams({})).toBe(`${y}-01-01..${y}-12-31`);
  });

  it("prefers from/to over legacy year and swaps reversed ranges", () => {
    expect(periodFromParams({ from: "2025-03-01", to: "2025-06-30", year: "2024" })).toBe("2025-03-01..2025-06-30");
    expect(periodFromParams({ from: "2025-06-30", to: "2025-03-01" })).toBe("2025-03-01..2025-06-30");
    expect(periodFromParams({ year: "2024" })).toBe("2024");
  });

  it("parses periods", () => {
    expect(parsePeriod("all")).toBeNull();
    expect(parsePeriod("2024")).toEqual({ from: "2024-01-01", to: "2024-12-31" });
    expect(parsePeriod("2025-02-30..2025-03-01")).toBeNull();
  });

  it("lists month keys and describes periods", () => {
    expect(monthKeysForRange({ from: "2024-11-15", to: "2025-01-02" })).toEqual(["2024-11", "2024-12", "2025-01"]);
    expect(describePeriod("2025-01-01..2025-12-31")).toBe("2025");
    expect(describePeriod("2025-03-01..2025-06-30")).toBe("01.03.2025 – 30.06.2025");
  });
});
