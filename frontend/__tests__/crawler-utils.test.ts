import {
  toISOFromDDMMYYYY,
  parseISODateFromUrl,
  formatDateForDB,
  seemsLikePersonName,
  isModeratorOrHost,
  filterNewEpisodes,
} from "../lib/crawler-utils";

describe("toISOFromDDMMYYYY", () => {
  it("converts a valid DD.MM.YYYY date string to ISO format", () => {
    expect(toISOFromDDMMYYYY("07.01.2025")).toBe("2025-01-07");
  });

  it("returns null for an invalid format", () => {
    expect(toISOFromDDMMYYYY("2025-01-07")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(toISOFromDDMMYYYY("")).toBeNull();
  });
});

describe("parseISODateFromUrl", () => {
  it("parses a date from a URL like 'vom-7-januar-2025'", () => {
    expect(
      parseISODateFromUrl(
        "https://example.com/show/vom-7-januar-2025",
      ),
    ).toBe("2025-01-07");
  });

  it("pads single-digit days", () => {
    expect(parseISODateFromUrl("vom-3-maerz-2024")).toBe("2024-03-03");
  });

  it("returns null for URLs without a date", () => {
    expect(parseISODateFromUrl("https://example.com/show/latest")).toBeNull();
  });
});

describe("formatDateForDB", () => {
  it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
    expect(formatDateForDB("05.03.2025")).toBe("2025-03-05");
  });

  it("returns YYYY-MM-DD unchanged", () => {
    expect(formatDateForDB("2025-03-05")).toBe("2025-03-05");
  });

  it("pads single-digit day and month to two digits", () => {
    expect(formatDateForDB("5.3.2025")).toBe("2025-03-05");
  });
});

describe("seemsLikePersonName", () => {
  it("returns true for a typical German politician name", () => {
    expect(seemsLikePersonName("Friedrich Merz")).toBe(true);
  });

  it("returns true for a three-part name", () => {
    expect(seemsLikePersonName("Karl Friedrich Müller")).toBe(true);
  });

  it("returns false for a single word", () => {
    expect(seemsLikePersonName("Friedrich")).toBe(false);
  });

  it("returns false for a name starting with lowercase", () => {
    expect(seemsLikePersonName("friedrich Merz")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(seemsLikePersonName("")).toBe(false);
  });
});

describe("isModeratorOrHost", () => {
  it("returns true for a known moderator", () => {
    expect(isModeratorOrHost("Markus Lanz")).toBe(true);
  });

  it("returns true for Maybrit Illner", () => {
    expect(isModeratorOrHost("Maybrit Illner")).toBe(true);
  });

  it("returns false for a politician guest", () => {
    expect(isModeratorOrHost("Friedrich Merz")).toBe(false);
  });

  it("returns true when name matches a word from the show name", () => {
    expect(isModeratorOrHost("Thomas Illner Extra", "Illner Extra")).toBe(true);
  });
});

describe("filterNewEpisodes", () => {
  const episodes = [
    { date: "2025-01-01", title: "Episode A" },
    { date: "2025-03-15", title: "Episode B" },
    { date: "2024-12-20", title: "Episode C" },
  ];

  it("returns all episodes when latestDbDate is null", () => {
    expect(filterNewEpisodes(episodes, null)).toHaveLength(3);
  });

  it("returns only episodes newer than latestDbDate", () => {
    const result = filterNewEpisodes(episodes, "2025-01-01");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Episode B");
  });

  it("returns episodes sorted newest first", () => {
    const result = filterNewEpisodes(episodes, "2024-12-31");
    expect(result[0].date).toBe("2025-03-15");
    expect(result[1].date).toBe("2025-01-01");
  });

  it("returns an empty array when no episodes are newer than the DB date", () => {
    const result = filterNewEpisodes(episodes, "2025-12-31");
    expect(result).toHaveLength(0);
  });
});
