import { getSelectedOption } from "../utils/getSelectedOption";

describe("getSelectedOption", () => {
  const validValues = ["spd", "cdu", "fdp"] as const;

  it("returns the value from params when it is valid", () => {
    const params = new URLSearchParams("party=spd");
    const result = getSelectedOption(params, "party", [...validValues], "cdu");
    expect(result).toBe("spd");
  });

  it("returns the fallback when the key is missing from params", () => {
    const params = new URLSearchParams("");
    const result = getSelectedOption(params, "party", [...validValues], "cdu");
    expect(result).toBe("cdu");
  });

  it("returns the fallback when the value is not in validValues", () => {
    const params = new URLSearchParams("party=afd");
    const result = getSelectedOption(params, "party", [...validValues], "fdp");
    expect(result).toBe("fdp");
  });

  it("returns the fallback for an empty string value", () => {
    const params = new URLSearchParams("party=");
    const result = getSelectedOption(params, "party", [...validValues], "spd");
    expect(result).toBe("spd");
  });

  it("is case-sensitive (uppercase does not match lowercase valid values)", () => {
    const params = new URLSearchParams("party=SPD");
    const result = getSelectedOption(params, "party", [...validValues], "cdu");
    expect(result).toBe("cdu");
  });
});
