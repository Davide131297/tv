import { generateYearList } from "../utils/generateYearList";

describe("generateYearList", () => {
  it("returns a list of years from end down to start", () => {
    const result = generateYearList(2020, 2023);
    expect(result).toEqual(["2023", "2022", "2021", "2020"]);
  });

  it("returns a single-element list when start equals end", () => {
    const result = generateYearList(2024, 2024);
    expect(result).toEqual(["2024"]);
  });

  it("returns strings, not numbers", () => {
    const result = generateYearList(2022, 2023);
    result.forEach((y) => expect(typeof y).toBe("string"));
  });

  it("returns years in descending order", () => {
    const result = generateYearList(2018, 2022);
    for (let i = 0; i < result.length - 1; i++) {
      expect(Number(result[i])).toBeGreaterThan(Number(result[i + 1]));
    }
  });

  it("defaults end to current year when not provided", () => {
    const currentYear = new Date().getFullYear();
    const result = generateYearList(currentYear);
    expect(result).toEqual([String(currentYear)]);
  });

  it("returns an empty list when start is greater than end", () => {
    const result = generateYearList(2025, 2020);
    expect(result).toEqual([]);
  });
});
