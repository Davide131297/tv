import { POLITICAL_AREA, FETCH_HEADERS } from "../lib/utils";

jest.mock("../supabase", () => ({
  supabase: {},
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("POLITICAL_AREA", () => {
  it("has exactly 7 areas", () => {
    expect(POLITICAL_AREA).toHaveLength(7);
  });

  it("ids run from 1 to 7 without gaps", () => {
    const ids = POLITICAL_AREA.map((a) => a.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("area 3 covers Sicherheit/Verteidigung", () => {
    const area3 = POLITICAL_AREA.find((a) => a.id === 3);
    expect(area3?.label).toContain("Sicherheit");
  });

  it("area 4 covers Migration", () => {
    const area4 = POLITICAL_AREA.find((a) => a.id === 4);
    expect(area4?.label).toContain("Migration");
  });

  it("area 5 covers Haushalt", () => {
    const area5 = POLITICAL_AREA.find((a) => a.id === 5);
    expect(area5?.label).toContain("Haushalt");
  });

  it("area 6 covers Digitalisierung", () => {
    const area6 = POLITICAL_AREA.find((a) => a.id === 6);
    expect(area6?.label).toContain("Digitalisierung");
  });
});

describe("FETCH_HEADERS", () => {
  it("has an Authorization property", () => {
    expect(FETCH_HEADERS).toHaveProperty("Authorization");
  });

  it("Authorization header is a string", () => {
    expect(typeof FETCH_HEADERS.Authorization).toBe("string");
  });

  it("Authorization header starts with 'Bearer '", () => {
    expect(FETCH_HEADERS.Authorization).toMatch(/^Bearer /);
  });
});
