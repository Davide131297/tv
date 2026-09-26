import { initials, partyColor, partyTextColor, PARTY_COLORS } from "@/lib/parties";

describe("partyColor", () => {
  it("returns the configured color", () => {
    expect(partyColor("SPD")).toBe(PARTY_COLORS.SPD);
  });

  it("matches case-insensitively and ignores soft hyphens", () => {
    expect(partyColor("bündnis 90/die grünen")).toBe(PARTY_COLORS["BÜNDNIS 90/DIE GRÜNEN"]);
    expect(partyColor("C­DU")).toBe(PARTY_COLORS.CDU);
  });

  it("falls back for unknown or empty parties", () => {
    expect(partyColor("Piratenpartei")).toBe("#94a3b8");
    expect(partyColor(undefined)).toBe("#94a3b8");
  });

  it("uses a light CDU color in dark mode so it stays visible", () => {
    const dark = partyColor("CDU", true);
    expect(dark).not.toBe(PARTY_COLORS.CDU);
    expect(partyTextColor(dark)).toBe("#0f172a");
    // other parties are unchanged
    expect(partyColor("SPD", true)).toBe(PARTY_COLORS.SPD);
  });
});

describe("partyTextColor", () => {
  it("picks readable text colors", () => {
    expect(partyTextColor("#111827")).toBe("#ffffff");
    expect(partyTextColor("#eab308")).toBe("#0f172a");
    expect(partyTextColor("#ffffff")).toBe("#0f172a");
  });
});

describe("initials", () => {
  it("builds initials from first and last name", () => {
    expect(initials("Robert Habeck")).toBe("RH");
    expect(initials("Frank-Walter Steinmeier")).toBe("FS");
    expect(initials("Madonna")).toBe("MA");
    expect(initials("  ")).toBe("?");
  });
});
