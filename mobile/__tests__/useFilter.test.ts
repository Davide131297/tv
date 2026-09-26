import { sanitizeFilter } from "@/hooks/useFilter";

describe("sanitizeFilter", () => {
  it("keeps valid persisted values", () => {
    expect(sanitizeFilter({ show: "Sarah Tacke", year: "2025", union: true })).toEqual({
      show: "Sarah Tacke",
      year: "2025",
      union: true,
    });
  });

  it("drops unknown or malformed values", () => {
    expect(sanitizeFilter({ show: "Gibt es nicht", year: "1999", union: "ja" })).toEqual({});
    expect(sanitizeFilter(null)).toEqual({});
    expect(sanitizeFilter("kaputt")).toEqual({});
  });
});
