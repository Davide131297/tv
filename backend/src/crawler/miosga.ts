import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  getLatestEpisodeDate,
  getPoliticalArea,
  insertMultipleShowLinks,
  extractGuestsWithAI,
  checkPolitician,
  insertEpisodePoliticalAreas,
  insertMultipleTvShowPoliticians,
} from "../lib/utils.js";
import { Page } from "puppeteer";

type GuestWithRole = {
  name: string;
  role?: string;
};

const LIST_URL =
  "https://www.ardaudiothek.de/sendung/caren-miosga/urn:ard:show:d6e5ba24e1508004/";

// Hilfsfunktion: Konvertiere dd.mm.yyyy zu yyyy-mm-dd für DB-Konsistenz
function formatDateForDB(dateStr: string): string {
  if (dateStr.includes(".")) {
    // Format: dd.mm.yyyy -> yyyy-mm-dd
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Falls bereits im richtigen Format
  return dateStr;
}

// Extrahiere nur NEUE Episode-Links (crawlt nur bis zum letzten bekannten Datum)
async function getNewEpisodeLinks(
  page: Page,
  latestDbDate: string | null
): Promise<
  Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }>
> {
  console.log("🔍 Lade nur neue Caren Miosga Episode-Links...");
  console.log(`🗓️  Suche nach Episoden seit: ${latestDbDate || "Beginn"}`);

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Cookie-Banner akzeptieren falls vorhanden
  try {
    await page.waitForSelector('button:contains("Akzeptieren")', {
      timeout: 5000,
    });
    await page.click('button:contains("Akzeptieren")');
    console.log("Cookie-Banner akzeptiert");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
  }

  // Warte auf die Episode-Liste
  await page.waitForSelector('[itemprop="itemListElement"]', {
    timeout: 15000,
  });

  const newEpisodes: Array<{
    url: string;
    date: string;
    title: string;
    description: string;
  }> = [];

  let foundKnownEpisode = false;
  let pageNumber = 1;
  const maxPages = 20; // Sicherheitslimit

  while (!foundKnownEpisode && pageNumber <= maxPages) {
    console.log(`📄 Crawle Seite ${pageNumber} nach neuen Episoden...`);

    // Extrahiere Episode-Informationen von der aktuellen Seite
    const currentPageEpisodes = await page.evaluate(() => {
      const episodes: Array<{
        url: string;
        date: string;
        title: string;
        description: string;
      }> = [];

      // Finde alle Episode-Container
      const episodeElements = document.querySelectorAll(
        '[itemprop="itemListElement"]'
      );

      for (const episode of episodeElements) {
        // Suche nach Link
        const linkElement = episode.querySelector(
          'a[itemprop="url"]'
        ) as HTMLAnchorElement;
        if (!linkElement) continue;

        const url = linkElement.href;

        // Suche nach Datum (Format DD.MM.YYYY)
        const dateElement = episode.querySelector(".i1cdaksz");
        const dateText = dateElement?.textContent?.trim() || "";

        // Suche nach Titel
        const titleElement = episode.querySelector("h3");
        const title = titleElement?.textContent?.trim() || "";

        // Extrahiere Beschreibung
        const descriptionElement = episode.querySelector(
          "p.b1ja19fa.b11cvmny.bicmnlc._suw2zx"
        );
        const description = descriptionElement?.textContent?.trim() || "";

        if (url && dateText && title) {
          episodes.push({ url, date: dateText, title, description });
        }
      }

      return episodes;
    });

    console.log(
      `   📊 ${currentPageEpisodes.length} Episoden auf Seite ${pageNumber}`
    );

    // Prüfe jede Episode auf dieser Seite
    for (const ep of currentPageEpisodes) {
      const isoDate = parseISODateFromArdHtml(ep.date);
      if (!isoDate) continue;

      // Vergleiche mit letztem DB-Datum
      if (latestDbDate) {
        const latestDbDateFormatted = latestDbDate.includes(".")
          ? formatDateForDB(latestDbDate)
          : latestDbDate;

        if (isoDate <= latestDbDateFormatted) {
          console.log(`🛑 Erreicht bekannte Episode: ${ep.date} (${ep.title})`);
          foundKnownEpisode = true;
          break;
        }
      }

      // Episode ist neu - füge hinzu
      newEpisodes.push({
        url: ep.url,
        date: ep.date,
        title: ep.title,
        description: ep.description,
      });

      console.log(`   ✅ Neue Episode: ${ep.date} - ${ep.title}`);
    }

    // Wenn keine bekannte Episode gefunden und noch Seiten verfügbar
    if (!foundKnownEpisode && pageNumber < maxPages) {
      // Versuche zur nächsten Seite zu navigieren (scrollen für Infinite Scroll)
      const previousEpisodeCount = await page.evaluate(
        () => document.querySelectorAll('[itemprop="itemListElement"]').length
      );

      // Scrolle nach unten um mehr Episoden zu laden
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000)); // Warte auf Laden

      const newEpisodeCount = await page.evaluate(
        () => document.querySelectorAll('[itemprop="itemListElement"]').length
      );

      if (newEpisodeCount === previousEpisodeCount) {
        console.log(`📄 Keine weiteren Episoden verfügbar`);
        break;
      }

      pageNumber++;
    }
  }

  if (!latestDbDate) {
    console.log(
      `🆕 Keine DB-Episoden vorhanden - alle ${newEpisodes.length} Episoden sind neu`
    );
  } else if (foundKnownEpisode) {
    console.log(
      `✅ Crawling gestoppt bei bekannter Episode - ${newEpisodes.length} neue Episoden gefunden`
    );
  } else {
    console.log(
      `⚠️  Limit erreicht - ${newEpisodes.length} Episoden gecrawlt, aber keine bekannte Episode gefunden`
    );
  }

  // Verarbeite alle neuen Episoden und extrahiere Gäste mit AI
  const episodesWithGuests = [];
  for (let i = 0; i < newEpisodes.length; i++) {
    const ep = newEpisodes[i];

    console.log(`🧑‍💼 Verarbeite Gäste für Episode: ${ep.date} - ${ep.title}`);
    console.log("Description ist: ", ep.description);

    // Verwende AI-Extraktion
    const guests = await extractGuestsWithAI(ep.description);

    // Konvertiere zu GuestWithRole Format
    const guestsWithRole: GuestWithRole[] = guests.map((name) => ({ name }));

    // Konvertiere Datumsformat
    const isoDate = parseISODateFromArdHtml(ep.date);
    if (isoDate) {
      episodesWithGuests.push({
        url: ep.url,
        date: isoDate,
        title: ep.title,
        guests: guestsWithRole,
      });
    }
  }

  // Sortiere nach Datum (neueste zuerst)
  return episodesWithGuests.sort((a, b) => b.date.localeCompare(a.date));
}

// Extrahiere Datum aus ARD Audiothek HTML (DD.MM.YYYY Format)
function parseISODateFromArdHtml(dateText: string): string | null {
  // Format: "21.09.2025" -> "2025-09-21"
  const match = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Hilfsfunktion: Hole detaillierte Beschreibung von der Episodenseite
async function getEpisodeDetailedDescription(
  page: Page,
  episodeUrl: string
): Promise<string> {
  try {
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extrahiere die detaillierte Beschreibung
    const description = await page.evaluate(() => {
      // Suche nach der Episodenbeschreibung im spezifischen Container
      const descriptionElement = document.querySelector(
        "p.b1ja19fa.b11cvmny.b1np0qjg"
      );

      if (descriptionElement) {
        return descriptionElement.textContent?.trim() || "";
      }

      // Fallback: Suche nach anderen möglichen Beschreibungs-Containern
      const fallbackSelectors = [
        "section.b1ets0rx p.b1ja19fa.b11cvmny",
        ".episode-description",
        'p[class*="description"]',
        'div[class*="episode"] p',
      ];

      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (
          element &&
          element.textContent &&
          element.textContent.trim().length > 50
        ) {
          return element.textContent.trim();
        }
      }

      return "";
    });

    if (description && description.length > 20) {
      return description;
    } else {
      console.log(`   ⚠️ Keine aussagekräftige Beschreibung gefunden`);
      return "";
    }
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Miosga Episodenseite ${episodeUrl}:`,
      error
    );
    return "";
  }
}

export async function crawlIncrementalCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Caren Miosga Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Hole das letzte Datum aus der DB
  const latestDbDate = await getLatestEpisodeDate("Caren Miosga");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole nur neue Episode-Links (optimiert für inkrementelles Crawling)
    const newEpisodes = await getNewEpisodeLinks(page, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    console.log(`🆕 Verarbeite ${newEpisodes.length} neue Episoden:`);
    newEpisodes.forEach((ep) => console.log(`   📺 ${ep.date}: ${ep.title}`));

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Verarbeite jede neue Episode
    for (const episode of newEpisodes) {
      try {
        console.log(
          `\n🎬 Verarbeite Episode vom ${episode.date}: ${episode.title}`
        );
        console.log(
          `👥 Gefundene Gäste: ${
            episode.guests.map((g) => g.name).join(", ") || "Keine"
          }`
        );

        if (episode.guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Hole detaillierte Beschreibung von der Episodenseite
        const detailedDescription = await getEpisodeDetailedDescription(
          page,
          episode.url
        );

        // Analysiere politische Themen mit getPoliticalArea (nur wenn detaillierte Beschreibung vorhanden)
        const politicalAreaIds = await getPoliticalArea(detailedDescription);

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of episode.guests) {
          console.log(`   🔍 Prüfe: ${guest.name}`);

          const details = await checkPolitician(guest.name);

          if (
            details.isPolitician &&
            details.politicianId &&
            details.politicianName
          ) {
            console.log(
              `      ✅ Politiker: ${details.politicianName} (ID ${
                details.politicianId
              }), Partei: ${details.partyName || "unbekannt"}`
            );
            politicians.push({
              politicianId: details.politicianId,
              politicianName: details.politicianName,
              partyId: details.party,
              partyName: details.partyName,
            });
          } else {
            console.log(`      ❌ Kein Politiker`);
          }

          // Pause zwischen API-Calls
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Caren Miosga",
            formatDateForDB(episode.date),
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   �� ${inserted}/${politicians.length} Politiker gespeichert`
          );

          // Füge Episode-URL zur Liste hinzu (nur für Episoden mit Politikern)
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: formatDateForDB(episode.date),
          });
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Caren Miosga",
            episode.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        episodesProcessed++;
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
      }
    }

    // Speichere Episode-URLs am Ende
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Caren Miosga",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 Inkrementeller Caren Miosga Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}
