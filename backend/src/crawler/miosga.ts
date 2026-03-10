import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import type { GuestWithRole } from "../lib/crawler-utils.js";
import {
  insertMultipleTvShowPoliticians,
  getExistingEpisodeDates,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "../lib/utils.js";
import { Page } from "puppeteer";
import {
  extractGuestsWithAI,
  getPoliticalArea,
} from "../lib/utils.js";

const LIST_URL =
  "https://www.ardaudiothek.de/sendung/caren-miosga/urn:ard:show:d6e5ba24e1508004/";

// Rate-Limiting und Retry-Logik für AI-Requests
let aiRequestCount = 0;
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 4000; // 4 Sekunden zwischen Requests
const MAX_RETRIES = 3;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  aiRequestCount++;
}

function extractGuestsFallback(teaserText: string): string[] {
  // Entferne "Caren Miosga mit" und ähnliche Prefixe
  let cleanText = teaserText
    .replace(
      /^.*?Caren Miosga (?:mit|spricht mit|diskutiert mit|im Gespräch mit)\s*/i,
      "",
    )
    .replace(/\s*\|\s*mehr\s*$/i, "");

  // Erweiterte Berufsbezeichnungen, die entfernt werden sollen
  const jobTitles = [
    "Bundesaußenminister(?:in)?",
    "Bundesinnenminister(?:in)?",
    "Bundesfinanzminister(?:in)?",
    "Bundesverteidigungsminister(?:in)?",
    "Bundeswirtschaftsminister(?:in)?",
    "Bundesgesundheitsminister(?:in)?",
    "Außenminister(?:in)?",
    "Ministerpräsident(?:in)?",
    "Bundeskanzler(?:in)?",
    "Politikwissenschaftler(?:in)?",
    "Journalist(?:in)?",
    "Journalisten?",
    "Korrespondent(?:in)?",
    "Moderator(?:in)?",
    "Experte(?:in)?",
    "Expertin",
    "Ökonom(?:in)?",
    "Botschafter(?:in)?",
    "Parlamentarische(?:r)? Geschäftsführer(?:in)?",
    "Vorsitzende(?:r)?",
    "Chef(?:in)?",
    "Redakteur(?:in)?",
    "Chefredakteur(?:in)?",
    "Stellvertretende(?:r)? Chefredakteur(?:in)?",
    "Leitende(?:r)? Redakteur(?:in)?",
    "Soziologe(?:in)?",
    "Militärexperte(?:in)?",
    "Militäranalyst(?:in)?",
    "Sicherheitsexperte(?:in)?",
    "Nahost-Experte(?:in)?",
    "Osteuropa-Experte(?:in)?",
    "Strategieberater(?:in)?",
    "Wahlkampfberater(?:in)?",
    "Politikberater(?:in)?",
    "Publizist(?:in)?",
    "Präsident(?:in)?",
    "Bundestagsabgeordnete(?:r)?",
    "Abgeordnete(?:r)?",
    "ehemalige(?:r)?",
    "designierte(?:r)?",
    "Erste(?:r)?",
    "CNN-",
    "ARD-",
    "ZDF-",
    "ZEIT-",
    "WELT-",
    "SPIEGEL-",
  ];

  const jobTitlePattern = new RegExp(`\\b(?:${jobTitles.join("|")})\\s+`, "gi");

  // Entferne Berufsbezeichnungen
  cleanText = cleanText.replace(jobTitlePattern, "");

  // Entferne Artikel
  cleanText = cleanText.replace(
    /\b(?:der|die|das|dem|den|eines?|einer)\s+/gi,
    "",
  );

  // Entferne Parteiangaben in Klammern
  cleanText = cleanText.replace(/\s*\([^)]*\)/g, "");

  // Entferne "von der/vom" Konstruktionen (SPD, CDU etc.)
  cleanText = cleanText.replace(/\s+von\s+der\s+\w+/gi, "");
  cleanText = cleanText.replace(/\s+vom\s+\w+/gi, "");

  // Splitze bei Kommata und "und" aber berücksichtige "a. D." (außer Dienst)
  const parts = cleanText
    .replace(/\s+a\.\s*D\./gi, " a.D.") // Normalisiere "a. D."
    .split(/,|\s+und\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const guests: string[] = [];

  for (const part of parts) {
    let cleanPart = part;

    // Weitere Bereinigung
    cleanPart = cleanPart
      .replace(/^(?:mit\s+)?/i, "") // Entferne führendes "mit"
      .replace(/\s+a\.D\./gi, "") // Entferne "a.D."
      .trim();

    // Versuche Namen zu extrahieren - erweiterte Regex für komplexere Namen
    const namePatterns = [
      // Standardfall: Vorname Nachname (optional mit Mittelnamen/von/de etc.)
      /\b([A-ZÄÖÜ][a-zäöü\-]+(?:\s+[a-z]+\s+)?(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)\b/,
      // Namen mit Titeln am Ende
      /\b([A-ZÄÖÜ][a-zäöü\-]+\s+[A-ZÄÖÜ][a-zäöü\-]+)\s*(?:a\.D\.|Jr\.|Sr\.)?/,
      // Einfachere Fälle
      /^([A-ZÄÖÜ][a-zäöü\-]+\s+[A-ZÄÖÜ][a-zäöü\-]+)/,
    ];

    let foundName = null;
    for (const pattern of namePatterns) {
      const match = cleanPart.match(pattern);
      if (match) {
        foundName = match[1].trim();
        break;
      }
    }

    if (foundName) {
      // Filter: Nur Namen die plausibel sind
      if (
        foundName.length > 3 &&
        foundName.includes(" ") &&
        !foundName.toLowerCase().includes("caren") &&
        !foundName.toLowerCase().includes("miosga") &&
        !foundName.toLowerCase().includes("sendung") &&
        !foundName.toLowerCase().includes("folge") &&
        !/\d/.test(foundName) // Keine Zahlen im Namen
      ) {
        guests.push(foundName);
      }
    }
  }

  // Deduplizierung
  const uniqueGuests = [...new Set(guests)];

  return uniqueGuests;
}

// Hilfsfunktion: Hole detaillierte Beschreibung von der Episodenseite
async function getEpisodeDetailedDescription(
  page: Page,
  episodeUrl: string,
): Promise<string> {
  try {
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extrahiere die detaillierte Beschreibung
    const description = await page.evaluate(() => {
      // Suche nach der Episodenbeschreibung im spezifischen Container
      const descriptionElement = document.querySelector(
        "p.b1ja19fa.b11cvmny.b1np0qjg",
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
      return "";
    }
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Miosga Episodenseite ${episodeUrl}:`,
      error,
    );
    return "";
  }
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

// Extrahiere nur NEUE Episode-Links (crawlt nur bis zum letzten bekannten Datum)
async function getNewEpisodeLinks(
  page: Page,
  latestDbDate: string | null,
): Promise<
  Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }>
> {
  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Cookie-Banner akzeptieren falls vorhanden
  try {
    await page.waitForSelector('button:contains("Akzeptieren")', {
      timeout: 5000,
    });
    await page.click('button:contains("Akzeptieren")');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {}

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
        '[itemprop="itemListElement"]',
      );

      for (const episode of episodeElements) {
        // Suche nach Link
        const linkElement = episode.querySelector(
          'a[itemprop="url"]',
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
          "p.b1ja19fa.b11cvmny.bicmnlc._suw2zx",
        );
        const description = descriptionElement?.textContent?.trim() || "";

        if (url && dateText && title) {
          episodes.push({ url, date: dateText, title, description });
        }
      }

      return episodes;
    });

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
    }

    // Wenn keine bekannte Episode gefunden und noch Seiten verfügbar
    if (!foundKnownEpisode && pageNumber < maxPages) {
      const previousEpisodeCount = await page.evaluate(
        () => document.querySelectorAll('[itemprop="itemListElement"]').length,
      );

      // Scrolle nach unten um mehr Episoden zu laden
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000)); // Warte auf Laden

      const newEpisodeCount = await page.evaluate(
        () => document.querySelectorAll('[itemprop="itemListElement"]').length,
      );

      if (newEpisodeCount === previousEpisodeCount) {
      }

      pageNumber++;
    }
  }

  // Verarbeite alle neuen Episoden und extrahiere Gäste mit AI
  const episodesWithGuests = [];
  for (let i = 0; i < newEpisodes.length; i++) {
    const ep = newEpisodes[i];

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

// Hilfsfunktion: Politiker für eine Episode prüfen
async function processPoliticians(
  episode: { guests: Array<{ name: string }> },
) {
  const politicians = [];

  for (const guest of episode.guests) {
    const details = await checkPolitician(guest.name);

    if (details.isPolitician && details.politicianId && details.politicianName) {
      politicians.push({
        politicianId: details.politicianId,
        politicianName: details.politicianName,
        partyId: details.party,
        partyName: details.partyName,
      });
    }

    // Pause zwischen API-Calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return politicians;
}

// ─────────────────────────────────────────────
// INKREMENTELLER Crawl (Standard-Modus)
// ─────────────────────────────────────────────
export async function crawlIncrementalCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Caren Miosga Crawl...");

  const existingDates = await getExistingEpisodeDates("Caren Miosga");
  console.log(`📅 Bereits ${existingDates.size} Episoden in DB vorhanden`);

  // Hole neue Episoden via Browser
  const browser = await createBrowser();
  let newEpisodes: Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }> = [];

  try {
    const page = await setupSimplePage(browser);
    const latestDbDate = existingDates.size > 0
      ? [...existingDates].sort().reverse()[0]
      : null;
    newEpisodes = await getNewEpisodeLinks(page, latestDbDate);
  } finally {
    await browser.close().catch(() => {});
  }

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden – alles aktuell!");
    return;
  }

  console.log(`${newEpisodes.length} neue Episoden zu verarbeiten`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] = [];

  // Verarbeite jede neue Episode
  for (const episode of newEpisodes) {
    try {
      if (episode.guests.length === 0) continue;

      const politicalAreaIds = await getPoliticalArea(episode.title);
      const politicians = await processPoliticians(episode);

      // Log: Datum + Gäste + Politiker
      const guestNames = episode.guests.map((g) => g.name);
      console.log(
        `📅 ${episode.date} | 👥 ${guestNames.join(", ")}${
          politicians.length > 0
            ? ` | ✅ Politiker: ${politicians
                .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                .join(", ")}`
            : ""
        }`,
      );

      // Politiker in DB speichern
      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Caren Miosga",
          episode.date,
          politicians,
        );
        totalPoliticiansInserted += inserted;
      }

      episodeLinksToInsert.push({
        episodeUrl: episode.url,
        episodeDate: episode.date,
      });

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Caren Miosga",
          episode.date,
          politicalAreaIds,
        );
      }

      episodesProcessed++;
    } catch (error) {
      console.error(
        `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
        error,
      );
    }
  }

  // Episode-URLs batch-speichern
  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Caren Miosga",
      episodeLinksToInsert,
    );
  }

  console.log(`\n=== Caren Miosga Zusammenfassung ===`);
  console.log(`Episoden verarbeitet: ${episodesProcessed}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}

// ─────────────────────────────────────────────
// VOLLSTÄNDIGER historischer Crawl (alle Seiten)
// ─────────────────────────────────────────────
export async function crawlAllCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte vollständigen Caren Miosga Crawl...");

  // Leeres Set = kein Filter → alle Episoden holen
  const browser = await createBrowser();
  let allEpisodes: Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }> = [];

  try {
    const page = await setupSimplePage(browser);
    allEpisodes = await getNewEpisodeLinks(page, null);
  } finally {
    await browser.close().catch(() => {});
  }

  if (allEpisodes.length === 0) {
    console.log("Keine Episoden gefunden.");
    return;
  }

  // Älteste zuerst für historischen Crawl
  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  console.log(`\n🔄 ${sortedEpisodes.length} Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  let episodesWithErrors = 0;

  // Episode-URLs batch speichern
  const episodeLinksToInsert = sortedEpisodes.map((ep) => ({
    episodeUrl: ep.url,
    episodeDate: ep.date,
  }));

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Caren Miosga",
      episodeLinksToInsert,
    );
  }

  for (const episode of sortedEpisodes) {
    try {
      if (episode.guests.length === 0) continue;

      const politicalAreaIds = await getPoliticalArea(episode.title);
      const politicians = await processPoliticians(episode);

      const guestNames = episode.guests.map((g) => g.name);
      console.log(
        `📅 ${episode.date} | 👥 ${guestNames.join(", ")}${
          politicians.length > 0
            ? ` | ✅ Politiker: ${politicians
                .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                .join(", ")}`
            : ""
        }`,
      );

      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Caren Miosga",
          episode.date,
          politicians,
        );
        totalPoliticiansInserted += inserted;
      }

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Caren Miosga",
          episode.date,
          politicalAreaIds,
        );
      }

      episodesProcessed++;
    } catch (error) {
      console.error(
        `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
        error,
      );
      episodesWithErrors++;
    }
  }

  console.log(`\n=== Caren Miosga FULL Zusammenfassung ===`);
  console.log(`Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`);
  console.log(`Fehler: ${episodesWithErrors}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}
