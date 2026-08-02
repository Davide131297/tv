import { isExcludedEpisode, EXCLUDED_EPISODES } from "../lib/crawler-utils";

jest.mock("../supabase", () => ({
  supabase: {},
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("isExcludedEpisode", () => {
  it("excludes Markus Lanz on 2026-07-16", () => {
    expect(isExcludedEpisode("Markus Lanz", "2026-07-16")).toBe(true);
  });

  it("accepts full timestamps and only compares the date part", () => {
    expect(isExcludedEpisode("Markus Lanz", "2026-07-16T22:15:00.000+02:00")).toBe(
      true,
    );
  });

  it("is case-insensitive for the show name", () => {
    expect(isExcludedEpisode("markus lanz", "2026-07-16")).toBe(true);
  });

  it("does not exclude other Markus Lanz dates", () => {
    expect(isExcludedEpisode("Markus Lanz", "2026-07-15")).toBe(false);
    expect(isExcludedEpisode("Markus Lanz", "2026-07-17")).toBe(false);
  });

  it("does not exclude other shows on the same date", () => {
    expect(isExcludedEpisode("Maybrit Illner", "2026-07-16")).toBe(false);
  });

  it("returns false when no date is available", () => {
    expect(isExcludedEpisode("Markus Lanz", null)).toBe(false);
    expect(isExcludedEpisode("Markus Lanz", undefined)).toBe(false);
  });

  it("keeps the blacklist entries in ISO format", () => {
    for (const entry of EXCLUDED_EPISODES) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.show.length).toBeGreaterThan(0);
    }
  });
});
