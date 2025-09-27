import puppeteer, { Page } from "puppeteer";
import axios from "axios";
import { AbgeordnetenwatchPolitician } from "../types/abgeordnetenwatch.js";
import {
  initTvShowPoliticiansTable,
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
} from "../db-tv-shows.js";

const LIST_URL = "https://www.zdf.de/talk/markus-lanz-114";

// ---------------- Types ----------------

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

interface GuestWithRole {
  name: string;
  role?: string; // z.B. "CDU-Politiker", "Journalistin", etc.
}

interface EpisodeResult {
  episodeUrl: string;
  date: string | null;
  guests: string[];
  guestsDetailed: GuestDetails[];
}

// ---------------- Lade mehr / Episoden-Links ----------------

async function clickLoadMoreUntilDone(
  page: Page,
  latestDbDate: string | null,
  maxClicks = 50
) {
  console.log("Beginne mit intelligentem Laden der Episoden...");

  // Warte erstmal dass die Seite vollständig geladen ist
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  // Initial count
  let currentCount = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (els) => els.length
  );
  console.log(`Initiale Episoden: ${currentCount}`);

  // Prüfe die Daten der sichtbaren Episoden
  if (latestDbDate) {
    const currentUrls = await page.$$eval(
      'a[href^="/video/talk/markus-lanz-114/"]',
      (as) => as.map((a) => (a as HTMLAnchorElement).href)
    );

    let newerEpisodesCount = 0;
    let oldestVisibleDate: string | null = null;

    for (const url of currentUrls) {
      const urlDate = parseISODateFromUrl(url);
      if (urlDate) {
        if (!oldestVisibleDate || urlDate < oldestVisibleDate) {
          oldestVisibleDate = urlDate;
        }
        if (urlDate > latestDbDate) {
          newerEpisodesCount++;
        }
      }
    }

    console.log(`Bereits ${newerEpisodesCount} neue Episoden sichtbar`);
    console.log(`Älteste sichtbare Episode: ${oldestVisibleDate}`);
    console.log(`Neueste DB-Episode: ${latestDbDate}`);

    if (newerEpisodesCount > 0) {
      console.log(
        "✅ Neue Episoden bereits sichtbar - überspringe weiteres Laden"
      );
      return;
    }

    // Da ZDF die neuesten Episoden zuerst zeigt:
    // Wenn keine neuen Episoden in den ersten 27 sichtbar sind, gibt es keine neuen
    console.log(
      "🚫 Keine neuen Episoden in den initialen Episoden - Abbruch ohne weiteres Laden"
    );
    return;
  }

  for (let i = 0; i < maxClicks; i++) {
    console.log(`\n--- Versuch ${i + 1} ---`);

    // Scroll bis zum Ende
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Warte ein bisschen
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Prüfe ob der "Mehr laden" Button da ist
    const hasButton = await page.$('[data-testid="pagination-button"]');

    if (hasButton) {
      console.log("Mehr-laden Button gefunden - versuche zu klicken");

      // Scroll zum Button
      await hasButton.scrollIntoView();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Klicke den Button und warte auf GraphQL Response
      try {
        const [response] = await Promise.all([
          page.waitForResponse(
            (res) =>
              res.url().includes("graphql") &&
              res.url().includes("seasonByCanonical"),
            { timeout: 15000 }
          ),
          hasButton.click(),
        ]);
        console.log(`Netzwerk-Response: ${response.status()}`);
      } catch (e) {
        console.log("Button-Klick ohne Response - versuche trotzdem");
        await hasButton.click();
      }

      // Warte auf neue Inhalte
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      console.log("Kein Mehr-laden Button gefunden");

      // Versuche einfach weiter zu scrollen für lazy loading
      for (let scroll = 0; scroll < 5; scroll++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Prüfe neue Anzahl
    const newCount = await page.$$eval(
      'a[href^="/video/talk/markus-lanz-114/"]',
      (els) => els.length
    );
    console.log(`Episode-Count: ${currentCount} -> ${newCount}`);

    // Nach dem Laden: Prüfe ob wir jetzt neue Episoden haben
    if (latestDbDate && newCount > currentCount) {
      const currentUrls = await page.$$eval(
        'a[href^="/video/talk/markus-lanz-114/"]',
        (as) => as.map((a) => (a as HTMLAnchorElement).href)
      );

      let newerEpisodesCount = 0;
      for (const url of currentUrls) {
        const urlDate = parseISODateFromUrl(url);
        if (urlDate && urlDate > latestDbDate) {
          newerEpisodesCount++;
        }
      }

      if (newerEpisodesCount > 0) {
        console.log(
          `✅ ${newerEpisodesCount} neue Episoden gefunden - stoppe weitere Suche`
        );
        break;
      }
    }

    if (newCount <= currentCount) {
      console.log("Keine neuen Episoden - versuche weiter");
      // Noch ein bisschen warten für lazy loading
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const finalCheck = await page.$$eval(
        'a[href^="/video/talk/markus-lanz-114/"]',
        (els) => els.length
      );
      if (finalCheck <= currentCount) {
        console.log(`Definitiv keine neuen Episoden. Höre auf.`);
        break;
      }
      currentCount = finalCheck;
    } else {
      currentCount = newCount;
      console.log(`✓ Neue Episoden geladen! Gesamt: ${currentCount}`);
    }
  }

  const finalCount = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (els) => els.length
  );
  console.log(`Laden beendet. Insgesamt ${finalCount} Episoden gefunden.`);
}

async function collectEpisodeLinks(page: Page) {
  const urls = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href)))
  );
  return urls;
}

// ---------------- Name-Filter / Heuristik ----------------

function seemsLikePersonName(name: string) {
  if (!/\S+\s+\S+/.test(name)) return false; // mind. zwei Wörter
  const re =
    /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
  return re.test(name);
}

// ---------------- Datum-Helfer ----------------

function toISOFromDDMMYYYY(d: string) {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

const DE_MONTHS: Record<string, string> = {
  januar: "01",
  februar: "02",
  märz: "03",
  maerz: "03",
  april: "04",
  mai: "05",
  juni: "06",
  juli: "07",
  august: "08",
  september: "09",
  oktober: "10",
  november: "11",
  dezember: "12",
};

function parseISODateFromUrl(url: string): string | null {
  const m = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
  if (!m) return null;
  let [_, d, mon, y] = m;
  const key = mon
    .normalize("NFD")
    .replace(/\u0308/g, "")
    .toLowerCase();
  const mm = DE_MONTHS[key];
  if (!mm) return null;
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

async function extractDateISO(
  page: Page,
  episodeUrl: string
): Promise<string | null> {
  // 1) JSON-LD
  const ldDates: string[] = await page
    .$$eval('script[type="application/ld+json"]', (nodes) => {
      const fields = [
        "uploadDate",
        "datePublished",
        "dateCreated",
        "startDate",
        "endDate",
      ];
      const out: string[] = [];
      function collect(obj: any) {
        if (!obj || typeof obj !== "object") return;
        for (const k of fields) {
          const v = obj[k];
          if (typeof v === "string") out.push(v);
        }
        if (Array.isArray(obj)) obj.forEach(collect);
        else Object.values(obj).forEach((v) => collect(v));
      }
      nodes.forEach((n) => {
        try {
          const txt = n.textContent || "";
          if (!txt.trim()) return;
          collect(JSON.parse(txt));
        } catch {}
      });
      return out;
    })
    .catch(() => []);

  for (const cand of ldDates) {
    const iso = cand.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (iso) return iso;
    const de = cand.match(/\b\d{2}\.\d{2}\.\d{4}\b/)?.[0];
    if (de) {
      const conv = toISOFromDDMMYYYY(de);
      if (conv) return conv;
    }
  }

  // 2) DD.MM.YYYY im Text
  const textDate = await page
    .$eval("main", (el) => {
      const t = el.textContent || "";
      const m = t.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
      return m ? m[0] : null;
    })
    .catch(() => null);

  if (textDate) {
    const iso = toISOFromDDMMYYYY(textDate);
    if (iso) return iso;
  }

  // 3) URL-Fallback
  return parseISODateFromUrl(episodeUrl);
}

// ---------------- Politiker-Check ----------------

function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
}

// Spezielle Override-Cases für bestimmte Politiker
const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    politicianName: "Manfred Weber",
    party: 3, // CSU
    partyName: "CSU",
  },
};

export async function checkPolitician(
  name: string,
  role?: string
): Promise<GuestDetails> {
  // Prüfe zuerst Override-Cases
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(`✅ Override angewendet für ${name} -> CSU`);
    return POLITICIAN_OVERRIDES[name];
  }

  const { first, last } = splitFirstLast(name);
  if (!first || !last) {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }

  const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
    first
  )}&last_name=${encodeURIComponent(last)}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const politicians: AbgeordnetenwatchPolitician[] = data?.data || [];

    if (politicians.length === 0) {
      return {
        name,
        isPolitician: false,
        politicianId: null,
      };
    }

    if (politicians.length === 1) {
      // Nur ein Treffer - verwende ihn direkt
      const hit = politicians[0];
      return {
        name,
        isPolitician: true,
        politicianId: hit.id,
        politicianName: hit.label || name,
        party: hit.party?.id,
        partyName: hit.party?.label,
      };
    }

    // Mehrere Treffer - versuche Disambiguierung über ZDF-Rolle
    if (role && politicians.length > 1) {
      console.log(
        `🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`
      );

      const selectedPolitician = disambiguateByRole(politicians, role);
      if (selectedPolitician) {
        console.log(
          `✅ Politiker ausgewählt: ${selectedPolitician.label} (${selectedPolitician.party?.label})`
        );
        return {
          name,
          isPolitician: true,
          politicianId: selectedPolitician.id,
          politicianName: selectedPolitician.label || name,
          party: selectedPolitician.party?.id,
          partyName: selectedPolitician.party?.label,
        };
      }
    }

    // Fallback: ersten Treffer verwenden
    console.log(
      `⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`
    );
    const hit = politicians[0];
    return {
      name,
      isPolitician: true,
      politicianId: hit.id,
      politicianName: hit.label || name,
      party: hit.party?.id,
      partyName: hit.party?.label,
    };
  } catch {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }
}

// Hilfsfunktion zur Disambiguierung basierend auf ZDF-Rolle
function disambiguateByRole(
  politicians: AbgeordnetenwatchPolitician[],
  role: string
): AbgeordnetenwatchPolitician | null {
  const roleUpper = role.toUpperCase();

  // Partei-Mappings für die Disambiguierung
  const partyMappings: Record<string, string[]> = {
    CDU: ["CDU", "CHRISTLICH DEMOKRATISCHE UNION"],
    CSU: ["CSU", "CHRISTLICH-SOZIALE UNION"],
    SPD: ["SPD", "SOZIALDEMOKRATISCHE PARTEI"],
    FDP: ["FDP", "FREIE DEMOKRATISCHE PARTEI"],
    GRÜNE: ["BÜNDNIS 90/DIE GRÜNEN", "DIE GRÜNEN"],
    LINKE: ["DIE LINKE"],
    AFD: ["AFD", "ALTERNATIVE FÜR DEUTSCHLAND"],
    PARTEI: ["DIE PARTEI"],
  };

  for (const [shortName, fullNames] of Object.entries(partyMappings)) {
    if (roleUpper.includes(shortName)) {
      // Suche Politiker mit passender Partei
      for (const politician of politicians) {
        const partyLabel = politician.party?.label?.toUpperCase() || "";
        if (fullNames.some((name) => partyLabel.includes(name))) {
          return politician;
        }
      }
    }
  }

  return null;
}

// ---------------- Gäste aus Episode ----------------

async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string
): Promise<GuestWithRole[]> {
  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  // sanft scrollen, um Lazy-Content zu triggern
  await page
    .evaluate(async () => {
      await new Promise<void>((res) => {
        let y = 0;
        const i = setInterval(() => {
          window.scrollBy(0, 500);
          if ((y += 500) > document.body.scrollHeight) {
            clearInterval(i);
            res();
          }
        }, 50);
      });
    })
    .catch(() => {});

  // Primär: typische Gäste-Sektion - jetzt mit Rollen
  let guestsWithRoles: GuestWithRole[] = await page
    .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .filter((t) => t.includes(",")) // "Name, Rolle"
            .map((t) => {
              const parts = t.split(",");
              return {
                name: parts[0].trim(),
                role: parts.slice(1).join(",").trim() || undefined,
              };
            })
        )
      )
    )
    .catch(() => []);

  // Fallback 1: alle <b> unter <main>, streng filtern
  if (!guestsWithRoles.length) {
    guestsWithRoles = await page
      .$$eval("main b", (els) =>
        Array.from(
          new Set(
            els
              .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
              .filter(Boolean)
              .filter((t) => t.includes(","))
              .map((t) => {
                const parts = t.split(",");
                return {
                  name: parts[0].trim(),
                  role: parts.slice(1).join(",").trim() || undefined,
                };
              })
          )
        )
      )
      .catch(() => []);
  }

  // Fallback 2: alt-Text des großen Bildes (dort stehen oft die Namen, kommasepariert)
  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Markus Lanz"]',
        (el) => el.getAttribute("alt") || ""
      )
      .catch(() => "");
    if (alt && alt.includes(":")) {
      const list = alt
        .split(":")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      guestsWithRoles = list.map((name) => ({ name, role: undefined }));
    }
  }

  // final: Heuristik und Duplikat-Entfernung
  const filteredGuests = guestsWithRoles.filter((guest) =>
    seemsLikePersonName(guest.name)
  );

  // Entferne Duplikate basierend auf Namen
  const uniqueGuests = filteredGuests.reduce(
    (acc: GuestWithRole[], current) => {
      const existing = acc.find((guest) => guest.name === current.name);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    },
    []
  );

  return uniqueGuests;
}

// ---------------- Hauptlauf ----------------

export async function crawlAllMarkusLanzEpisodes(): Promise<EpisodeResult[]> {
  // Stelle sicher dass die Datenbank-Tabelle existiert
  initTvShowPoliticiansTable();

  // Hole das Datum der neuesten Episode aus der DB
  const latestEpisodeDate = getLatestEpisodeDate("Markus Lanz");
  console.log(
    `Neueste Episode in DB: ${latestEpisodeDate || "Keine vorhanden"}`
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    });
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Cookie-Banner akzeptieren falls vorhanden
    try {
      await page.waitForSelector('[data-testid="cmp-accept-all"]', {
        timeout: 5000,
      });
      await page.click('[data-testid="cmp-accept-all"]');
      console.log("Cookie-Banner akzeptiert");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (e) {
      console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
    }

    await clickLoadMoreUntilDone(page, latestEpisodeDate);

    const episodeUrls = await collectEpisodeLinks(page);
    console.log(`Gefundene Episode-URLs: ${episodeUrls.length}`);

    if (!episodeUrls.length) {
      console.warn("Keine Episoden-Links gefunden (clientseitig).");
      return [];
    }

    // Filtere URLs nach Datum - nur neuere als die neueste in der DB
    let filteredUrls = episodeUrls;
    if (latestEpisodeDate) {
      filteredUrls = episodeUrls.filter((url) => {
        const urlDate = parseISODateFromUrl(url);
        // Nur Episoden crawlen die neuer sind als die neueste in der DB
        return urlDate && urlDate > latestEpisodeDate;
      });
      console.log(
        `Nach Datum-Filter: ${filteredUrls.length}/${episodeUrls.length} URLs (nur neuer als ${latestEpisodeDate})`
      );
    } else {
      console.log(
        "Keine neueste Episode in DB gefunden - crawle alle Episoden"
      );
    }

    if (!filteredUrls.length) {
      console.log("Keine neuen Episoden zu crawlen gefunden");
      return [];
    }

    // Debug: zeige die ersten paar URLs und Daten
    console.log("Erste 5 zu crawlende Episode-URLs:");
    filteredUrls.slice(0, 5).forEach((url, i) => {
      console.log(`${i + 1}. ${url}`);
      const dateFromUrl = parseISODateFromUrl(url);
      if (dateFromUrl) console.log(`   -> Datum aus URL: ${dateFromUrl}`);
    });

    // Dedup nach Datum
    const byDate = new Map<string, EpisodeResult>();

    // Verarbeite Episoden in kleinen Batches um nicht zu viele Browser-Tabs zu öffnen
    const batchSize = 6;
    const results: EpisodeResult[] = [];

    for (let i = 0; i < filteredUrls.length; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);
      console.log(
        `Verarbeite Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          filteredUrls.length / batchSize
        )} (${batch.length} Episoden)`
      );

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const p = await browser.newPage();
          try {
            const [guests, date] = await Promise.all([
              extractGuestsFromEpisode(p, url),
              extractDateISO(p, url),
            ]);

            // Politiker-Check je Gast (sequentiell um API-Limits zu respektieren)
            const guestsDetailed: GuestDetails[] = [];
            for (const guest of guests) {
              const details = await checkPolitician(guest.name, guest.role);
              guestsDetailed.push(details);
              // Kleine Pause zwischen API-Calls
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            // Konvertiere GuestWithRole[] zu string[] für Backwards-Kompatibilität
            const guestNames = guests.map((g) => g.name);

            const res: EpisodeResult = {
              episodeUrl: url,
              date,
              guests: guestNames,
              guestsDetailed,
            };

            // Dedup: pro Datum nur ein Eintrag, ggf. den mit mehr Gästen behalten
            if (date) {
              const prev = byDate.get(date);
              if (!prev || guestNames.length > prev.guests.length) {
                byDate.set(date, res);
              }
            }

            return res;
          } catch (e) {
            console.warn("Fehler bei Episode:", url, e);
            return {
              episodeUrl: url,
              date: null,
              guests: [],
              guestsDetailed: [],
            };
          } finally {
            await p.close().catch(() => {});
          }
        })
      );

      results.push(...batchResults);

      // Kurze Pause zwischen Batches
      if (i + batchSize < filteredUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const finalResults =
      byDate.size > 0 ? Array.from(byDate.values()) : results;

    // Sortiere nach Datum (neueste zuerst)
    finalResults.sort((a: EpisodeResult, b: EpisodeResult) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    console.log(`\n=== Crawling-Zusammenfassung ===`);
    console.log(`Gesamte URLs gefunden: ${episodeUrls.length}`);
    console.log(`Nach Filter (nur neue): ${filteredUrls.length}`);
    console.log(`Erfolgreich gecrawlt: ${finalResults.length}`);
    console.log(
      `Episoden mit Datum: ${
        finalResults.filter((r: EpisodeResult) => r.date).length
      }`
    );
    if (latestEpisodeDate) {
      console.log(`Neueste DB-Episode vor Crawl: ${latestEpisodeDate}`);
    }
    console.log(
      `Neueste gecrawlte Episode: ${finalResults[0]?.date || "Kein Datum"}`
    );
    console.log(
      `Älteste gecrawlte Episode: ${
        finalResults[finalResults.length - 1]?.date || "Kein Datum"
      }`
    );

    // Zeige 2025 Episoden
    const episodes2025 = finalResults.filter((r: EpisodeResult) =>
      r.date?.startsWith("2025")
    );
    console.log(`\n2025 Episoden: ${episodes2025.length}`);
    if (episodes2025.length > 0) {
      console.log(
        `Erste 2025 Episode: ${episodes2025[episodes2025.length - 1]?.date}`
      );
      console.log(`Letzte 2025 Episode: ${episodes2025[0]?.date}`);
    }

    // Speichere politische Gäste in der Datenbank
    console.log(`\n=== Speichere Daten in Datenbank ===`);
    let totalPoliticiansInserted = 0;
    let episodesWithPoliticians = 0;

    for (const episode of finalResults) {
      if (!episode.date) {
        console.log(`Überspringe Episode ohne Datum: ${episode.episodeUrl}`);
        continue;
      }

      // Filtere nur Politiker heraus
      const politicians = episode.guestsDetailed
        .filter((guest) => guest.isPolitician && guest.politicianId)
        .map((guest) => ({
          politicianId: guest.politicianId!,
          politicianName: guest.politicianName || guest.name,
          partyId: guest.party,
          partyName: guest.partyName,
        }));

      if (politicians.length > 0) {
        const inserted = insertMultipleTvShowPoliticians(
          "Markus Lanz",
          episode.date,
          politicians
        );

        totalPoliticiansInserted += inserted;
        episodesWithPoliticians++;

        console.log(
          `${episode.date}: ${inserted}/${politicians.length} Politiker eingefügt`
        );
      }
    }

    console.log(`\n=== Datenbank-Speicherung Zusammenfassung ===`);
    console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);

    return finalResults;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Hauptausführung wenn das Skript direkt aufgerufen wird
if (import.meta.url === `file://${process.argv[1]}`) {
  crawlAllMarkusLanzEpisodes()
    .then((results) => {
      console.log(
        `✅ Crawling abgeschlossen. ${results.length} Episoden verarbeitet.`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Fehler beim Crawling:", error);
      process.exit(1);
    });
}
