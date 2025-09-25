import puppeteer, { Page } from "puppeteer";
import axios from "axios";
import {
  initTvShowPoliticiansTable,
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
} from "../db-tv-shows";
import { AbgeordnetenwatchPolitician } from "../types/abgeordnetenwatch";

const LIST_URL = "https://www.zdf.de/talk/markus-lanz-114";

interface GuestWithRole {
  name: string;
  role?: string;
}

interface NewEpisode {
  episodeUrl: string;
  date: string;
  guests: GuestWithRole[];
}

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  party?: number;
}

// Hilfsfunktion: Name in Vor- und Nachname aufteilen
function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
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
  };

  // Positionen für die Disambiguierung
  const positionMappings: Record<string, string[]> = {
    BUNDESKANZLER: ["BUNDESKANZLER", "KANZLER"],
    MINISTERPRÄSIDENT: [
      "MINISTERPRÄSIDENT",
      "REGIERUNGSCHEF",
      "LANDESVORSITZENDE",
    ],
    MINISTER: ["MINISTER", "BUNDESMINISTER", "STAATSSEKRETÄR"],
    BUNDESTAG: ["BUNDESTAG", "MDB", "ABGEORDNETE"],
    LANDTAG: ["LANDTAG", "MDL", "LANDESABGEORDNETE"],
  };

  // 1. Versuche Partei-Match
  for (const [party, variants] of Object.entries(partyMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      const partyMatch = politicians.find(
        (p) => p.party && p.party.label.toUpperCase().includes(party)
      );
      if (partyMatch) {
        console.log(`✅ Partei-Match gefunden: ${party}`);
        return partyMatch;
      }
    }
  }

  // 2. Versuche Position-Match
  for (const [position, variants] of Object.entries(positionMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      // Für spezifische Positionen, nimm den ersten Treffer
      if (["BUNDESKANZLER", "MINISTERPRÄSIDENT"].includes(position)) {
        console.log(`✅ Position-Match gefunden: ${position}`);
        return politicians[0];
      }
    }
  }

  return null;
}

// Spezielle Override-Cases für bestimmte Politiker
const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    party: 3, // CSU
  },
};

// Politiker-Prüfung mit Disambiguierung
async function checkPolitician(
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
        party: hit.party?.id,
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
          party: selectedPolitician.party?.id,
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
      party: hit.party?.id,
    };
  } catch {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }
}

// Extrahiere die neuesten Episode-Links (nur die ersten paar)
async function getLatestEpisodeLinks(
  page: Page,
  limit = 10
): Promise<string[]> {
  console.log("🔍 Lade die neuesten Episode-Links...");

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

  // Hole die ersten Episode-Links (neueste zuerst)
  const urls = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (as) =>
      Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).slice(
        0,
        limit
      )
  );

  console.log(`📺 Gefunden: ${urls.length} Episode-Links`);
  return urls;
}

// Extrahiere ALLE verfügbaren Episode-Links durch Scrollen und Paginierung
async function getAllEpisodeLinks(page: Page): Promise<string[]> {
  console.log("🔍 Lade ALLE verfügbaren Episode-Links...");

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

  let allUrls = new Set<string>();
  let previousCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 100; // Verhindere Endlosschleife

  console.log("📜 Scrolle für alle verfügbaren Episoden...");

  while (scrollAttempts < maxScrollAttempts) {
    // Sammle alle aktuell sichtbaren Episode-Links
    const currentUrls = await page.$$eval(
      'a[href^="/video/talk/markus-lanz-114/"]',
      (as) => as.map((a) => (a as HTMLAnchorElement).href)
    );

    // Füge neue URLs hinzu
    currentUrls.forEach((url) => allUrls.add(url));

    console.log(
      `   � Gefunden: ${allUrls.size} Episoden (Runde ${scrollAttempts + 1})`
    );

    // Wenn keine neuen URLs gefunden wurden, sind wir am Ende
    if (allUrls.size === previousCount) {
      console.log("   ✅ Keine neuen Episoden mehr gefunden");
      break;
    }

    previousCount = allUrls.size;
    scrollAttempts++;

    // Scrolle nach unten für Lazy Loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });

    // Warte auf neuen Content
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Prüfe auf "Mehr laden" Button oder ähnliches
    try {
      const loadMoreButton = await page.$(
        'button[data-tracking*="load"], button:contains("Mehr"), button:contains("Weitere")'
      );
      if (loadMoreButton) {
        console.log("   🔄 Klicke 'Mehr laden' Button...");
        await loadMoreButton.click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (e) {
      // Kein Load-More Button gefunden, das ist ok
    }
  }

  const finalUrls = Array.from(allUrls);
  console.log(`📺 Gesamt gefunden: ${finalUrls.length} Episode-Links`);

  // Sortiere nach Datum (neuste zuerst)
  const urlsWithDates = finalUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null)
    .sort((a, b) => b.date!.localeCompare(a.date!));

  console.log(
    `📅 Zeitraum: ${urlsWithDates[urlsWithDates.length - 1]?.date} bis ${
      urlsWithDates[0]?.date
    }`
  );

  return urlsWithDates.map((ep) => ep.url);
}

// Extrahiere Datum aus URL (bereits vorhandene Funktion)
function parseISODateFromUrl(url: string): string | null {
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

// Filtere nur neue Episoden (neuere als das letzte Datum in der DB)
function filterNewEpisodes(
  episodeUrls: string[],
  latestDbDate: string | null
): Array<{ url: string; date: string }> {
  console.log(`🗓️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const episodesWithDates = episodeUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null) as Array<{ url: string; date: string }>;

  if (!latestDbDate) {
    console.log("📋 Keine Episoden in DB - alle sind neu");
    return episodesWithDates;
  }

  const newEpisodes = episodesWithDates.filter((ep) => ep.date > latestDbDate);
  console.log(
    `🆕 ${newEpisodes.length} neue Episoden gefunden (nach ${latestDbDate})`
  );

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Name-Filter (bereits vorhanden)
function seemsLikePersonName(name: string): boolean {
  if (!/\S+\s+\S+/.test(name)) return false;
  const re =
    /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
  return re.test(name);
}

// Extrahiere Gäste aus einer Episode
async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string
): Promise<GuestWithRole[]> {
  console.log(`🎬 Crawle Episode: ${episodeUrl}`);

  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  // Sanft scrollen für Lazy-Content
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

  // Primär: Gäste-Sektion mit Rollen
  let guestsWithRoles: GuestWithRole[] = await page
    .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) =>
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

  // Fallback: alle <b> Tags
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

  // Fallback: Alt-Text vom Bild
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

  // Filter und Duplikat-Entfernung
  const filteredGuests = guestsWithRoles.filter((guest) =>
    seemsLikePersonName(guest.name)
  );

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

  console.log(
    `👥 Gäste gefunden: ${uniqueGuests.map((g) => g.name).join(", ")}`
  );
  return uniqueGuests;
}

// Hauptfunktion: Crawle nur neue Episoden
export async function crawlNewMarkusLanzEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Markus Lanz Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Stelle sicher dass die Tabelle existiert
  initTvShowPoliticiansTable();

  // Hole das letzte Datum aus der DB
  const latestDbDate = getLatestEpisodeDate("Markus Lanz");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

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

    // Hole die neuesten Episode-Links
    const latestEpisodeUrls = await getLatestEpisodeLinks(page);

    if (latestEpisodeUrls.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Filtere nur neue Episoden
    const newEpisodes = filterNewEpisodes(latestEpisodeUrls, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    console.log(`🆕 Crawle ${newEpisodes.length} neue Episoden:`);
    newEpisodes.forEach((ep) => console.log(`   📺 ${ep.date}: ${ep.url}`));

    let totalPoliticiansInserted = 0;
    let episodesProcessed = 0;

    // Verarbeite jede neue Episode
    for (const episode of newEpisodes) {
      try {
        console.log(`\n🎬 Verarbeite Episode vom ${episode.date}`);

        const guests = await extractGuestsFromEpisode(page, episode.url);

        if (guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of guests) {
          console.log(
            `   🔍 Prüfe: ${guest.name}${guest.role ? ` (${guest.role})` : ""}`
          );

          const details = await checkPolitician(guest.name, guest.role);

          if (details.isPolitician && details.politicianId) {
            console.log(
              `      ✅ Politiker: ID ${details.politicianId}, Partei ${details.party}`
            );
            politicians.push({
              politicianId: details.politicianId,
              partyId: details.party,
            });
          } else {
            console.log(`      ❌ Kein Politiker`);
          }

          // Pause zwischen API-Calls
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = insertMultipleTvShowPoliticians(
            "Markus Lanz",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
          );
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        episodesProcessed++;
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
      }
    }

    console.log(`\n🎉 Inkrementeller Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl ALLER Episoden
export async function crawlAllMarkusLanzEpisodes(): Promise<void> {
  console.log("🚀 Starte VOLLSTÄNDIGEN Markus Lanz Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Stelle sicher dass die Tabelle existiert
  initTvShowPoliticiansTable();

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

    // Hole ALLE verfügbaren Episode-Links
    const allEpisodeUrls = await getAllEpisodeLinks(page);

    if (allEpisodeUrls.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Konvertiere URLs zu Episode-Objekten mit Datum
    const allEpisodes = allEpisodeUrls
      .map((url) => ({
        url,
        date: parseISODateFromUrl(url),
      }))
      .filter((ep) => ep.date !== null)
      .sort((a, b) => a.date!.localeCompare(b.date!)) as Array<{
      url: string;
      date: string;
    }>; // Älteste zuerst für historischen Crawl

    console.log(`📺 Gefunden: ${allEpisodes.length} Episoden zum Crawlen`);
    console.log(
      `📅 Zeitraum: ${allEpisodes[0]?.date} bis ${
        allEpisodes[allEpisodes.length - 1]?.date
      }`
    );

    let totalPoliticiansInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Verarbeite jede Episode
    for (let i = 0; i < allEpisodes.length; i++) {
      const episode = allEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${allEpisodes.length}] Verarbeite Episode vom ${
            episode.date
          }`
        );

        const guests = await extractGuestsFromEpisode(page, episode.url);

        if (guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of guests) {
          console.log(
            `   🔍 Prüfe: ${guest.name}${guest.role ? ` (${guest.role})` : ""}`
          );

          const details = await checkPolitician(guest.name, guest.role);

          if (details.isPolitician && details.politicianId) {
            console.log(
              `      ✅ Politiker: ID ${details.politicianId}, Partei ${details.party}`
            );
            politicians.push({
              politicianId: details.politicianId,
              partyId: details.party,
            });
          } else {
            console.log(`      ❌ Kein Politiker`);
          }

          // Pause zwischen API-Calls
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = insertMultipleTvShowPoliticians(
            "Markus Lanz",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
          );
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        episodesProcessed++;

        // Fortschritt alle 10 Episoden
        if ((i + 1) % 10 === 0) {
          console.log(
            `\n📊 Zwischenstand: ${episodesProcessed}/${allEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker`
          );
        }
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
        episodesWithErrors++;
      }
    }

    console.log(`\n🎉 VOLLSTÄNDIGER Crawl abgeschlossen!`);
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${allEpisodes.length}`
    );
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);

    if (episodesWithErrors > 0) {
      console.log(
        `⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// CLI-Support für direkten Aufruf
if (require.main === module) {
  const mode = process.argv[2] || "incremental";

  console.log(`🎯 Crawler-Modus: ${mode}`);

  if (mode === "full" || mode === "all" || mode === "complete") {
    crawlAllMarkusLanzEpisodes()
      .then(() => {
        console.log("✅ Vollständiger Crawler beendet");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Vollständiger Crawler Fehler:", error);
        process.exit(1);
      });
  } else {
    crawlNewMarkusLanzEpisodes()
      .then(() => {
        console.log("✅ Inkrementeller Crawler beendet");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Inkrementeller Crawler Fehler:", error);
        process.exit(1);
      });
  }
}
