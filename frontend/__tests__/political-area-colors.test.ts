import { POLITICAL_AREA_COLORS } from "../lib/political-area-colors";

describe("POLITICAL_AREA_COLORS", () => {
  it("has an entry for each of the 7 political areas", () => {
    for (let i = 1; i <= 7; i++) {
      expect(POLITICAL_AREA_COLORS[i]).toBeDefined();
    }
  });

  it("all values are valid CSS hex colors", () => {
    const hexColorRegex = /^#[0-9a-fA-F]{3,6}$/;
    Object.values(POLITICAL_AREA_COLORS).forEach((color) => {
      expect(color).toMatch(hexColorRegex);
    });
  });

  it("area 1 (Energie, Klima) is green", () => {
    expect(POLITICAL_AREA_COLORS[1]).toBe("#059669");
  });

  it("area 2 (Wirtschaft) is blue", () => {
    expect(POLITICAL_AREA_COLORS[2]).toBe("#2563eb");
  });

  it("area 6 (Digitalisierung) is cyan", () => {
    expect(POLITICAL_AREA_COLORS[6]).toBe("#06b6d4");
  });

  it("area 7 (Kultur) is orange", () => {
    expect(POLITICAL_AREA_COLORS[7]).toBe("#ea580c");
  });

  it("does not contain an entry for area id 0 or 8", () => {
    expect(POLITICAL_AREA_COLORS[0]).toBeUndefined();
    expect(POLITICAL_AREA_COLORS[8]).toBeUndefined();
  });
});
