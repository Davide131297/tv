import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  checkPolitician,
  insertEpisodePoliticalAreas,
} from "@/lib/supabase-server-utils";
import { getPoliticalArea, extractGuestsWithAI } from "@/lib/ai-utils";

const LIST_URL = "https://plus.rtl.de/video-tv/shows/pinar-atalay-1041381";

// Datum aus Episode-Nummer extrahieren (Folge 1 = 17.03.2025)
function getEpisodeDateFromNumber(episodeNumber: number): string {
  // Startdatum: 06. Oktober 2025
  const startDate = new Date("2025-10-06");

  // Episoden erscheinen alle 2 Wochen (jeden 2. Montag)
  const daysToAdd = (episodeNumber - 1) * 14;
  const episodeDate = new Date(startDate);
  episodeDate.setDate(episodeDate.getDate() + daysToAdd);

  // Formatiere als YYYY-MM-DD
  const year = episodeDate.getFullYear();
  const month = String(episodeDate.getMonth() + 1).padStart(2, "0");
  const day = String(episodeDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Haupt-Crawler-Funktion
export default async function CrawlPinarAtalay() {
  console.log("🚀 Starte Pinar Atalay Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  const latestDbDate = await getLatestEpisodeDate("Pinar Atalay");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    // Warte auf die Episode-Liste
    await page.waitForSelector(".episode-list", { timeout: 15000 });

    console.log("🔍 Extrahiere Episode-Links und Beschreibungen...");

    // Extrahiere alle Episoden mit ihren Beschreibungen
    const episodes = await page.evaluate(() => {
      const episodeElements = document.querySelectorAll(
        "watch-episode-list-teaser"
      );
      const results: Array<{
        url: string;
        title: string;
        description: string;
        episodeNumber: number | null;
      }> = [];

      for (const episode of episodeElements) {
        const linkElement = episode.querySelector(
          "a.series-teaser__link"
        ) as HTMLAnchorElement;
        if (!linkElement) continue;

        const url = linkElement.href;

        const titleElement = episode.querySelector(".series-teaser__title h3");
        const title = titleElement?.textContent?.trim() || "";

        // Extrahiere Episode-Nummer aus Titel (z.B. "Folge 1" -> 1)
        const episodeMatch = title.match(/Folge\s+(\d+)/i);
        const episodeNumber = episodeMatch
          ? parseInt(episodeMatch[1], 10)
          : null;

        const descriptionElement = episode.querySelector("p.description");
        const description = descriptionElement?.textContent?.trim() || "";

        if (url && description) {
          results.push({ url, title, description, episodeNumber });
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

    // Filtere nur neue Episoden
    let filteredEpisodes = episodes;
    if (latestDbDate) {
      filteredEpisodes = episodes.filter((ep) => {
        if (!ep.episodeNumber) return true; // Wenn keine Episode-Nummer, behalte sie
        const episodeDate = getEpisodeDateFromNumber(ep.episodeNumber);
        return episodeDate > latestDbDate;
      });
      console.log(
        `Nach Datum-Filter: ${filteredEpisodes.length}/${episodes.length} URLs (nur neuer als ${latestDbDate})`
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
      const episodeDate = episode.episodeNumber
        ? getEpisodeDateFromNumber(episode.episodeNumber)
        : new Date().toISOString().split("T")[0];

      console.log(
        `\n🎬 [${i + 1}/${filteredEpisodes.length}] Verarbeite Episode: ${
          episode.title
        } (${episodeDate})`
      );
      console.log(
        `📝 Beschreibung: ${episode.description.substring(0, 100)}...`
      );

      try {
        // Extrahiere Gäste mit AI
        const guestNames = await extractGuestsWithAI(episode.description);

        if (guestNames.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        console.log(`👥 Gefundene Gäste: ${guestNames.join(", ")}`);

        // Analysiere politische Themen
        const politicalAreaIds = await getPoliticalArea(episode.description);

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

        // Speichere Politiker
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Pinar Atalay",
            episodeDate,
            politicians
          );

          totalPoliticiansInserted += inserted;
          episodesWithPoliticians++;

          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
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
            "Pinar Atalay",
            episodeDate,
            politicalAreaIds
          );
          totalPoliticalAreasInserted += insertedAreas;
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.title}:`,
          error
        );
      }
    }

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Pinar Atalay",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 Pinar Atalay Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${filteredEpisodes.length}`);
    console.log(`📺 Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`🏛️  Themenbereiche eingefügt: ${totalPoliticalAreasInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Pinar Atalay Crawling erfolgreich",
      status: 200,
    };
  } catch (error) {
    console.error("❌ Fehler beim Pinar Atalay Crawling:", error);
    return {
      message: "Fehler beim Pinar Atalay Crawling",
      status: 500,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
