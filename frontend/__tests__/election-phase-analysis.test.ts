import {
  analyzeElectionPhases,
  buildCountdown,
  daysUntil,
  getAnalyzableElections,
  type AppearanceRow,
} from "@/lib/election-phase-analysis";
import type { Wahl } from "@/types";

const row = (party_name: string, episode_date: string, show_name = "Markus Lanz"): AppearanceRow => ({
  party_name,
  episode_date,
  show_name,
});

const wahl = (election_date: string, state_code = "BW"): Wahl => ({
  election_type: state_code === "DE" ? "bundestag" : "landtag",
  state_code,
  state_name: state_code,
  parliament: "Landtag",
  election_date,
});

describe("election-phase-analysis", () => {
  it("berechnet Tage bis zur Wahl", () => {
    expect(daysUntil("2026-03-01", "2026-03-08")).toBe(7);
    expect(daysUntil("2026-03-09", "2026-03-08")).toBe(-1);
  });

  it("berücksichtigt nur vergangene Wahlen mit vollständiger Wahlphase", () => {
    const rows = [row("SPD", "2026-01-01"), row("SPD", "2026-06-01")];
    const groups = getAnalyzableElections(
      [wahl("2026-01-20"), wahl("2026-03-08"), wahl("2026-03-08", "RP"), wahl("2027-01-01")],
      rows,
      "2026-10-16",
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("LTW BW, RP");
  });

  it("vergleicht Anteile in Wahl- und Normalphase", () => {
    const election = "2026-03-08";
    const rows = [
      // Wahlphase: 2 Sendungen, AfD 2x, SPD 2x
      row("AfD", "2026-03-01"),
      row("SPD", "2026-03-01"),
      row("AfD", "2026-02-20"),
      row("SPD", "2026-02-20"),
      // Woche nach der Wahl: weder Wahl- noch Normalphase
      row("CDU", "2026-03-10"),
      // Normalphase: 2 Sendungen, SPD 3x, AfD 1x
      row("SPD", "2025-10-01"),
      row("SPD", "2025-10-01"),
      row("AfD", "2025-11-01"),
      row("SPD", "2025-11-01"),
    ];
    const result = analyzeElectionPhases(rows, [election], [election], false);
    expect(result.electionTotal).toBe(4);
    expect(result.normalTotal).toBe(4);
    expect(result.parties.find((p) => p.party === "CDU")).toBeUndefined();

    const afd = result.parties.find((p) => p.party === "AfD")!;
    expect(afd.electionShare).toBe(0.5);
    expect(afd.normalShare).toBe(0.25);
    expect(afd.shareDeltaPp).toBeCloseTo(25);
    expect(result.parties[0].party).toBe("AfD");
  });

  it("fasst CDU und CSU im Union-Modus zusammen", () => {
    const rows = [row("CDU", "2026-03-01"), row("CSU", "2026-03-01")];
    const result = analyzeElectionPhases(rows, ["2026-03-08"], ["2026-03-08"], true);
    expect(result.parties.map((p) => p.party)).toEqual(["Union"]);
  });

  it("ordnet Auftritte den Countdown-Bins zu", () => {
    const rows = [row("SPD", "2026-03-07"), row("SPD", "2026-03-08"), row("AfD", "2025-10-01")];
    const bins = buildCountdown(rows, ["2026-03-08"], false);
    const beforeElection = bins.find((b) => b.startWeek === -2)!;
    const electionWeek = bins.find((b) => b.startWeek === 0)!;
    expect(beforeElection.SPD).toBe(1);
    expect(beforeElection.inElectionWindow).toBe(true);
    expect(electionWeek.SPD).toBe(1);
    expect(electionWeek.inElectionWindow).toBe(false);
    expect(bins.reduce((sum, b) => sum + b.total, 0)).toBe(2); // 01.10.2025 liegt außerhalb
  });
});
