import {
  POLITICIAN_OVERRIDES,
  POLITICAL_AREA,
  GuestDetails,
} from "../lib/utils";

jest.mock("../supabase", () => ({
  supabase: {},
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("POLITICIAN_OVERRIDES", () => {
  it("contains an entry for Manfred Weber", () => {
    expect(POLITICIAN_OVERRIDES["Manfred Weber"]).toBeDefined();
  });

  it("Manfred Weber override has the correct party CSU", () => {
    expect(POLITICIAN_OVERRIDES["Manfred Weber"].partyName).toBe("CSU");
  });

  it("Michael Kretschmer override has isPolitician set to true", () => {
    expect(POLITICIAN_OVERRIDES["Michael Kretschmer"].isPolitician).toBe(true);
  });

  it("Philipp Türmer override belongs to SPD", () => {
    expect(POLITICIAN_OVERRIDES["Philipp Türmer"].partyName).toBe("SPD");
  });

  it("all overrides have a non-null politicianId", () => {
    Object.values(POLITICIAN_OVERRIDES).forEach((entry: GuestDetails) => {
      expect(entry.politicianId).not.toBeNull();
    });
  });

  it("Jan van Aken override resolves to the correct full name", () => {
    expect(POLITICIAN_OVERRIDES["Jan van"].politicianName).toBe("Jan van Aken");
  });
});

describe("POLITICAL_AREA", () => {
  it("contains exactly 7 political areas", () => {
    expect(POLITICAL_AREA).toHaveLength(7);
  });

  it("first area has id 1", () => {
    expect(POLITICAL_AREA[0].id).toBe(1);
  });

  it("last area has id 7", () => {
    expect(POLITICAL_AREA[POLITICAL_AREA.length - 1].id).toBe(7);
  });

  it("every area has a non-empty label", () => {
    POLITICAL_AREA.forEach((area) => {
      expect(typeof area.label).toBe("string");
      expect(area.label.length).toBeGreaterThan(0);
    });
  });

  it("area ids are sequential starting from 1", () => {
    POLITICAL_AREA.forEach((area, index) => {
      expect(area.id).toBe(index + 1);
    });
  });
});
