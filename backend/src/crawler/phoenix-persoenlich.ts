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
  "https://www.phoenix.de/sendungen/gespraeche/phoenix-persoenlich-s-121511.html";

// Haupt-Crawler-Funktion
export default async function CrawlPhoenixPersönlich() {
  console.log("🚀 Starte Phoenix Persönlich Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  const latestDbDate = await getLatestEpisodeDate("Phoenix Persönlich");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Schließe Cookie/Privacy Banner falls vorhanden
    try {
      const saveButton = await page.$("button.o-btn.c-btn__label");
      if (saveButton) {
        console.log("🍪 Schließe Privacy-Banner...");
        await saveButton.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch {
      console.log("ℹ️  Kein Privacy-Banner gefunden");
    }

    // Warte auf die Episode-Liste
    await page.waitForSelector(".c-teaser", { timeout: 15000 });

    console.log("🔍 Extrahiere Episode-Links...");

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
          console.log(
            `📥 Lade weitere Episoden... (Versuch ${loadMoreAttempts + 1})`,
          );
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
              console.log(
                `⏹️  Erreicht Episode aus ${episodeYear}, stoppe Laden`,
              );
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
    const episodes = await page.evaluate(() => {
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
          'a[ng-href*="/sendungen/gespraeche/phoenix-persoenlich/"]',
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
    const episodesWithFormattedDates = episodes.map((ep: any) => {
      const [day, month, year] = ep.date.split(".");
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(
        2,
        "0",
      )}`;
      return { ...ep, formattedDate };
    });

    // Filtere nur Episoden aus dem aktuellen Jahr
    const currentYearEpisodes = episodesWithFormattedDates.filter((ep: any) => {
      const episodeYear = parseInt(ep.formattedDate.split("-")[0]);
      return episodeYear === currentYear;
    });

    console.log(
      `📅 ${currentYearEpisodes.length}/${episodes.length} Episoden aus ${currentYear}`,
    );

    // Filtere nur neue Episoden
    let filteredEpisodes = currentYearEpisodes;
    if (latestDbDate) {
      filteredEpisodes = currentYearEpisodes.filter(
        (ep: any) => ep.formattedDate > latestDbDate,
      );
      console.log(
        `Nach Datum-Filter: ${filteredEpisodes.length}/${currentYearEpisodes.length} URLs (nur neuer als ${latestDbDate})`,
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

      console.log(
        `\n🎬 [${i + 1}/${filteredEpisodes.length}] Verarbeite Episode: ${
          episode.title
        } (${episodeDate})`,
      );

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

        if (!guestsText) {
          console.log("   ❌ Keine Gäste-Informationen gefunden");
          continue;
        }

        console.log(
          `📝 Gäste-Text: ${guestsText
            .substring(0, 200)
            .replace(/\n/g, " ")}...`,
        );

        // Extrahiere Gäste mit AI
        const guestNames = await extractGuestsWithAI(guestsText);

        if (guestNames.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        console.log(`👥 Gefundene Gäste: ${guestNames.join(", ")}`);

        // Analysiere politische Themen (verwende den Titel)
        const politicalAreaIds = await getPoliticalArea(
          episode.title + " " + guestsText,
        );

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guestName of guestNames) {
          console.log(`   🔍 Prüfe: ${guestName}`);

          // Extrahiere mögliche Rolle/Partei aus dem Text
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

        // Speichere Politiker
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Phoenix",
            "Phoenix Persönlich",
            episodeDate,
            politicians,
          );

          totalPoliticiansInserted += inserted;
          episodesWithPoliticians++;

          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`,
          );

          // Füge Episode-URL zur Liste hinzu
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episodeDate,
          });
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Phoenix Persönlich",
            episodeDate,
            politicalAreaIds,
          );
          totalPoliticalAreasInserted += insertedAreas;
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`,
          );
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
        "Phoenix Persönlich",
        episodeLinksToInsert,
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`,
      );
    }

    console.log(`\n🎉 Phoenix Persönlich Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${filteredEpisodes.length}`);
    console.log(`📺 Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`🏛️  Themenbereiche eingefügt: ${totalPoliticalAreasInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Phoenix Persönlich Crawling erfolgreich",
      status: 200,
    };
  } catch (error) {
    console.error("❌ Fehler beim Phoenix Persönlich Crawling:", error);
    return {
      message: "Fehler beim Phoenix Persönlich Crawling",
      status: 500,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
