import {
  checkPoliticianOverride,
  POLITICIAN_OVERRIDES,
} from "../lib/utils";

jest.mock("../supabase", () => ({
  supabase: {},
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("checkPoliticianOverride", () => {
  it("returns the override entry for Manfred Weber", () => {
    const result = checkPoliticianOverride("Manfred Weber");
    expect(result).not.toBeNull();
    expect(result?.partyName).toBe("CSU");
  });

  it("returns the override entry for Michael Kretschmer", () => {
    const result = checkPoliticianOverride("Michael Kretschmer");
    expect(result).not.toBeNull();
    expect(result?.partyName).toBe("CDU");
  });

  it("returns null for a name that has no override", () => {
    const result = checkPoliticianOverride("Angela Merkel");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", () => {
    const result = checkPoliticianOverride("");
    expect(result).toBeNull();
  });

  it("is case-sensitive (lowercase does not match)", () => {
    const result = checkPoliticianOverride("manfred weber");
    expect(result).toBeNull();
  });

  it("returns the exact same object stored in POLITICIAN_OVERRIDES", () => {
    const result = checkPoliticianOverride("Manfred Weber");
    expect(result).toBe(POLITICIAN_OVERRIDES["Manfred Weber"]);
  });
});

describe("POLITICIAN_OVERRIDES – additional checks", () => {
  it("Daniel Günther is in CDU", () => {
    expect(POLITICIAN_OVERRIDES["Daniel Günther"]?.partyName).toBe("CDU");
  });

  it("Jan van Aken override (key 'Jan van') has Die Linke as party", () => {
    expect(POLITICIAN_OVERRIDES["Jan van"]?.partyName).toBe("Die Linke");
  });

  it("every override entry has a name field matching the politician name", () => {
    Object.values(POLITICIAN_OVERRIDES).forEach((entry) => {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
    });
  });

  it("every override with isPolitician=true has a defined partyName", () => {
    Object.values(POLITICIAN_OVERRIDES)
      .filter((e) => e.isPolitician)
      .forEach((entry) => {
        expect(entry.partyName).toBeDefined();
      });
  });
});
