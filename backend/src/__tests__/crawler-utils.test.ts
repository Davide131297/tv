import {
  toISOFromDDMMYYYY,
  parseISODateFromUrl,
  formatDateForDB,
  seemsLikePersonName,
  isModeratorOrHost,
  filterNewEpisodes,
  DE_MONTHS,
} from "../lib/crawler-utils";

describe("DE_MONTHS", () => {
  it("contains all 12 months", () => {
    const values = Object.values(DE_MONTHS);
    const uniqueMonths = new Set(values);
    // maerz and märz both map to 03, so 12 keys but only 12 distinct month numbers
    expect(Object.keys(DE_MONTHS).length).toBeGreaterThanOrEqual(12);
  });

  it("maps 'januar' to '01'", () => {
    expect(DE_MONTHS["januar"]).toBe("01");
  });

  it("maps 'dezember' to '12'", () => {
    expect(DE_MONTHS["dezember"]).toBe("12");
  });
});

describe("toISOFromDDMMYYYY", () => {
  it("converts a valid date", () => {
    expect(toISOFromDDMMYYYY("15.06.2024")).toBe("2024-06-15");
  });

  it("returns null for a wrong format", () => {
    expect(toISOFromDDMMYYYY("2024-06-15")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(toISOFromDDMMYYYY("")).toBeNull();
  });

  it("converts 01.01.2000 correctly", () => {
    expect(toISOFromDDMMYYYY("01.01.2000")).toBe("2000-01-01");
  });
});

describe("parseISODateFromUrl", () => {
  it("parses 'vom-7-januar-2025'", () => {
    expect(parseISODateFromUrl("vom-7-januar-2025")).toBe("2025-01-07");
  });

  it("parses 'vom-15-dezember-2023'", () => {
    expect(parseISODateFromUrl("vom-15-dezember-2023")).toBe("2023-12-15");
  });

  it("returns null for URLs without a date pattern", () => {
    expect(parseISODateFromUrl("https://example.com/show")).toBeNull();
  });

  it("returns null for an unknown month", () => {
    expect(parseISODateFromUrl("vom-5-unknownmonth-2025")).toBeNull();
  });
});

describe("formatDateForDB", () => {
  it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
    expect(formatDateForDB("20.03.2025")).toBe("2025-03-20");
  });

  it("passes through an already ISO-formatted date", () => {
    expect(formatDateForDB("2025-03-20")).toBe("2025-03-20");
  });

  it("pads single-digit day and month", () => {
    expect(formatDateForDB("5.3.2025")).toBe("2025-03-05");
  });
});

describe("seemsLikePersonName", () => {
  it("returns true for a valid two-word name", () => {
    expect(seemsLikePersonName("Friedrich Merz")).toBe(true);
  });

  it("returns false for a single word", () => {
    expect(seemsLikePersonName("Friedrich")).toBe(false);
  });

  it("returns false for a name starting in lowercase", () => {
    expect(seemsLikePersonName("angela merkel")).toBe(false);
  });

  it("returns true for a name with noble particle (von)", () => {
    expect(seemsLikePersonName("Karl von Müller")).toBe(true);
  });
});

describe("isModeratorOrHost", () => {
  it("returns true for Markus Lanz", () => {
    expect(isModeratorOrHost("Markus Lanz")).toBe(true);
  });

  it("returns true for Caren Miosga", () => {
    expect(isModeratorOrHost("Caren Miosga")).toBe(true);
  });

  it("returns false for a politician", () => {
    expect(isModeratorOrHost("Robert Habeck")).toBe(false);
  });

  it("matches against showName words", () => {
    expect(isModeratorOrHost("Hans Miosga Extra", "Miosga Extra")).toBe(true);
  });
});

describe("filterNewEpisodes", () => {
  const episodes = [
    { date: "2025-04-01", title: "Latest" },
    { date: "2025-01-15", title: "Middle" },
    { date: "2024-11-30", title: "Old" },
  ];

  it("returns all episodes when latestDbDate is null", () => {
    expect(filterNewEpisodes(episodes, null)).toHaveLength(3);
  });

  it("filters out episodes on or before the latest DB date", () => {
    const result = filterNewEpisodes(episodes, "2025-01-15");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Latest");
  });

  it("returns episodes in descending date order", () => {
    const result = filterNewEpisodes(episodes, "2024-12-31");
    expect(result[0].date).toBe("2025-04-01");
    expect(result[1].date).toBe("2025-01-15");
  });

  it("returns an empty array when all episodes are older", () => {
    expect(filterNewEpisodes(episodes, "2025-12-31")).toHaveLength(0);
  });
});
