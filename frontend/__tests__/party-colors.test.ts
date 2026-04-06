import {
  getPartyBadgeClasses,
  getPartyBorderedBadgeClasses,
  getShowBadgeClasses,
} from "../lib/party-colors";

describe("getPartyBadgeClasses", () => {
  it("returns correct classes for SPD", () => {
    expect(getPartyBadgeClasses("SPD")).toContain("bg-red-600");
  });

  it("returns correct classes for CDU", () => {
    expect(getPartyBadgeClasses("CDU")).toContain("bg-black");
  });

  it("returns correct classes for BÜNDNIS 90/DIE GRÜNEN", () => {
    expect(getPartyBadgeClasses("BÜNDNIS 90/DIE GRÜNEN")).toContain("bg-green-400");
  });

  it("returns default classes for an unknown party", () => {
    expect(getPartyBadgeClasses("UnknownPartei")).toBe("bg-gray-400 text-white");
  });

  it("returns default classes for an empty string", () => {
    expect(getPartyBadgeClasses("")).toBe("bg-gray-400 text-white");
  });

  it("normalises soft-hyphen characters in party names", () => {
    const nameWithSoftHyphen = "CD\u00ADU";
    expect(getPartyBadgeClasses(nameWithSoftHyphen)).toContain("bg-black");
  });
});

describe("getPartyBorderedBadgeClasses", () => {
  it("returns correct classes for SPD", () => {
    expect(getPartyBorderedBadgeClasses("SPD")).toContain("bg-red-100");
  });

  it("returns correct classes for FDP", () => {
    expect(getPartyBorderedBadgeClasses("FDP")).toContain("bg-yellow-100");
  });

  it("returns default classes for an unknown party", () => {
    expect(getPartyBorderedBadgeClasses("UnknownPartei")).toBe(
      "bg-gray-100 text-gray-800 border-gray-200",
    );
  });

  it("returns default classes for an empty string", () => {
    expect(getPartyBorderedBadgeClasses("")).toBe(
      "bg-gray-100 text-gray-800 border-gray-200",
    );
  });
});

describe("getShowBadgeClasses", () => {
  it("returns correct classes for Markus Lanz", () => {
    expect(getShowBadgeClasses("Markus Lanz")).toBe(
      "bg-orange-100 text-orange-800",
    );
  });

  it("returns correct classes for Maybrit Illner", () => {
    expect(getShowBadgeClasses("Maybrit Illner")).toBe(
      "bg-purple-100 text-purple-800",
    );
  });

  it("returns default classes for an unknown show", () => {
    expect(getShowBadgeClasses("Unbekannte Sendung")).toBe(
      "bg-gray-100 text-gray-800",
    );
  });
});
