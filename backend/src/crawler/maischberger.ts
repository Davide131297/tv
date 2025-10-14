import { createBrowser, setupSimplePage } from "../lib/browser-configs";
import {
  getLatestEpisodeDate,
  getPoliticalArea,
  insertMultipleShowLinks,
  extractGuestsWithAI,
  checkPolitician,
  insertEpisodePoliticalAreas,
  insertMultipleTvShowPoliticians,
} from "../lib/utils";
import { Page } from "puppeteer";

interface MaischbergerEpisode {
  url: string;
  date: string;
  title: string;
  teaserText: string;
  detailedDescription?: string;
}

const LIST_URL =
  "https://www.daserste.de/information/talk/maischberger/sendung/index.html";
const BASE_URL = "https://www.daserste.de";

// Extrahiere nur NEUE Maischberger Episoden (seit letztem DB-Eintrag)
async function getNewMaischbergerEpisodes(
  page: Page,
  latestDbDate: string | null
): Promise<MaischbergerEpisode[]> {
  console.log("🔍 Lade neue Maischberger Episoden...");
  console.log(`📅 Suche nach Episoden seit: ${latestDbDate || "Beginn"}`);

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
    console.log("Kein Cookie-Banner gefunden");
  }

  // Warte auf Content
  await page.waitForSelector(".boxCon", { timeout: 15000 });

  const allEpisodes: MaischbergerEpisode[] = [];
  const newEpisodes: MaischbergerEpisode[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  let reachedLatestDbDate = false; // Flag um zu stoppen wenn wir das letzte DB-Datum erreicht haben

  while (hasMorePages && currentPage <= 20 && !reachedLatestDbDate) {
    // Max 20 Seiten
    console.log(`📄 Crawle Seite ${currentPage}...`);

    const episodes = await page.evaluate((baseUrl) => {
      const episodes: MaischbergerEpisode[] = [];

      // Finde alle Episode-Boxen
      const boxes = document.querySelectorAll(".box.viewA");
      console.log(`Gefunden: ${boxes.length} Episoden-Boxen auf Seite`);

      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];

        // Datum extrahieren
        const dateElement = box.querySelector("h3.ressort");
        const dateText = dateElement?.textContent || "";
        const dateMatch = dateText.match(
          /Sendung vom (\d{2})\.(\d{2})\.(\d{4})/
        );

        if (!dateMatch) {
          console.log("Kein Datum gefunden in:", dateText);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, day, month, year] = dateMatch;
        const isoDate = `${year}-${month}-${day}`;

        // URL extrahieren
        const linkElement = box.querySelector(
          ".teasertext a"
        ) as HTMLAnchorElement;
        if (!linkElement) {
          console.log("Kein Link gefunden in Box");
          continue;
        }

        let url = linkElement.href;
        if (url.startsWith("/")) {
          url = baseUrl + url;
        }

        // Titel extrahieren
        const titleElement = box.querySelector("h4.headline a");
        const title = titleElement?.textContent?.trim() || "maischberger";

        // Teasertext extrahieren (wichtig für Gäste!)
        const teaserElement = box.querySelector(".teasertext a");
        const teaserText = teaserElement?.textContent?.trim() || "";

        console.log(`Episode gefunden: ${isoDate}, Teaser: "${teaserText}"`);

        episodes.push({
          url,
          date: isoDate,
          title,
          teaserText,
        });
      }

      return episodes;
    }, BASE_URL);

    // Füge Episoden zur Gesamtliste hinzu
    allEpisodes.push(...episodes);

    // Filtere neue Episoden basierend auf dem letzten DB-Datum
    const pageNewEpisodes = episodes.filter((ep) => {
      // Falls kein DB-Datum vorhanden, sind alle Episoden neu
      if (!latestDbDate) return true;

      // Prüfe ob Episode nach dem letzten DB-Datum liegt
      const isNewer = ep.date > latestDbDate;

      if (!isNewer && ep.date <= latestDbDate) {
        console.log(
          `Episode erreicht bekanntes Datum: ${ep.date} <= ${latestDbDate}`
        );
        reachedLatestDbDate = true;
      }

      return isNewer;
    });

    // Nur gültige neue Episoden mit Gäste-Informationen hinzufügen
    const validPageNewEpisodes = pageNewEpisodes.filter((ep) => {
      if (!ep.teaserText || ep.teaserText.length < 10) {
        console.log(`Episode übersprungen (kein Teasertext): ${ep.date}`);
        return false;
      }

      if (ep.teaserText.includes("Zu Gast:")) {
        return true; // Hat Gäste-Info
      }

      if (ep.teaserText.length > 50 && !ep.teaserText.match(/^\s*mehr\s*$/)) {
        return true; // Hat substantiellen Content
      }

      console.log(`Episode übersprungen (keine Gäste-Info): ${ep.date}`);
      return false;
    });

    newEpisodes.push(...validPageNewEpisodes);

    console.log(
      `   ✅ ${episodes.length} Episoden gefunden, ${validPageNewEpisodes.length} davon neu und gültig (Gesamt neu: ${newEpisodes.length})`
    );

    // Stoppe wenn wir das letzte DB-Datum erreicht haben
    if (reachedLatestDbDate) {
      console.log(
        `🛑 Erreicht bekanntes Datum ${latestDbDate} - Stoppe Crawling`
      );
      break;
    }

    // Prüfe ob es eine nächste Seite gibt
    const nextPageLink = await page.$('.button.right a[href*="seite"]');

    if (nextPageLink) {
      console.log(`🔄 Navigiere zur nächsten Seite...`);

      // Klicke auf "weiter" Button
      await nextPageLink.click();
      await page.waitForSelector(".boxCon", { timeout: 15000 });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Kurz warten

      currentPage++;
    } else {
      console.log(`📄 Keine weitere Seite gefunden`);
      hasMorePages = false;
    }
  }

  console.log(
    `📺 Gesamt durchsucht: ${allEpisodes.length} Episoden auf ${currentPage} Seiten`
  );
  console.log(`🆕 Neue gültige Episoden: ${newEpisodes.length}`);

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Hilfsfunktion: Hole detaillierte Beschreibung von der Episodenseite
async function getEpisodeDetailedDescription(
  page: Page,
  episodeUrl: string
): Promise<number[] | [] | null> {
  try {
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extrahiere alle Beschreibungstexte
    const descriptions = await page.evaluate(() => {
      const texts: string[] = [];

      // Finde alle <p class="text small"> Elemente, die Beschreibungen enthalten
      const paragraphs = document.querySelectorAll("p.text.small");

      for (const p of paragraphs) {
        const text = p.textContent?.trim() || "";

        // Filtere relevante Beschreibungen (nicht die Produktionsinfo)
        if (
          text &&
          text.length > 20 &&
          !text.includes("Gemeinschaftsproduktion") &&
          !text.includes("hergestellt vom") &&
          !text.includes("Vincent productions")
        ) {
          texts.push(text);
        }
      }

      return texts;
    });

    const combinedDescription = descriptions.join(" ");

    const res = await getPoliticalArea(combinedDescription);
    return res;
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`,
      error
    );
    return null;
  }
}

export async function crawlNewMaischbergerEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Maischberger Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);
  console.log(`🎯 Filterung: Nur Episoden aus dem Jahr 2025`);

  // Hole das letzte Datum aus der DB
  const latestDbDate = await getLatestEpisodeDate("Maischberger");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Crawle nur neue Episoden seit letztem DB-Eintrag
    const newEpisodes = await getNewMaischbergerEpisodes(page, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    // Filtere nur Episoden aus 2025
    const episodes2025 = newEpisodes.filter((episode) => {
      const year = parseInt(episode.date.split("-")[0]);
      return year === 2025;
    });

    if (episodes2025.length === 0) {
      console.log("✅ Keine neuen 2025 Episoden gefunden!");
      return;
    }

    console.log(
      `🆕 Gefunden: ${episodes2025.length} neue 2025 Episoden (von ${newEpisodes.length} gesamt)`
    );
    if (episodes2025.length > 0) {
      console.log(
        `📅 2025 Zeitraum: ${episodes2025[episodes2025.length - 1]?.date} bis ${
          episodes2025[0]?.date
        }`
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs für Batch-Insert
    const episodeLinksToInsert = episodes2025.map((episode) => ({
      episodeUrl: episode.url,
      episodeDate: episode.date,
    }));

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    // Verarbeite jede Episode (älteste zuerst für chronologische Reihenfolge)
    const sortedEpisodes = episodes2025.sort(
      (a: MaischbergerEpisode, b: MaischbergerEpisode) =>
        a.date.localeCompare(b.date)
    );

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${
            sortedEpisodes.length
          }] Verarbeite 2025 Episode vom ${episode.date}: ${episode.title}`
        );

        if (!episode.teaserText || episode.teaserText.length < 10) {
          console.log("   ❌ Kein verwertbarer Teasertext");
          continue;
        }

        // Hole detaillierte Beschreibung von der Episodenseite
        const politicalAreaIds = await getEpisodeDetailedDescription(
          page,
          episode.url
        );

        // Extrahiere Gäste mit AI aus dem kombinierten Text
        const guestNames = await extractGuestsWithAI(episode.teaserText);

        if (guestNames.length === 0) {
          console.log("   ❌ Keine Gäste extrahiert");
          continue;
        }

        console.log(`👥 Gefundene Gäste: ${guestNames.join(", ")}`);

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guestName of guestNames) {
          console.log(`   🔍 Prüfe: ${guestName}`);

          const details = await checkPolitician(guestName);

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
            "Maischberger",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker in DB gespeichert`
          );

          console.log("   🏛️  Politiker in dieser Episode:");
          politicians.forEach((pol) => {
            console.log(
              `      - ${pol.politicianName} (${pol.partyName || "unbekannt"})`
            );
          });
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Maischberger",
            episode.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        episodesProcessed++;

        // Fortschritt alle 5 Episoden
        if ((i + 1) % 5 === 0) {
          console.log(
            `\n📊 Zwischenstand: ${episodesProcessed}/${sortedEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker in DB`
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

    // Speichere Episode-URLs am Ende (erste Funktion)
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 Inkrementeller Maischberger 2025 Crawl abgeschlossen!`);
    console.log(
      `📊 2025 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`
    );
    console.log(`👥 Politiker in DB gespeichert: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
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
