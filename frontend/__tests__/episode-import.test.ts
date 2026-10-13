import {
  buildAbgeordnetenwatchUrl,
  detectShowFromUrl,
  extractEpisodeDate,
  extractPartyTaggedGuests,
  htmlToImportText,
  mergeGuests,
  normalizePartyName,
  parseImportConfirmPayload,
  parseImportUrl,
  roleMatchesParty,
} from "@/lib/episode-import";

const HAF_HTML = `
<html><head><title>hart aber fair - Das Erste</title>
<meta name="description" content="Talk mit Louis Klamroth"></head>
<body>
<h2 class="conHeadline">Sendung vom 12.10.2026</h2>
<script>var x = "Fake Name, SPD";</script>
<h2 class="conHeadline">Gäste</h2>
<div class="teaser"><h4 class="headline">Nathanael Liminski, CDU</h4><p class="teasertext">Minister | mehr</p></div>
<div class="teaser"><h4 class="headline">Nathanael Liminski, CDU</h4></div>
<div class="teaser"><h4 class="headline">Jan van Aken, DIE LINKE</h4><p>Bundestagsabgeordneter</p></div>
<div class="teaser"><h4 class="headline">Marina Weisband</h4><p>Publizistin</p></div>
<div class="teaser"><h4 class="headline">Karl Lauterbach, SPD</h4></div>
<div class="teaser"><h4 class="headline">Im Interview: Norbert Lammert, CDU</h4></div>
<p>Union und SPD sind mächtig unter Druck, sagt der Text.</p>
</body></html>`;

const ZDF_HTML = `
<html><head>
<meta property="og:image:alt" content="Markus Lanz diskutiert mit seinen G&auml;sten (von links nach rechts): Peter Altmaier, Ulrike Herrmann"/>
</head><body><img alt="Logo" src="x.png"></body></html>`;

describe("parseImportUrl", () => {
  it("akzeptiert Sender-Domains inkl. Subdomains", () => {
    expect(
      parseImportUrl("https://www1.wdr.de/daserste/hartaberfair/index.html").hostname,
    ).toBe("www1.wdr.de");
    expect(parseImportUrl(" https://www.zdf.de/talk/markus-lanz-114 ").hostname).toBe(
      "www.zdf.de",
    );
  });

  it("lehnt fremde Domains, Lookalikes und andere Protokolle ab", () => {
    expect(() => parseImportUrl("https://example.com/")).toThrow("nicht unterstützt");
    expect(() => parseImportUrl("https://evilzdf.de/")).toThrow("nicht unterstützt");
    expect(() => parseImportUrl("http://localhost:3000/")).toThrow("nicht unterstützt");
    expect(() => parseImportUrl("file:///etc/passwd")).toThrow();
    expect(() => parseImportUrl("kein link")).toThrow("Ungültiger Link");
  });
});

describe("detectShowFromUrl", () => {
  it("erkennt Sendung und Sender aus dem Link", () => {
    expect(
      detectShowFromUrl("https://www1.wdr.de/daserste/hartaberfair/index.html"),
    ).toEqual({ show_name: "Hart aber fair", tv_channel: "Das Erste" });
    expect(
      detectShowFromUrl(
        "https://www.zdf.de/video/talk/markus-lanz-114/markus-lanz-vom-8-oktober-2026-100",
      ),
    ).toEqual({ show_name: "Markus Lanz", tv_channel: "ZDF" });
    expect(detectShowFromUrl("https://www.zdf.de/nachrichten")).toBeNull();
  });
});

describe("htmlToImportText", () => {
  it("entfernt Skripte, dedupliziert Zeilen und behält Meta-/Alt-Texte", () => {
    const text = htmlToImportText(HAF_HTML);
    expect(text).not.toContain("Fake Name");
    expect(text.match(/Nathanael Liminski, CDU/g)).toHaveLength(1);
    expect(text).toContain("Sendung vom 12.10.2026");

    const zdfText = htmlToImportText(ZDF_HTML);
    expect(zdfText).toContain("Gästen (von links nach rechts): Peter Altmaier");
    expect(zdfText).not.toContain("Logo");
  });
});

describe("extractEpisodeDate", () => {
  it("liest 'Sendung vom' aus dem Text", () => {
    expect(extractEpisodeDate("Sendung vom 12.10.2026\nAm 01.01.2026", "")).toBe(
      "2026-10-12",
    );
  });

  it("liest ausgeschriebene Daten aus Text und URL-Slug", () => {
    expect(extractEpisodeDate("Markus Lanz vom 8. Oktober 2026", "")).toBe("2026-10-08");
    expect(
      extractEpisodeDate("", "https://www.zdf.de/video/markus-lanz-vom-1-maerz-2026-100"),
    ).toBe("2026-03-01");
  });

  it("gibt null zurück, wenn kein Datum gefunden wird", () => {
    expect(extractEpisodeDate("Kein Datum", "https://www.zdf.de/")).toBeNull();
  });
});

describe("extractPartyTaggedGuests", () => {
  it("findet 'Name, PARTEI'-Zeilen ohne Duplikate und Nicht-Politiker", () => {
    const guests = extractPartyTaggedGuests(htmlToImportText(HAF_HTML));
    expect(guests).toEqual([
      { name: "Nathanael Liminski", role: "CDU" },
      { name: "Jan van Aken", role: "DIE LINKE" },
      { name: "Karl Lauterbach", role: "SPD" },
      { name: "Norbert Lammert", role: "Im Interview, CDU" },
    ]);
  });

  it("übernimmt 'Im Interview' auch aus einer späteren Zeile", () => {
    expect(
      extractPartyTaggedGuests(
        "Norbert Lammert, CDU\nIm Interview: Norbert Lammert, CDU",
      ),
    ).toEqual([{ name: "Norbert Lammert", role: "Im Interview, CDU" }]);
  });

  it("ignoriert Fließtext mit Parteinamen", () => {
    expect(
      extractPartyTaggedGuests("Union und SPD sind mächtig unter Druck, sagt SPD"),
    ).toEqual([]);
  });
});

describe("mergeGuests", () => {
  it("dedupliziert case-insensitiv und ergänzt leere Rollen", () => {
    expect(
      mergeGuests(
        [{ name: "Jan van Aken", role: "" }],
        [
          { name: "jan van aken", role: "DIE LINKE" },
          { name: "Marina  Weisband", role: "Publizistin" },
        ],
      ),
    ).toEqual([
      { name: "Jan van Aken", role: "DIE LINKE" },
      { name: "Marina Weisband", role: "Publizistin" },
    ]);
  });
});

describe("roleMatchesParty", () => {
  it("vergleicht Seitenangabe mit abgeordnetenwatch-Partei", () => {
    expect(roleMatchesParty("DIE LINKE", "Die Linke")).toBe(true);
    expect(roleMatchesParty("Bündnis 90/Die Grünen", "BÜNDNIS 90/DIE GRÜNEN")).toBe(true);
    expect(roleMatchesParty("Publizistin", "CDU")).toBe(false);
    expect(roleMatchesParty("SPD", null)).toBe(false);
  });
});

describe("normalizePartyName / buildAbgeordnetenwatchUrl", () => {
  it("bereinigt Parteinamen wie das Backend", () => {
    expect(normalizePartyName("Die­ Linke")).toBe("Die Linke");
    expect(normalizePartyName("Bayernpartei")).toBe("CSU");
    expect(normalizePartyName(undefined)).toBeNull();
  });

  it("baut den Profil-Link wie das Backend", () => {
    expect(buildAbgeordnetenwatchUrl("Jan van Aken")).toBe(
      "https://www.abgeordnetenwatch.de/profile/jan-van-aken",
    );
    expect(buildAbgeordnetenwatchUrl("Katharina Dröge")).toBe(
      "https://www.abgeordnetenwatch.de/profile/katharina-droege",
    );
  });
});

describe("parseImportConfirmPayload", () => {
  const valid = {
    show_name: "Hart aber fair",
    episode_date: "2026-10-12",
    tv_channel: "Das Erste",
    politicians: [
      {
        politician_id: 78952,
        politician_name: "Jan van Aken",
        party_id: 8,
        party_name: "Die Linke",
        abgeordnetenwatch_url: "https://www.abgeordnetenwatch.de/profile/jan-van-aken",
      },
    ],
  };

  it("akzeptiert gültige Daten", () => {
    expect(parseImportConfirmPayload(valid)).toEqual(valid);
  });

  it("lehnt ungültige Daten ab", () => {
    expect(() => parseImportConfirmPayload({ ...valid, episode_date: "12.10.2026" })).toThrow(
      "Sendedatum",
    );
    expect(() => parseImportConfirmPayload({ ...valid, politicians: [] })).toThrow(
      "Keine Politiker",
    );
    expect(() =>
      parseImportConfirmPayload({
        ...valid,
        politicians: [{ politician_id: "1", politician_name: "X" }],
      }),
    ).toThrow("Ungültiger Politiker-Datensatz");
  });
});
