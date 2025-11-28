import {
  getLatestEpisodeDate,
  getPoliticalArea,
  insertMultipleShowLinks,
  checkPolitician,
  insertEpisodePoliticalAreas,
  insertMultipleTvShowPoliticians,
} from "../lib/utils.js";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  parseISODateFromUrl,
  toISOFromDDMMYYYY,
  extractDateISO,
  seemsLikePersonName,
  acceptCookieBanner,
  gentleScroll,
  GuestWithRole,
  EpisodeResult,
} from "../lib/crawler-utils.js";
import { Page } from "puppeteer";

const LIST_URL = "https://www.zdf.de/talk/markus-lanz-114";

// ---------------- Lade mehr / Episoden-Links ----------------

async function clickLoadMoreUntilDone(
  page: Page,
  latestDbDate: string | null,
  maxClicks = 100 // Erhöht von 50 auf 100 für mehr Episoden
) {
  console.log("Beginne mit intelligentem Laden der Episoden...");

  // Warte erstmal dass die Seite vollständig geladen ist
  await page.waitForSelector("main").catch(() => {});

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

    // Prüfe ob wir schon bis zum 07.01.2025 oder dem DB-Datum zurück sind
    if (oldestVisibleDate && oldestVisibleDate <= latestDbDate) {
      console.log(
        "✅ Bereits bis zur neuesten DB-Episode geladen - überspringe weiteres Laden"
      );
      return;
    }

    // Wenn wir noch nicht weit genug zurück sind, weiterladen
    console.log(
      "� Noch nicht alle relevanten Episoden geladen - lade weitere..."
    );
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
              res.url().includes("seasonByCanonical")
          ),
          hasButton.click(),
        ]);
        console.log(`Netzwerk-Response: ${response.status()}`);
      } catch {
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

    // Nach dem Laden: Prüfe ob wir jetzt weit genug zurück sind
    if (latestDbDate && newCount > currentCount) {
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

      console.log(`Aktuell ${newerEpisodesCount} neue Episoden sichtbar`);
      console.log(`Älteste sichtbare Episode: ${oldestVisibleDate}`);

      // Stoppe nur wenn wir bis zur DB-Episode oder weiter zurück geladen haben
      if (oldestVisibleDate && oldestVisibleDate <= latestDbDate) {
        console.log(
          `✅ Alle relevanten Episoden geladen (bis ${oldestVisibleDate}) - stoppe weitere Suche`
        );
        break;
      } else {
        console.log(
          `🔄 Noch nicht weit genug zurück (${oldestVisibleDate} > ${latestDbDate}) - lade weitere...`
        );
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

// ---------------- Gäste aus Episode ----------------

async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string
): Promise<GuestWithRole[]> {
  await page.goto(episodeUrl, { waitUntil: "networkidle2" });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main").catch(() => {});

  // Sanft scrollen, um Lazy-Content zu triggern
  await gentleScroll(page);

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

// ---------------- Episode Text Extraktion ----------------

async function extractPoliticalAreaIds(
  page: Page
): Promise<number[] | [] | null> {
  try {
    // Mehrere Selektoren versuchen für die Episode-Beschreibung
    const selectors = [
      'p[data-testid="short-description"]',
      "p.daltwma",
      "p.dfv1fla", // Fallback aus dem HTML
      "section p:not(:empty)", // Allgemeiner Fallback
    ];

    let description: string | null = null;

    for (const selector of selectors) {
      description = await page
        .$eval(selector, (el) => {
          const text = (el.textContent || "").trim();
          // Filtere sehr kurze oder generische Texte aus
          if (
            text.length < 20 ||
            text.includes("Abspielen") ||
            text.includes("Merken")
          ) {
            return null;
          }
          return text;
        })
        .catch(() => null);

      if (description) {
        break; // Beende die Schleife sofort
      }
    }

    if (description) {
      const politicalAreaIds = await getPoliticalArea(description);
      return politicalAreaIds;
    } else {
      return null;
    }
  } catch (error) {
    console.warn(`Fehler beim Extrahieren der Episode-Beschreibung:`, error);
    return null;
  }
}

export default async function CrawlLanz() {
  // Hole das Datum der neuesten Episode aus der DB
  const latestEpisodeDate = await getLatestEpisodeDate("Markus Lanz");
  console.log(
    `Neueste Episode in DB: ${latestEpisodeDate || "Keine vorhanden"}`
  );

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2" });

    // Cookie-Banner akzeptieren falls vorhanden
    await acceptCookieBanner(page);

    await clickLoadMoreUntilDone(page, latestEpisodeDate);

    const episodeUrls = await collectEpisodeLinks(page);
    console.log(`Gefundene Episode-URLs: ${episodeUrls.length}`);

    if (!episodeUrls.length) {
      console.warn("Keine Episoden-Links gefunden (clientseitig).");
      return {
        message: "Keine Episoden-Links gefunden",
        status: 404,
      };
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
      return {
        message: "Keine neuen Episoden zu crawlen gefunden",
        status: 200,
      };
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
          const p = await setupSimplePage(browser);
          try {
            const [guests, date, politicalAreaIds] = await Promise.all([
              extractGuestsFromEpisode(p, url),
              extractDateISO(p, url),
              extractPoliticalAreaIds(p),
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
              politicalAreaIds: politicalAreaIds || [],
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
    let totalPoliticalAreasInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesWithPoliticians = 0;

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert = finalResults
      .filter((episode) => {
        if (!episode.date) return false;
        // Prüfe ob Episode politische Gäste hat
        const hasPoliticians = episode.guestsDetailed.some(
          (guest) => guest.isPolitician && guest.politicianId
        );
        return hasPoliticians;
      })
      .map((episode) => ({
        episodeUrl: episode.episodeUrl,
        episodeDate: episode.date!,
      }));

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Markus Lanz",
        episodeLinksToInsert
      );
      console.log(
        `Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

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

      // Speichere Politiker
      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
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

      // Speichere politische Themenbereiche
      if (episode.politicalAreaIds && episode.politicalAreaIds.length > 0) {
        const insertedAreas = await insertEpisodePoliticalAreas(
          "Markus Lanz",
          episode.date,
          episode.politicalAreaIds
        );

        totalPoliticalAreasInserted += insertedAreas;

        console.log(
          `${episode.date}: ${insertedAreas}/${episode.politicalAreaIds.length} Themenbereiche eingefügt`
        );
      }
    }

    console.log(`\n=== Datenbank-Speicherung Zusammenfassung ===`);
    console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);
    console.log(
      `Politische Themenbereiche gesamt eingefügt: ${totalPoliticalAreasInserted}`
    );
    console.log(`Episode-URLs gesamt eingefügt: ${totalEpisodeLinksInserted}`);
  } catch (error) {
    console.error("Schwerer Fehler im Crawl-Prozess:", error);
    throw error; // Werfe den Fehler weiter, damit er im Log erscheint
  } finally {
    await browser.close().catch(() => {});
  }
}
