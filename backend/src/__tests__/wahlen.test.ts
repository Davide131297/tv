import { parseWahlen } from "../crawler/wahlen";

jest.mock("../supabase", () => ({
  supabase: {},
}));

const row = (id: string, date: string, state: string, parliament: string) => `
<tr id="${id}">
 <td>&nbsp;</td>
 <td class="l">${date}</td>
 <td class="l">${state}</td>
 <td class="l">${parliament}</td>
 <td>5 Jahre</td>
</tr>`;

const html = `<table>
${row("kw-by-2026", "8. März 2026", "Bayern", "Kreistage, Stadträte, Gemeinderäte")}
${row("ltw-bw-2026", "<strong>8. März 2026</strong>", '<a href="#"><strong>Baden-Württemberg</strong></a>', "<strong>Landtag</strong>")}
${row("ltw-be-2026", "<strong>20.&nbsp;September 2026</strong>", "<strong>Berlin</strong>", "<strong>Abgeordnetenhaus,</strong> Bezirksverordnetenversammlungen")}
${row("ltw-hh-2025", '<em style="color:#888888">2. März</em>', "<em>Hamburg</em>", "<em>Bürgerschaft</em>")}
${row("kw-sh-2023", "<em>14. Mai</em>", "<em>Bremen</em>", "<em>Bürgerschaft (Landtag),</em> Stadtbürgerschaft")}
${row("ltw-hb-2023", "<em>14. Mai</em>", "<em>Schleswig-Holstein</em>", "<em>Kreistage, Stadtvertretungen</em>")}
${row("ltw-by-2028", "<strong>Herbst</strong>", "<strong>Bayern</strong>", "<strong>Landtag,</strong> Bezirkstage")}
${row("btw-be-2024", "<em>11. Februar</em>", "<em>Berlin</em>", "<em>Bundestag (Teil&shy;wieder&shy;holungswahl)</em>")}
${row("btw-de-2025-vorgezogen", "<em>23. Februar<br>(mehr dazu …)</em>", "<em>alle Bundesländer</em>", "<em>Bundestag</em>")}
${row("btw-de-2025", "<strong><strike>28. September</strike></strong>", "<strike>alle Bundesländer</strike>", "<strike>Bundestag</strike>")}
${row("btw-de-2029", "<strong>Winter</strong>", "<strong>alle Bundesländer</strong>", "<strong>Bundestag</strong>")}
</table>`;

describe("parseWahlen", () => {
  const result = parseWahlen(html);

  it("extrahiert Landtags- und Bundestagswahlen mit konkretem Datum", () => {
    expect(result.map((e) => e.id)).toEqual([
      "landtag-hb-2023",
      "bundestag-de-2025",
      "landtag-hh-2025",
      "landtag-bw-2026",
      "landtag-be-2026",
    ]);
  });

  it("nimmt das Jahr aus der Zeilen-ID, wenn es im Datum fehlt", () => {
    expect(result.find((e) => e.id === "landtag-hh-2025")?.election_date).toBe(
      "2025-03-02",
    );
  });

  it("erkennt Landtagswahlen am Parlament statt an vertauschten IDs", () => {
    expect(result.find((e) => e.id === "landtag-hb-2023")).toEqual({
      id: "landtag-hb-2023",
      election_type: "landtag",
      state_code: "HB",
      state_name: "Bremen",
      parliament: "Bürgerschaft (Landtag)",
      election_date: "2023-05-14",
    });
  });

  it("übernimmt die vorgezogene statt der abgesagten Bundestagswahl", () => {
    expect(result.find((e) => e.id === "bundestag-de-2025")).toEqual({
      id: "bundestag-de-2025",
      election_type: "bundestag",
      state_code: "DE",
      state_name: "Deutschland",
      parliament: "Bundestag",
      election_date: "2025-02-23",
    });
  });

  it("verarbeitet geschützte Leerzeichen im Datum", () => {
    expect(result.find((e) => e.id === "landtag-be-2026")?.election_date).toBe(
      "2026-09-20",
    );
  });
});
