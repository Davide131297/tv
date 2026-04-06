import { updateSearchParams } from "../utils/updateSearchParams";

describe("updateSearchParams", () => {
  it("sets a string value", () => {
    const current = new URLSearchParams("");
    const result = updateSearchParams(current, { year: "2024" });
    expect(result).toBe("?year=2024");
  });

  it("deletes a key when value is an empty string", () => {
    const current = new URLSearchParams("year=2024&show=Lanz");
    const result = updateSearchParams(current, { year: "" });
    expect(result).toBe("?show=Lanz");
  });

  it("sets boolean true as the string 'true'", () => {
    const current = new URLSearchParams("");
    const result = updateSearchParams(current, { active: true });
    expect(result).toBe("?active=true");
  });

  it("deletes a key when boolean value is false", () => {
    const current = new URLSearchParams("active=true&year=2024");
    const result = updateSearchParams(current, { active: false });
    expect(result).toBe("?year=2024");
  });

  it("handles array values by appending multiple entries", () => {
    const current = new URLSearchParams("");
    const result = updateSearchParams(current, { party: ["cdu", "spd"] });
    const params = new URLSearchParams(result.slice(1));
    expect(params.getAll("party")).toEqual(["cdu", "spd"]);
  });

  it("skips undefined values", () => {
    const current = new URLSearchParams("year=2023");
    const result = updateSearchParams(current, { year: undefined });
    expect(result).toBe("?year=2023");
  });

  it("returns an empty string when no params remain", () => {
    const current = new URLSearchParams("year=2023");
    const result = updateSearchParams(current, { year: "" });
    expect(result).toBe("");
  });
});
