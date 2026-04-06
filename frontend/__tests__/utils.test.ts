import { cn, POLITICAL_AREA, TV_CHANNEL } from "../lib/utils";

describe("cn (class name utility)", () => {
  it("merges two class strings", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("resolves Tailwind conflicts (last class wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(cn("p-4", undefined, false, null, "m-2")).toBe("p-4 m-2");
  });

  it("handles conditional class objects", () => {
    expect(cn({ "bg-red-500": true, "bg-blue-500": false })).toBe(
      "bg-red-500",
    );
  });

  it("returns an empty string when given no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles an array of classes", () => {
    expect(cn(["text-lg", "font-bold"])).toBe("text-lg font-bold");
  });
});

describe("POLITICAL_AREA", () => {
  it("contains exactly 7 entries", () => {
    expect(POLITICAL_AREA).toHaveLength(7);
  });

  it("ids are sequential starting from 1", () => {
    POLITICAL_AREA.forEach((area, index) => {
      expect(area.id).toBe(index + 1);
    });
  });

  it("every entry has a non-empty label", () => {
    POLITICAL_AREA.forEach((area) => {
      expect(area.label.length).toBeGreaterThan(0);
    });
  });

  it("first entry is about Energie/Klima", () => {
    expect(POLITICAL_AREA[0].label).toContain("Energie");
  });

  it("last entry is about Kultur", () => {
    expect(POLITICAL_AREA[POLITICAL_AREA.length - 1].label).toContain(
      "Kultur",
    );
  });
});

describe("TV_CHANNEL", () => {
  it("contains 'Das Erste'", () => {
    expect(TV_CHANNEL).toContain("Das Erste");
  });

  it("contains 'ZDF'", () => {
    expect(TV_CHANNEL).toContain("ZDF");
  });

  it("is an array with at least 2 entries", () => {
    expect(TV_CHANNEL.length).toBeGreaterThanOrEqual(2);
  });
});
