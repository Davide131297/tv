import axios from "axios";
import {
  insertMultipleTvShowPoliticians,
  getExistingEpisodeDates,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  extractGuestsWithAI,
  getPoliticalArea,
} from "../lib/utils.js";

// ARD Mediathek API — Maischberger Widget-Endpunkt
const WIDGET_API_URL =
  "https://api.ardmediathek.de/page-gateway/widgets/ard/asset/Y3JpZDovL2Rhc2Vyc3RlLmRlL21lbnNjaGVuIGJlaSBtYWlzY2hiZXJnZXI";

const PAGE_SIZE = 24;

interface ArdTeaser {
  id: string;
  longTitle: string;
  broadcastedOn: string;
  availableTo: string;
  duration: number;
  coreAssetType: string;
  links: {
    target: {
      urlId: string;
    };
  };
}

interface ArdWidgetResponse {
  teasers: ArdTeaser[];
  pagination: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
  };
}

interface EpisodeGuest {
  name: string;
}

interface EpisodeData {
  id: string;
  date: string;
  title: string;
  episodeUrl: string;
  description: string;
  guests: EpisodeGuest[];
}

interface ProcessedPolitician {
  politicianId: number;
  politicianName: string;
  partyId?: number;
  partyName?: string;
}

async function fetchEpisodePage(
  pageNumber: number,
): Promise<ArdWidgetResponse> {
  const url = `${WIDGET_API_URL}?pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`;
  const res = await axios.get<ArdWidgetResponse>(url);

  return res.data;
}

async function fetchEpisodeDescription(episodeUrl: string): Promise<string> {
  try {
    const res = await axios.get<string>(episodeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      responseType: "text",
    });

    const html = res.data;
    const match = html.match(
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    );

    if (!match) {
      const fallback = html.match(
        /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      );
      return fallback ? decodeHtmlEntities(fallback[1]) : "";
    }

    return decodeHtmlEntities(match[1]);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.warn(
        `⚠️  Episode-Seite nicht erreichbar (${error.response.status}): ${episodeUrl}`,
      );
      return "";
    }

    console.error(
      `❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`,
      error,
    );
    return "";
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß");
}

function isSignLanguageVariant(teaser: ArdTeaser): boolean {
  return (
    teaser.id.endsWith("/gebaerdensprache") ||
    teaser.longTitle.toLowerCase().includes("gebärdensprache")
  );
}

function isFullEpisode(teaser: ArdTeaser): boolean {
  return teaser.coreAssetType === "EPISODE";
}

async function fetchNewEpisodes(
  existingDates: Set<string>,
): Promise<EpisodeData[]> {
  const newEpisodes: EpisodeData[] = [];
  let foundKnown = false;

  const firstPage = await fetchEpisodePage(0);
  const { totalElements } = firstPage.pagination;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE);

  console.log(
    `📋 Gesamt ${totalElements} Einträge in ${totalPages} Seiten verfügbar`,
  );

  const processPage = async (data: ArdWidgetResponse): Promise<boolean> => {
    const episodes = data.teasers.filter(
      (teaser) => isFullEpisode(teaser) && !isSignLanguageVariant(teaser),
    );

    for (const teaser of episodes) {
      const date = teaser.broadcastedOn.split("T")[0];

      if (existingDates.has(date)) {
        console.log(
          `🛑 Datum ${date} bereits in DB — keine weiteren Seiten nötig`,
        );
        foundKnown = true;
        return true;
      }

      const episodeUrl = `https://www.ardmediathek.de/video/${teaser.links.target.urlId}`;

      console.log(`🔍 Lade Beschreibung für ${date}: ${teaser.longTitle}`);

      const description = await fetchEpisodeDescription(episodeUrl);
      const guestNames = await extractGuestsWithAI(
        description || teaser.longTitle,
      );
      const guests: EpisodeGuest[] = guestNames.map((name) => ({ name }));

      newEpisodes.push({
        id: teaser.id,
        date,
        title: teaser.longTitle,
        episodeUrl,
        description,
        guests,
      });

      console.log(
        `📺 ${date} | "${teaser.longTitle}" | Gäste: ${guestNames.join(", ") || "–"}`,
      );
    }

    return false;
  };

  foundKnown = await processPage(firstPage);

  for (let pageNumber = 1; pageNumber < totalPages && !foundKnown; pageNumber++) {
    console.log(`📄 Lade Seite ${pageNumber + 1}/${totalPages}...`);
    const page = await fetchEpisodePage(pageNumber);
    foundKnown = await processPage(page);
  }

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date));
}

async function processPoliticians(
  episode: EpisodeData,
): Promise<ProcessedPolitician[]> {
  const politicians: ProcessedPolitician[] = [];

  for (const guest of episode.guests) {
    const details = await checkPolitician(guest.name);

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

  return politicians;
}

export async function crawlNewMaischbergerEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Maischberger Crawl (ARD API)...");

  const existingDates = await getExistingEpisodeDates("Maischberger");
  console.log(`📅 Bereits ${existingDates.size} Episoden in DB vorhanden`);

  if (existingDates.size > 0) {
    const sortedDates = [...existingDates].sort().reverse();
    console.log(`📅 Letzte bekannte Episode: ${sortedDates[0]}`);
  }

  const newEpisodes = await fetchNewEpisodes(existingDates);

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden – alles aktuell!");
    return;
  }

  console.log(`\n🔄 ${newEpisodes.length} neue Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
    [];

  const sortedEpisodes = [...newEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  for (const episode of sortedEpisodes) {
    try {
      if (episode.guests.length === 0) {
        console.log(`⚠️  ${episode.date}: Keine Gäste gefunden – überspringe`);
        continue;
      }

      const politicalAreaIds = await getPoliticalArea(episode.description);
      const politicians = await processPoliticians(episode);

      const guestNames = episode.guests.map((guest) => guest.name);
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

      episodeLinksToInsert.push({
        episodeUrl: episode.episodeUrl,
        episodeDate: episode.date,
      });

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Maischberger",
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

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Maischberger",
      episodeLinksToInsert,
    );
  }

  console.log(`\n=== Maischberger Zusammenfassung ===`);
  console.log(
    `Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`,
  );
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}

export async function crawlMaischbergerFull(): Promise<void> {
  console.log("🚀 Starte vollständigen Maischberger Crawl (ARD API)...");

  const allEpisodes = await fetchNewEpisodes(new Set());

  if (allEpisodes.length === 0) {
    console.log("Keine Episoden gefunden.");
    return;
  }

  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  console.log(`\n🔄 ${sortedEpisodes.length} Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  let episodesWithErrors = 0;

  const episodeLinksToInsert = sortedEpisodes.map((episode) => ({
    episodeUrl: episode.episodeUrl,
    episodeDate: episode.date,
  }));

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Maischberger",
      episodeLinksToInsert,
    );
    console.log(`📎 Episode-URLs gespeichert: ${totalEpisodeLinksInserted}`);
  }

  for (const episode of sortedEpisodes) {
    try {
      if (episode.guests.length === 0) {
        console.log(`⚠️  ${episode.date}: Keine Gäste gefunden – überspringe`);
        continue;
      }

      const politicalAreaIds = await getPoliticalArea(episode.description);
      const politicians = await processPoliticians(episode);

      const guestNames = episode.guests.map((guest) => guest.name);
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

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Maischberger",
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

  console.log(`\n=== Maischberger FULL Zusammenfassung ===`);
  console.log(
    `Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`,
  );
  console.log(`Fehler: ${episodesWithErrors}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}

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
