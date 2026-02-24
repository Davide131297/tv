import { Page } from "puppeteer";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "../lib/utils.js";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import { extractGuestsWithAI, getPoliticalArea } from "../lib/utils.js";

interface MaischbergerEpisode {
  url: string;
  date: string;
  title: string;
  teaserText: string;
  detailedDescription?: string;
}

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

const BASE_URL = "https://www.ardmediathek.de";
const LIST_URL =
  "https://www.ardmediathek.de/sendung/maischberger/Y3JpZDovL2Rhc2Vyc3RlLmRlL21lbnNjaGVuIGJlaSBtYWlzY2hiZXJnZXI";

// Hilfsfunktion: Hole Beschreibung von der Episodenseite für Gäste UND politische Themen
async function getEpisodeDetails(
  page: Page,
  episodeUrl: string,
): Promise<{ description: string; politicalAreas: number[] | [] | null }> {
  try {
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extrahiere die Beschreibung von der ARD Mediathek Episodenseite
    const description = await page.evaluate(() => {
      // Suche nach dem spezifischen Beschreibungs-Paragraph
      // <p class="b1ja19fa b11cvmny b4tg6yv i75j54i">
      const descriptionEl = document.querySelector("p.b1ja19fa.b11cvmny");

      if (descriptionEl?.textContent) {
        return descriptionEl.textContent.trim();
      }

      // Fallback: Suche nach anderen Paragraphen
      const paragraphs = document.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.textContent?.trim() || "";

        // Filtere relevante Beschreibungen (mit Gäste-Info)
        if (
          text &&
          text.length > 50 &&
          !text.includes("Gemeinschaftsproduktion") &&
          !text.includes("hergestellt vom") &&
          !text.includes("Vincent productions") &&
          !text.includes("Minuten verfügbar") &&
          !text.includes("©") &&
          !text.includes("Video verfügbar")
        ) {
          return text;
        }
      }

      return "";
    });

    if (!description || description.length < 20) {
      console.log(`⚠️  Keine Beschreibung gefunden für ${episodeUrl}`);
      return { description: "", politicalAreas: null };
    }

    console.log(`📄 Beschreibung gefunden (${description.length} Zeichen)`);

    // Extrahiere politische Themenbereiche
    const politicalAreas = await getPoliticalArea(description);

    return { description, politicalAreas };
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`,
      error,
    );
    return { description: "", politicalAreas: null };
  }
}

// Hauptfunktion: Crawle nur NEUE Maischberger Episoden (inkrementell) - ab 2025
export async function crawlNewMaischbergerEpisodes(): Promise<void> {
  const latestDbDate = await getLatestEpisodeDate("Maischberger");

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Crawle nur neue Episoden seit letztem DB-Eintrag
    const newEpisodes = await getNewMaischbergerEpisodes(page, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    // Filtere Episoden ab 2025
    const recentEpisodes = newEpisodes.filter((episode) => {
      const year = parseInt(episode.date.split("-")[0]);
      return year >= 2025;
    });

    if (recentEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden ab 2025 gefunden!");
      return;
    }

    console.log(
      `🆕 Gefunden: ${recentEpisodes.length} neue Episoden ab 2025 (von ${newEpisodes.length} gesamt)`,
    );
    if (recentEpisodes.length > 0) {
      console.log(
        `📅 Zeitraum: ${recentEpisodes[recentEpisodes.length - 1]?.date} bis ${
          recentEpisodes[0]?.date
        }`,
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs für Batch-Insert
    const episodeLinksToInsert = recentEpisodes.map((episode) => ({
      episodeUrl: episode.url,
      episodeDate: episode.date,
    }));

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert,
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`,
      );
    }

    // Verarbeite jede Episode (älteste zuerst für chronologische Reihenfolge)
    const sortedEpisodes = recentEpisodes.sort(
      (a: MaischbergerEpisode, b: MaischbergerEpisode) =>
        a.date.localeCompare(b.date),
    );

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        const { description, politicalAreas } = await getEpisodeDetails(
          page,
          episode.url,
        );

        if (!description || description.length < 20) continue;

        const guestNames = await extractGuestsWithAI(description);

        if (guestNames.length === 0) continue;

        const politicians = [];
        for (const guestName of guestNames) {
          const details = await checkPolitician(guestName);

          if (
            details.isPolitician &&
            details.politicianId &&
            details.politicianName
          ) {
            politicians.push({
              politicianId: details.politicianId,
              politicianName: details.politicianName,
              partyId: details.party,
              partyName: details.partyName,
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Log: Datum + Gäste + Politiker
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
            "Maischberger",
            episode.date,
            politicians,
          );

          totalPoliticiansInserted += inserted;
        }

        if (politicalAreas && politicalAreas.length > 0) {
          await insertEpisodePoliticalAreas(
            "Maischberger",
            episode.date,
            politicalAreas,
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

    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert,
      );
    }

    console.log(
      `\n🎉 Inkrementeller Maischberger Crawl (ab 2025) abgeschlossen!`,
    );
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`,
    );
    console.log(`👥 Politiker in DB gespeichert: ${totalPoliticiansInserted}`);
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

// Hauptfunktion: Crawle ALLE Maischberger Episoden ab 2025 und speichere in DB (Vollständiger Crawl)
export async function crawlMaischbergerFull(): Promise<void> {
  console.log("🚀 Starte VOLLSTÄNDIGEN Maischberger Crawler (ab 2025)...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);
  console.log(`🎯 Ziel: Alle Episoden ab 21.01.2025 bis heute`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Crawle ALLE verfügbaren Episoden bis 2025 erreicht ist
    const allRecentEpisodes = await getAllMaischbergerEpisodes(page);

    if (allRecentEpisodes.length === 0) {
      console.log("❌ Keine Episoden ab 2025 gefunden");
      return;
    }

    console.log(`📺 Gefunden: ${allRecentEpisodes.length} Episoden ab 2025`);
    if (allRecentEpisodes.length > 0) {
      console.log(
        `📅 Zeitraum: ${
          allRecentEpisodes[allRecentEpisodes.length - 1]?.date
        } bis ${allRecentEpisodes[0]?.date}`,
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Verarbeite jede Episode (älteste zuerst für chronologische Reihenfolge)
    const sortedEpisodes = allRecentEpisodes.sort(
      (a: MaischbergerEpisode, b: MaischbergerEpisode) =>
        a.date.localeCompare(b.date),
    );

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        if (!episode.teaserText || episode.teaserText.length < 10) continue;

        const { description: detailedDescription, politicalAreas } =
          await getEpisodeDetails(page, episode.url);

        const guestNames = await extractGuestsWithAI(detailedDescription);

        if (guestNames.length === 0) continue;

        const politicians = [];
        for (const guestName of guestNames) {
          const details = await checkPolitician(guestName);

          if (
            details.isPolitician &&
            details.politicianId &&
            details.politicianName
          ) {
            politicians.push({
              politicianId: details.politicianId,
              politicianName: details.politicianName,
              partyId: details.party,
              partyName: details.partyName,
            });
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Log: Datum + Gäste + Politiker
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
            "Maischberger",
            episode.date,
            politicians,
          );

          totalPoliticiansInserted += inserted;

          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episode.date,
          });
        }

        if (politicalAreas && politicalAreas.length > 0) {
          await insertEpisodePoliticalAreas(
            "Maischberger",
            episode.date,
            politicalAreas,
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

    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert,
      );
    }

    console.log(
      `\n🎉 VOLLSTÄNDIGER Maischberger Crawl (ab 2025) abgeschlossen!`,
    );
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`,
    );
    console.log(`👥 Politiker in DB gespeichert: ${totalPoliticiansInserted}`);
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

// Extrahiere ALLE Maischberger Episoden ab 2025 (ab 21.01.2025)
async function getAllMaischbergerEpisodes(
  page: Page,
): Promise<MaischbergerEpisode[]> {
  console.log("🔍 Lade ALLE Maischberger Episoden ab 2025...");

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Warte auf die Episode-Liste
  await page.waitForSelector('[data-testid="virtuoso-item-list"]', {
    timeout: 15000,
  });

  console.log("📜 Scrolle durch die Liste, um alle Episoden zu laden...");

  // Scrolle mehrmals nach unten, um die virtualisierte Liste zu laden
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxScrolls = 100; // Maximale Anzahl an Scroll-Versuchen

  while (scrollAttempts < maxScrolls) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // Prüfe ob wir 2024 Episoden erreicht haben
    const reachedPre2025 = await page.evaluate(() => {
      const dates = Array.from(
        document.querySelectorAll('[itemprop="dateCreated"]'),
      ).map((el) => el.getAttribute("content") || "");

      const hasPre2025 = dates.some((date) => {
        if (!date) return false;
        const year = parseInt(date.split("-")[0]);
        return year < 2025;
      });

      return hasPre2025;
    });

    if (reachedPre2025) {
      console.log("🛑 Erreicht Episoden vor 2025 - Stoppe Scrolling");
      break;
    }

    if (currentHeight === previousHeight) {
      console.log("📄 Keine weiteren Episoden gefunden");
      break;
    }

    previousHeight = currentHeight;
    scrollAttempts++;

    if (scrollAttempts % 5 === 0) {
      console.log(`   📜 Scroll-Versuch ${scrollAttempts}/${maxScrolls}...`);
    }
  }

  console.log("🔍 Extrahiere Episode-Daten...");

  const episodes = await page.evaluate(() => {
    const episodes: Array<{
      url: string;
      date: string;
      title: string;
      teaserText: string;
      duration: number; // Dauer in Minuten
    }> = [];

    // Finde alle Episode-Items in der virtualisierten Liste
    const items = document.querySelectorAll('[itemprop="itemListElement"]');

    console.log(`Gefunden: ${items.length} Episode-Items`);

    for (const item of items) {
      try {
        // Extrahiere Datum aus dem meta-Tag
        const dateEl = item.querySelector('[itemprop="dateCreated"]');
        const dateStr = dateEl?.getAttribute("content") || "";

        if (!dateStr) continue;

        // Konvertiere ISO-Datum zu YYYY-MM-DD
        const date = dateStr.split("T")[0];

        // Extrahiere URL
        const linkEl = item.querySelector('a[itemprop="url"]');
        const href = linkEl?.getAttribute("href") || "";

        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.ardmediathek.de${href}`;

        // Extrahiere Titel
        const titleEl = item.querySelector('h3[itemprop="name"]');
        const title = titleEl?.textContent?.trim() || "";

        if (!title) continue;

        // Extrahiere Dauer (z.B. "75 Min.")
        const durationEl = item.querySelector(".b1ja19fa.ip1vmgq");
        const durationText = durationEl?.textContent?.trim() || "";
        const durationMatch = durationText.match(/(\d+)\s*Min/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

        // Verwende Titel als teaserText
        const teaserText = title;

        episodes.push({
          url,
          date,
          title,
          teaserText,
          duration,
        });
      } catch (error) {
        console.error("Fehler beim Verarbeiten einer Episode:", error);
      }
    }

    return episodes;
  });

  console.log(`📺 Gesamt gefunden: ${episodes.length} Episoden`);

  // Filtere Episoden ab 2025 (ab 21.01.2025)
  const recentEpisodes = episodes.filter((ep) => {
    const episodeYear = parseInt(ep.date.split("-")[0]);
    if (episodeYear > 2025) return true; // Zukünftige Jahre
    if (episodeYear < 2025) return false; // Vor 2025
    // 2025: Prüfe ob nach 21.01.2025
    return ep.date >= "2025-01-21";
  });

  console.log(`📅 Episoden ab 2025 (ab 21.01.): ${recentEpisodes.length}`);

  // Filtere Episoden mit "(mit Gebärdensprache)" aus dem Titel
  const withoutSignLanguage = recentEpisodes.filter((ep) => {
    if (ep.title.toLowerCase().includes("gebärdensprache")) {
      console.log(
        `Episode übersprungen (Gebärdensprache-Version): ${ep.date} - ${ep.title}`,
      );
      return false;
    }
    return true;
  });

  console.log(`📋 Ohne Gebärdensprache: ${withoutSignLanguage.length}`);

  // Gruppiere nach Datum und wähle nur die längste Episode pro Tag (Hauptsendung)
  const episodesByDate = new Map<string, (typeof recentEpisodes)[0]>();

  for (const ep of withoutSignLanguage) {
    const existing = episodesByDate.get(ep.date);

    if (!existing || ep.duration > existing.duration) {
      // Wenn keine Episode für dieses Datum existiert ODER diese länger ist
      episodesByDate.set(ep.date, ep);

      if (existing) {
        console.log(
          `📺 ${ep.date}: Wähle längere Episode (${ep.duration} Min statt ${existing.duration} Min)`,
        );
      }
    } else {
      console.log(
        `⏭️  ${ep.date}: Überspringe kürzeren Ausschnitt (${
          ep.duration
        } Min) - ${ep.title.substring(0, 50)}...`,
      );
    }
  }

  const mainEpisodes = Array.from(episodesByDate.values());

  console.log(`📋 Hauptsendungen (längste pro Tag): ${mainEpisodes.length}`);

  return mainEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Extrahiere nur NEUE Maischberger Episoden (seit letztem DB-Eintrag)
async function getNewMaischbergerEpisodes(
  page: Page,
  latestDbDate: string | null,
): Promise<MaischbergerEpisode[]> {
  console.log("🔍 Lade neue Maischberger Episoden...");
  console.log(`📅 Suche nach Episoden seit: ${latestDbDate || "Beginn"}`);

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Warte auf die Episode-Liste
  await page.waitForSelector('[data-testid="virtuoso-item-list"]', {
    timeout: 15000,
  });

  console.log("📜 Scrolle durch die Liste, um neue Episoden zu finden...");

  // Scrolle mehrmals nach unten, um die virtualisierte Liste zu laden
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxScrolls = 30; // Weniger Scrolls für inkrementellen Crawler

  while (scrollAttempts < maxScrolls) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    // Prüfe ob wir das letzte DB-Datum erreicht haben
    const reachedDbDate = await page.evaluate((dbDate) => {
      if (!dbDate) return false;

      const dates = Array.from(
        document.querySelectorAll('[itemprop="dateCreated"]'),
      ).map((el) => el.getAttribute("content") || "");

      const hasOlderDate = dates.some((date) => {
        if (!date) return false;
        const episodeDate = date.split("T")[0];
        return episodeDate <= dbDate;
      });

      return hasOlderDate;
    }, latestDbDate);

    if (reachedDbDate) {
      console.log(
        `🛑 Erreicht bekanntes Datum ${latestDbDate} - Stoppe Scrolling`,
      );
      break;
    }

    if (currentHeight === previousHeight) {
      console.log("📄 Keine weiteren Episoden gefunden");
      break;
    }

    previousHeight = currentHeight;
    scrollAttempts++;

    if (scrollAttempts % 5 === 0) {
      console.log(`   📜 Scroll-Versuch ${scrollAttempts}/${maxScrolls}...`);
    }
  }

  console.log("🔍 Extrahiere neue Episode-Daten...");

  const episodes = await page.evaluate(() => {
    const episodes: Array<{
      url: string;
      date: string;
      title: string;
      teaserText: string;
      duration: number; // Dauer in Minuten
    }> = [];

    // Finde alle Episode-Items in der virtualisierten Liste
    const items = document.querySelectorAll('[itemprop="itemListElement"]');

    console.log(`Gefunden: ${items.length} Episode-Items`);

    for (const item of items) {
      try {
        // Extrahiere Datum aus dem meta-Tag
        const dateEl = item.querySelector('[itemprop="dateCreated"]');
        const dateStr = dateEl?.getAttribute("content") || "";

        if (!dateStr) continue;

        // Konvertiere ISO-Datum zu YYYY-MM-DD
        const date = dateStr.split("T")[0];

        // Extrahiere URL
        const linkEl = item.querySelector('a[itemprop="url"]');
        const href = linkEl?.getAttribute("href") || "";

        if (!href) continue;

        const url = href.startsWith("http")
          ? href
          : `https://www.ardmediathek.de${href}`;

        // Extrahiere Titel
        const titleEl = item.querySelector('h3[itemprop="name"]');
        const title = titleEl?.textContent?.trim() || "";

        if (!title) continue;

        // Extrahiere Dauer (z.B. "75 Min.")
        const durationEl = item.querySelector(".b1ja19fa.ip1vmgq");
        const durationText = durationEl?.textContent?.trim() || "";
        const durationMatch = durationText.match(/(\d+)\s*Min/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

        // Verwende Titel als teaserText
        const teaserText = title;

        episodes.push({
          url,
          date,
          title,
          teaserText,
          duration,
        });
      } catch (error) {
        console.error("Fehler beim Verarbeiten einer Episode:", error);
      }
    }

    return episodes;
  });

  console.log(`📺 Gesamt gefunden: ${episodes.length} Episoden`);

  // Filtere neue Episoden basierend auf dem letzten DB-Datum
  const newEpisodes = episodes.filter((ep) => {
    // Falls kein DB-Datum vorhanden, sind alle Episoden neu
    if (!latestDbDate) return true;

    // Prüfe ob Episode nach dem letzten DB-Datum liegt
    return ep.date > latestDbDate;
  });

  console.log(`🆕 Neue Episoden seit ${latestDbDate}: ${newEpisodes.length}`);

  // Filtere Episoden mit "(mit Gebärdensprache)" aus dem Titel
  const withoutSignLanguage = newEpisodes.filter((ep) => {
    if (ep.title.toLowerCase().includes("gebärdensprache")) {
      console.log(
        `Episode übersprungen (Gebärdensprache-Version): ${ep.date} - ${ep.title}`,
      );
      return false;
    }
    return true;
  });

  console.log(`📋 Ohne Gebärdensprache: ${withoutSignLanguage.length}`);

  // Gruppiere nach Datum und wähle nur die längste Episode pro Tag (Hauptsendung)
  const episodesByDate = new Map<string, (typeof newEpisodes)[0]>();

  for (const ep of withoutSignLanguage) {
    const existing = episodesByDate.get(ep.date);

    if (!existing || ep.duration > existing.duration) {
      // Wenn keine Episode für dieses Datum existiert ODER diese länger ist
      episodesByDate.set(ep.date, ep);

      if (existing) {
        console.log(
          `📺 ${ep.date}: Wähle längere Episode (${ep.duration} Min statt ${existing.duration} Min)`,
        );
      }
    } else {
      console.log(
        `⏭️  ${ep.date}: Überspringe kürzeren Ausschnitt (${
          ep.duration
        } Min) - ${ep.title.substring(0, 50)}...`,
      );
    }
  }

  const mainEpisodes = Array.from(episodesByDate.values());

  console.log(
    `🆕 Neue Hauptsendungen (längste pro Tag): ${mainEpisodes.length}`,
  );

  return mainEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Funktion zum Löschen aller Maischberger-Daten aus der Tabelle
export async function clearMaischbergerData(): Promise<number> {
  console.log("🗑️  Lösche alle Maischberger-Daten aus tv_show_politicians...");

  const { supabase } = await import("../supabase.js");

  const { error, count } = await supabase
    .from("tv_show_politicians")
    .delete({ count: "exact" })
    .eq("show_name", "Maischberger");

  if (error) {
    console.error("❌ Fehler beim Löschen:", error);
    throw error;
  }

  const deletedCount = count || 0;
  console.log(`✅ ${deletedCount} Maischberger-Einträge gelöscht`);

  return deletedCount;
}
