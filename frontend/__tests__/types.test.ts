import {
  SHOW_OPTIONS,
  SHOW_OPTIONS_WITHOUT_ALL,
  PARTY_COLORS,
  BADGE_PARTY_COLORS,
} from "../types";

describe("SHOW_OPTIONS", () => {
  it("first option is 'all' (Alle Shows)", () => {
    expect(SHOW_OPTIONS[0].value).toBe("all");
    expect(SHOW_OPTIONS[0].label).toBe("Alle Shows");
  });

  it("contains Markus Lanz", () => {
    const lanz = SHOW_OPTIONS.find((o) => o.value === "Markus Lanz");
    expect(lanz).toBeDefined();
  });

  it("contains Maybrit Illner", () => {
    const illner = SHOW_OPTIONS.find((o) => o.value === "Maybrit Illner");
    expect(illner).toBeDefined();
  });

  it("every option has a non-empty label and btnColor", () => {
    SHOW_OPTIONS.forEach((option) => {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.btnColor.length).toBeGreaterThan(0);
    });
  });

  it("every option has a non-empty value", () => {
    SHOW_OPTIONS.forEach((option) => {
      expect(option.value.length).toBeGreaterThan(0);
    });
  });
});

describe("SHOW_OPTIONS_WITHOUT_ALL", () => {
  it("does not contain the 'all' option", () => {
    const allOption = SHOW_OPTIONS_WITHOUT_ALL.find((o) => o.value === "all");
    expect(allOption).toBeUndefined();
  });

  it("has one fewer entry than SHOW_OPTIONS", () => {
    expect(SHOW_OPTIONS_WITHOUT_ALL).toHaveLength(SHOW_OPTIONS.length - 1);
  });

  it("still contains Markus Lanz", () => {
    const lanz = SHOW_OPTIONS_WITHOUT_ALL.find((o) => o.value === "Markus Lanz");
    expect(lanz).toBeDefined();
  });
});

describe("PARTY_COLORS", () => {
  it("CDU color is black", () => {
    expect(PARTY_COLORS["CDU"]).toBe("#000000");
  });

  it("SPD color is red", () => {
    expect(PARTY_COLORS["SPD"]).toBe("#dc2626");
  });

  it("AfD color is blue", () => {
    expect(PARTY_COLORS["AfD"]).toBe("#2563eb");
  });

  it("all values are valid CSS hex colors", () => {
    const hexColorRegex = /^#[0-9a-fA-F]{3,6}$/;
    Object.values(PARTY_COLORS).forEach((color) => {
      expect(color).toMatch(hexColorRegex);
    });
  });

  it("FDP color is yellow", () => {
    expect(PARTY_COLORS["FDP"]).toBe("#facc15");
  });
});

describe("BADGE_PARTY_COLORS", () => {
  it("SPD badge has red background", () => {
    expect(BADGE_PARTY_COLORS["SPD"]).toContain("bg-red-100");
  });

  it("CDU badge has dark background", () => {
    expect(BADGE_PARTY_COLORS["CDU"]).toContain("bg-gray-800");
  });

  it("AfD badge is defined", () => {
    expect(BADGE_PARTY_COLORS["AfD"]).toBeDefined();
  });

  it("every badge entry contains text and border classes", () => {
    Object.values(BADGE_PARTY_COLORS).forEach((classes) => {
      expect(classes).toMatch(/text-/);
      expect(classes).toMatch(/border-/);
    });
  });
});
