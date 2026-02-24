import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  checkPolitician,
  insertEpisodePoliticalAreas,
} from "../lib/utils.js";
import { getPoliticalArea, extractGuestsWithAI } from "../lib/utils.js";

const LIST_URL =
  "https://www.phoenix.de/sendungen/gespraeche/phoenix-runde-s-121346.html";

// Haupt-Crawler-Funktion
export default async function CrawlPhoenixRunde() {
  const latestDbDate = await getLatestEpisodeDate("Phoenix Runde");

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Schließe Cookie/Privacy Banner falls vorhanden
    try {
      const saveButton = await page.$("button.o-btn.c-btn__label");
      if (saveButton) {
        await saveButton.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {}

    // Warte auf die Episode-Liste
    await page.waitForSelector(".c-teaser", { timeout: 15000 });

    // Klicke mehrmals auf "Weitere laden" um mehr Episoden zu laden
    const currentYear = new Date().getFullYear();
    let clickedLoadMore = true;
    let loadMoreAttempts = 0;
    const maxLoadMoreAttempts = 20; // Maximale Anzahl an Klicks

    while (clickedLoadMore && loadMoreAttempts < maxLoadMoreAttempts) {
      try {
        const loadMoreButton = await page.$(
          '.c-btn a[ng-click*="next(nexturl)"]',
        );

        if (loadMoreButton) {
          await loadMoreButton.click();
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Warte auf das Laden der neuen Inhalte
          loadMoreAttempts++;

          // Prüfe ob das älteste sichtbare Datum noch im aktuellen Jahr ist
          const oldestDate = await page.evaluate(() => {
            const dates = Array.from(
              document.querySelectorAll(".c-teaser__item__body__info__date"),
            ).map((el) => el.textContent?.trim() || "");
            return dates[dates.length - 1] || "";
          });

          if (oldestDate) {
            const dateParts = oldestDate.split(".");
            const year = dateParts[2];
            const episodeYear = parseInt(year);
            if (episodeYear < currentYear) {
              break;
            }
          }
        } else {
          clickedLoadMore = false;
        }
      } catch {
        clickedLoadMore = false;
      }
    }

    // Extrahiere alle Episoden mit ihren URLs und Daten
    const episodes: Array<{ url: string; title: string; date: string }> = await page.evaluate(() => {
      const episodeElements = document.querySelectorAll(
        'div[phnx-teaser][teaser="teaser"]',
      );
      const results: Array<{
        url: string;
        title: string;
        date: string;
      }> = [];

      for (const episode of episodeElements) {
        // Finde den ersten Link mit dem Episode-Titel
        const linkElement = episode.querySelector(
          'a[ng-href*="/sendungen/gespraeche/phoenix-runde/"]',
        ) as HTMLAnchorElement;
        if (!linkElement) continue;

        const url = linkElement.href;

        // Extrahiere Untertitel (eigentlicher Episode-Titel)
        const titleElement = episode.querySelector(
          ".c-teaser__item__body__title__subline",
        );
        const title = titleElement?.textContent?.trim() || "";

        // Extrahiere Datum
        const dateElement = episode.querySelector(
          ".c-teaser__item__body__info__date",
        );
        const dateText = dateElement?.textContent?.trim() || "";

        if (url && dateText) {
          results.push({ url, title, date: dateText });
        }
      }

      return results;
    });

    console.log(`📺 ${episodes.length} Episoden gefunden`);

    if (episodes.length === 0) {
      console.log("❌ Keine Episoden gefunden");
      return {
        message: "Keine Episoden gefunden",
        status: 404,
      };
    }

    // Konvertiere deutsche Datumsformate zu YYYY-MM-DD
    const episodesWithFormattedDates = episodes.map((ep) => {
      const [day, month, year] = ep.date.split(".");
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0",
      )}`;
      return { ...ep, formattedDate };
    });

    // Filtere nur Episoden aus dem aktuellen Jahr
    const currentYearEpisodes = episodesWithFormattedDates.filter((ep) => {
      const episodeYear = parseInt(ep.formattedDate.split("-")[0]);
      return episodeYear === currentYear;
    });

    // Filtere nur neue Episoden
    let filteredEpisodes = currentYearEpisodes;
    if (latestDbDate) {
      filteredEpisodes = currentYearEpisodes.filter(
        (ep) => ep.formattedDate > latestDbDate,
      );
    }

    if (filteredEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden zu crawlen");
      return {
        message: "Keine neuen Episoden zu crawlen",
        status: 200,
      };
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let totalPoliticalAreasInserted = 0;
    let episodesWithPoliticians = 0;

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Verarbeite jede Episode
    for (let i = 0; i < filteredEpisodes.length; i++) {
      const episode = filteredEpisodes[i];
      const episodeDate = episode.formattedDate;

      try {
        // Öffne die Episode-Seite
        const episodePage = await browser.newPage();
        await episodePage.goto(episode.url, {
          waitUntil: "networkidle2",
          timeout: 60000,
        });

        // Warte auf den Inhalt
        await episodePage.waitForSelector(".u-wysiwyg", { timeout: 10000 });

        // Extrahiere die Gäste-Informationen
        const guestsText = await episodePage.evaluate(() => {
          const wysiwygElement = document.querySelector(".u-wysiwyg");
          return wysiwygElement?.textContent?.trim() || "";
        });

        await episodePage.close();

        if (!guestsText) continue;

        // Extrahiere Gäste mit AI
        const guestNames = await extractGuestsWithAI(guestsText);

        if (guestNames.length === 0) continue;

        // Analysiere politische Themen (verwende den Titel)
        const politicalAreaIds = await getPoliticalArea(
          episode.title + " " + guestsText,
        );

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guestName of guestNames) {
          const roleMatch = guestsText.match(
            new RegExp(
              `${guestName}[^\\n]*?([A-ZÄÖÜ][^,\\n]*?)(?:,|\\n|$)`,
              "i",
            ),
          );
          const role = roleMatch ? roleMatch[1].trim() : undefined;

          const details = await checkPolitician(guestName, role);

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

          // Pause zwischen API-Calls
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Log: Datum + Gäste + Politiker
        console.log(
          `📅 ${episodeDate} | 👥 ${guestNames.join(", ")}${
            politicians.length > 0
              ? ` | ✅ Politiker: ${politicians
                  .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                  .join(", ")}`
              : ""
          }`,
        );

        // Speichere Politiker
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Phoenix",
            "Phoenix Runde",
            episodeDate,
            politicians,
          );
          totalPoliticiansInserted += inserted;
          episodesWithPoliticians++;
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episodeDate,
          });
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Phoenix Runde",
            episodeDate,
            politicalAreaIds,
          );
          totalPoliticalAreasInserted += insertedAreas;
        }
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.title}:`,
          error,
        );
      }
    }

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Phoenix Runde",
        episodeLinksToInsert,
      );
    }

    console.log(`\n=== Phoenix Runde Zusammenfassung ===`);
    console.log(`Episoden verarbeitet: ${filteredEpisodes.length}`);
    console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`Themenbereiche eingefügt: ${totalPoliticalAreasInserted}`);
    console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Phoenix Runde Crawling erfolgreich",
      status: 200,
    };
  } catch (error) {
    console.error("❌ Fehler beim Phoenix Runde Crawling:", error);
    return {
      message: "Fehler beim Phoenix Runde Crawling",
      status: 500,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
