import {
  formatDate,
  formatDateShort,
  formatMillions,
  formatPercent,
  monthLabel,
  timelineMonthLabel,
} from "@/lib/format";

describe("format", () => {
  it("formats ISO dates in German", () => {
    expect(formatDate("2025-01-14")).toBe("14. Jan. 2025");
    expect(formatDateShort("2025-03-05")).toBe("5. März");
  });

  it("returns the input for invalid dates", () => {
    expect(formatDate("kein-datum")).toBe("kein-datum");
    expect(formatDate("")).toBe("");
  });

  it("labels months", () => {
    expect(monthLabel("01")).toBe("Jan");
    expect(monthLabel("12")).toBe("Dez");
    expect(timelineMonthLabel("2026-09")).toBe("Sep 26");
  });

  it("formats millions and percentages with German separators", () => {
    expect(formatMillions(2.5)).toMatch(/^2,50\sMio\.$/);
    expect(formatPercent(12.345)).toMatch(/^12,3\s%$/);
  });
});
