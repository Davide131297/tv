import { parseZdfEpisodeHtml, cleanAcademicTitles } from "../lib/zdf-api";

describe("cleanAcademicTitles", () => {
  it("removes Prof. Dr. prefixes", () => {
    expect(cleanAcademicTitles("Prof. Dr. Bernd Raffelhüschen")).toBe("Bernd Raffelhüschen");
  });

  it("removes Dr. prefix", () => {
    expect(cleanAcademicTitles("Dr. Alice Weidel")).toBe("Alice Weidel");
  });

  it("leaves standard names intact", () => {
    expect(cleanAcademicTitles("Kevin Kühnert")).toBe("Kevin Kühnert");
  });
});

describe("parseZdfEpisodeHtml for Sarah Tacke", () => {
  it("extracts guests with roles from list items and cleans academic titles", () => {
    const html = `
      <section tabindex="0" class="tdeoflm m1pamk63 w1qwhzzk">
        <h3 class="hk1gpei tyrgmig">Zu Gast am 13. August 2026 bei Sarah Tacke:</h3>
        <div class="p4fzw5k tyrgmig m1iv7h85">
          <ul>
            <li><span>Kevin Kühnert, Bereichsleiter Steuern bei Finanzwende e.V. und ehemaliger SPD-Generalsekretär</span></li>
            <li><span>Prof. Dr. Bernd Raffelhüschen, Finanzwissenschaftler und Ökonom</span></li>
            <li><span>Andrea Thoma-Böck, Familienunternehmerin, Präsidentin der "Initiative Zukunft Wirtschaft" und CSU-Mitglied</span></li>
            <li><span>Natalya Nepomnyashcha, Gründerin des "Netzwerks Chancen" für sozialen Aufstieg.</span></li>
          </ul>
        </div>
        <div class="p4fzw5k tyrgmig m1iv7h85">
          13,3 Millionen Menschen sind in Deutschland armutsgefährdet – und es gibt immer mehr Superreiche. Ein entscheidender Faktor ist das Erben.
        </div>
        <div class="p4fzw5k tyrgmig m1iv7h85">
          „SARAH TACKE“ mit dem Thema „Vermögen ohne Leistung – wie ungerecht ist Erben?" vom 13. August 2026.
        </div>
      </section>
    `;

    const result = parseZdfEpisodeHtml("tacke", html);

    expect(result.guests).toHaveLength(4);
    expect(result.guests[0].name).toBe("Kevin Kühnert");
    expect(result.guests[0].role).toContain("Bereichsleiter Steuern");
    expect(result.guests[1].name).toBe("Bernd Raffelhüschen");
    expect(result.guests[1].role).toContain("Finanzwissenschaftler");
    expect(result.guests[2].name).toBe("Andrea Thoma-Böck");
    expect(result.guests[3].name).toBe("Natalya Nepomnyashcha");

    expect(result.description).toContain("13,3 Millionen Menschen sind in Deutschland armutsgefährdet");
    expect(result.description).not.toContain("Zu Gast");
    expect(result.description).not.toContain("SARAH TACKE“ mit dem Thema");
  });

  it("filters out Sarah Tacke if listed in guests", () => {
    const html = `
      <section class="tdeoflm" tabindex="0">
        <ul>
          <li><span>Sarah Tacke, Moderatorin</span></li>
          <li><span>Herbert Reul (CDU), Innenminister NRW</span></li>
        </ul>
      </section>
    `;

    const result = parseZdfEpisodeHtml("tacke", html);
    expect(result.guests).toHaveLength(1);
    expect(result.guests[0].name).toBe("Herbert Reul");
  });

  it("extracts guests from image alt as fallback when list items are missing", () => {
    const html = `
      <main>
        <section class="tdeoflm" tabindex="0">
          <div class="p4fzw5k">
            Die Debatte über innere Sicherheit gewinnt an Schärfe im Land.
          </div>
        </section>
        <img alt="Zu Gast bei „SARAH TACKE“: Herbert Reul (CDU), Düzen Tekkal, Ahmad Mansour" src="test.jpg" />
      </main>
    `;

    const result = parseZdfEpisodeHtml("tacke", html);
    expect(result.guests.map(g => g.name)).toEqual(["Herbert Reul", "Düzen Tekkal", "Ahmad Mansour"]);
  });
});
