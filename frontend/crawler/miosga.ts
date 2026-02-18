import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import type { GuestWithRole } from "@/types";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "@/lib/supabase-server-utils";
import { Page } from "puppeteer";
import {
  getBatchPoliticalAreas,
  extractBatchGuestsWithAI,
  type BatchEpisodeInput,
} from "@/lib/ai-utils";

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
    console.log(`   ⏱️ Warte ${waitTime}ms wegen Rate Limit...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  aiRequestCount++;
}

function extractGuestsFallback(teaserText: string): string[] {
  console.log("🔄 Verwende Fallback-Gästeextraktion...");

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

  console.log(
    `   ✅ Fallback extrahierte ${uniqueGuests.length} Gäste:`,
    uniqueGuests,
  );
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
      console.log(`   ⚠️ Keine aussagekräftige Beschreibung gefunden`);
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

    console.log(
      `   📊 ${currentPageEpisodes.length} Episoden auf Seite ${pageNumber}`,
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
        console.log(`📄 Keine weiteren Episoden verfügbar`);
        break;
      }

      pageNumber++;
    }
  }

  if (!latestDbDate) {
    console.log(
      `🆕 Keine DB-Episoden vorhanden - alle ${newEpisodes.length} Episoden sind neu`,
    );
  } else if (foundKnownEpisode) {
    console.log(
      `✅ Crawling gestoppt bei bekannter Episode - ${newEpisodes.length} neue Episoden gefunden`,
    );
  } else {
    console.log(
      `⚠️  Limit erreicht - ${newEpisodes.length} Episoden gecrawlt, aber keine bekannte Episode gefunden`,
    );
  }

  // Batch AI-Extraktion der Gäste
  const guestBatchInputs: BatchEpisodeInput[] = newEpisodes.map((ep, i) => ({
    index: i,
    description: ep.description,
  }));

  const batchGuestResults = await extractBatchGuestsWithAI(guestBatchInputs);

  const episodesWithGuests = [];
  for (let i = 0; i < newEpisodes.length; i++) {
    const ep = newEpisodes[i];
    const guests = batchGuestResults.get(i) ?? [];

    console.log(
      `🧑‍💼 Episode: ${ep.date} - ${ep.title} → ${guests.length} Gäste`,
    );

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
        description: ep.description,
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

// Hauptfunktion: Crawle nur neue Episoden
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

    // Phase 1: Sammle Beschreibungen für Batch-AI
    const descriptionInputs: BatchEpisodeInput[] = [];
    const episodeIndices: number[] = []; // Mapping: batchIndex → newEpisodes index

    for (let i = 0; i < newEpisodes.length; i++) {
      const episode = newEpisodes[i];
      if (episode.guests.length === 0) continue;

      // Hole detaillierte Beschreibung von der Episodenseite
      const detailedDescription = await getEpisodeDetailedDescription(
        page,
        episode.url,
      );

      if (detailedDescription && detailedDescription.length >= 20) {
        descriptionInputs.push({
          index: descriptionInputs.length,
          description: detailedDescription,
        });
        episodeIndices.push(i);
      }
    }

    // Phase 2: Batch AI-Call für politische Themenbereiche
    const batchAreas = await getBatchPoliticalAreas(descriptionInputs);

    // Phase 3: Verarbeite jede neue Episode
    for (let batchIdx = 0; batchIdx < episodeIndices.length; batchIdx++) {
      const i = episodeIndices[batchIdx];
      const episode = newEpisodes[i];
      const politicalAreaIds = batchAreas.get(batchIdx) ?? [];

      try {
        console.log(
          `\n🎬 Verarbeite Episode vom ${episode.date}: ${episode.title}`,
        );
        console.log(
          `👥 Gefundene Gäste: ${
            episode.guests.map((g) => g.name).join(", ") || "Keine"
          }`,
        );

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
              }), Partei: ${details.partyName || "unbekannt"}`,
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
            "ZDF",
            "Caren Miosga",
            formatDateForDB(episode.date),
            politicians,
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`,
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
        if (politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Caren Miosga",
            episode.date,
            politicalAreaIds,
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`,
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

    // Speichere Episode-URLs am Ende
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Caren Miosga",
        episodeLinksToInsert,
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`,
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

// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl NUR 2025 Episoden
export async function crawlAllCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte VOLLSTÄNDIGEN Caren Miosga Crawler (nur 2025)...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole ALLE verfügbaren Episode-Links
    const allEpisodes = await getNewEpisodeLinks(page, null);

    if (allEpisodes.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Filtere nur Episoden aus 2025
    const episodes2025 = allEpisodes.filter((episode) =>
      episode.date.startsWith("2025-"),
    );

    console.log(`📺 Alle Episoden gefunden: ${allEpisodes.length}`);
    console.log(`📅 Episoden aus 2025: ${episodes2025.length}`);

    if (episodes2025.length === 0) {
      console.log("❌ Keine Episoden aus 2025 gefunden");
      return;
    }

    // Sortiere für historischen Crawl (älteste zuerst)
    const sortedEpisodes = episodes2025.sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    console.log(`📺 Crawle ${sortedEpisodes.length} Episoden aus 2025`);
    if (sortedEpisodes.length > 0) {
      console.log(
        `📅 Zeitraum 2025: ${sortedEpisodes[0]?.date} bis ${
          sortedEpisodes[sortedEpisodes.length - 1]?.date
        }`,
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs für Batch-Insert
    const episodeLinksToInsert = sortedEpisodes.map((episode) => ({
      episodeUrl: episode.url,
      episodeDate: episode.date,
    }));

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Caren Miosga",
        episodeLinksToInsert,
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`,
      );
    }

    // Phase 1: Sammle Beschreibungen für Batch-AI
    const fullDescInputs: BatchEpisodeInput[] = [];
    const fullEpIndices: number[] = [];

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];
      if (episode.guests.length === 0) continue;

      const detailedDescription = await getEpisodeDetailedDescription(
        page,
        episode.url,
      );

      if (detailedDescription && detailedDescription.length >= 20) {
        fullDescInputs.push({
          index: fullDescInputs.length,
          description: detailedDescription,
        });
        fullEpIndices.push(i);
      }
    }

    // Phase 2: Batch AI-Call für politische Themenbereiche
    const fullBatchAreas = await getBatchPoliticalAreas(fullDescInputs);

    // Phase 3: Verarbeite Ergebnisse
    for (let batchIdx = 0; batchIdx < fullEpIndices.length; batchIdx++) {
      const i = fullEpIndices[batchIdx];
      const episode = sortedEpisodes[i];
      const politicalAreaIds = fullBatchAreas.get(batchIdx) ?? [];

      console.log(
        `\n🎬 [${batchIdx + 1}/${fullEpIndices.length}] Verarbeite Episode vom ${
          episode.date
        }: ${episode.title}`,
      );

      try {
        console.log(
          `👥 Gefundene Gäste: ${
            episode.guests.map((g) => g.name).join(", ") || "Keine"
          }`,
        );

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
              }), Partei: ${details.partyName || "unbekannt"}`,
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
            "ZDF",
            "Caren Miosga",
            formatDateForDB(episode.date),
            politicians,
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`,
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
        if (politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Caren Miosga",
            episode.date,
            politicalAreaIds,
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`,
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

    console.log(
      `\n🎉 VOLLSTÄNDIGER Caren Miosga Crawl (nur 2025) abgeschlossen!`,
    );
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length} (nur 2025)`,
    );
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
    console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);

    if (episodesWithErrors > 0) {
      console.log(
        `⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`,
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
