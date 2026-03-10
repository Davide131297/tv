import type { GuestWithRole } from "@/types";
import {
  insertMultipleTvShowPoliticians,
  getExistingEpisodeDates,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "@/lib/supabase-server-utils";
import { extractGuestsWithAI, getPoliticalArea } from "@/lib/ai-utils";

// ARD Mediathek API — Caren Miosga Widget-Endpunkt
const WIDGET_API_URL =
  "https://api.ardmediathek.de/page-gateway/widgets/ard/asset/Y3JpZDovL2Rhc2Vyc3RlLmRlL2NhcmVuLW1pb3NnYQ";

const PAGE_SIZE = 24;

// ─────────────────────────────────────────────
// Typen aus der ARD API
// ─────────────────────────────────────────────
interface ArdTeaser {
  id: string;
  longTitle: string;
  broadcastedOn: string; // ISO-8601: "2026-03-08T21:00:00Z"
  availableTo: string;
  duration: number;
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

interface EpisodeData {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  episodeUrl: string;
  description: string;
  guests: GuestWithRole[];
}

// ─────────────────────────────────────────────
// ARD API: Eine Seite der Episode-Liste holen
// ─────────────────────────────────────────────
async function fetchEpisodePage(
  pageNumber: number
): Promise<ArdWidgetResponse> {
  const url = `${WIDGET_API_URL}?pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `ARD API Fehler: ${res.status} ${res.statusText} (Seite ${pageNumber})`
    );
  }

  return res.json() as Promise<ArdWidgetResponse>;
}

// ─────────────────────────────────────────────
// Episodenbeschreibung via OG-Meta-Tag holen
// ─────────────────────────────────────────────
async function fetchEpisodeDescription(episodeUrl: string): Promise<string> {
  try {
    const res = await fetch(episodeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(
        `⚠️  Episode-Seite nicht erreichbar (${res.status}): ${episodeUrl}`
      );
      return "";
    }

    const html = await res.text();

    // OG-Description aus Meta-Tag extrahieren
    const match = html.match(
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i
    );

    if (!match) {
      // Fallback: name="description"
      const fallback = html.match(
        /<meta[^>]+name="description"[^>]+content="([^"]+)"/i
      );
      return fallback ? decodeHtmlEntities(fallback[1]) : "";
    }

    return decodeHtmlEntities(match[1]);
  } catch (error) {
    console.error(`❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`, error);
    return "";
  }
}

// HTML-Entities dekodieren (z.B. &amp; → &)
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

// ─────────────────────────────────────────────
// Alle neuen Episoden von der API holen
// Überspringt Episoden die bereits in der DB sind (via show_links)
// ─────────────────────────────────────────────
async function fetchNewEpisodes(
  existingDates: Set<string>
): Promise<EpisodeData[]> {
  const newEpisodes: EpisodeData[] = [];
  let pageNumber = 0;
  let foundKnown = false;

  // Erste Seite holen, um totalElements zu kennen
  const firstPage = await fetchEpisodePage(0);
  const totalPages = Math.ceil(
    firstPage.pagination.totalElements / PAGE_SIZE
  );

  const processPage = async (data: ArdWidgetResponse): Promise<boolean> => {
    // Filtere Gebärdensprache-Duplikate raus
    const episodes = data.teasers.filter(
      (t) => !t.longTitle.includes("Gebärdensprache")
    );

    for (const teaser of episodes) {
      // ISO-Datum: "2026-03-08T21:00:00Z" → "2026-03-08"
      const date = teaser.broadcastedOn.split("T")[0];

      // Episode bereits in der DB? → überspringen
      if (existingDates.has(date)) {
        // Episoden sind chronologisch absteigend → können früh abbrechen
        foundKnown = true;
        return true;
      }

      const episodeUrl = `https://www.ardmediathek.de/video/${teaser.links.target.urlId}`;

      // Lade Beschreibung von der Episodenseite
      const description = await fetchEpisodeDescription(episodeUrl);

      // Extrahiere Gäste mit AI aus der Beschreibung
      const guestNames = await extractGuestsWithAI(description || teaser.longTitle);
      const guests: GuestWithRole[] = guestNames.map((name) => ({ name }));

      newEpisodes.push({
        id: teaser.id,
        date,
        title: teaser.longTitle,
        episodeUrl,
        description,
        guests,
      });

      console.log(
        `📺 ${date} | "${teaser.longTitle}" | Gäste: ${guestNames.join(", ") || "–"}`
      );
    }

    return false; // Noch nicht fertig
  };

  // Erste Seite verarbeiten
  foundKnown = await processPage(firstPage);

  // Weitere Seiten paginiert abrufen
  for (pageNumber = 1; pageNumber < totalPages && !foundKnown; pageNumber++) {
    const page = await fetchEpisodePage(pageNumber);
    foundKnown = await processPage(page);
  }

  // Neueste zuerst
  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date));
}

// ─────────────────────────────────────────────
// Hilfsfunktion: Politiker verarbeiten
// ─────────────────────────────────────────────
async function processPoliticians(episode: EpisodeData) {
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

    // Kurze Pause zwischen API-Calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return politicians;
}

// ─────────────────────────────────────────────
// INKREMENTELLER Crawl (Standard-Modus)
// ─────────────────────────────────────────────
export async function crawlIncrementalCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Caren Miosga Crawl (ARD API)...");

  const existingDates = await getExistingEpisodeDates("Caren Miosga");
  console.log(`📅 Bereits ${existingDates.size} Episoden in DB vorhanden`);

  const newEpisodes = await fetchNewEpisodes(existingDates);

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden – alles aktuell!");
    return;
  }

  console.log(`\n🔄 ${newEpisodes.length} neue Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] = [];

  for (const episode of newEpisodes) {
    try {
      if (episode.guests.length === 0) continue;

      // Politische Themenbereiche
      const politicalAreaIds = await getPoliticalArea(episode.description);

      // Politiker prüfen
      const politicians = await processPoliticians(episode);

      const guestNames = episode.guests.map((g) => g.name);
      console.log(
        `📅 ${episode.date} | 👥 ${guestNames.join(", ")}${
          politicians.length > 0
            ? ` | ✅ Politiker: ${politicians
                .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                .join(", ")}`
            : ""
        }`
      );

      // Politiker in DB speichern
      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Caren Miosga",
          episode.date,
          politicians
        );
        totalPoliticiansInserted += inserted;
        episodeLinksToInsert.push({
          episodeUrl: episode.episodeUrl,
          episodeDate: episode.date,
        });
      }

      // Politische Themenbereiche speichern
      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Caren Miosga",
          episode.date,
          politicalAreaIds
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

  // Episode-URLs batch-speichern
  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Caren Miosga",
      episodeLinksToInsert
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
  console.log("🚀 Starte vollständigen Caren Miosga Crawl (ARD API)...");

  // Leeres Set = kein Filter → alle Episoden holen
  const allEpisodes = await fetchNewEpisodes(new Set());

  if (allEpisodes.length === 0) {
    console.log("Keine Episoden gefunden.");
    return;
  }

  // Älteste zuerst für historischen Crawl
  const sortedEpisodes = [...allEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  console.log(`\n🔄 ${sortedEpisodes.length} Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  let episodesWithErrors = 0;

  // Episode-URLs batch speichern
  const episodeLinksToInsert = sortedEpisodes.map((ep) => ({
    episodeUrl: ep.episodeUrl,
    episodeDate: ep.date,
  }));

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Caren Miosga",
      episodeLinksToInsert
    );
  }

  for (const episode of sortedEpisodes) {
    try {
      if (episode.guests.length === 0) continue;

      const politicalAreaIds = await getPoliticalArea(episode.description);
      const politicians = await processPoliticians(episode);

      const guestNames = episode.guests.map((g) => g.name);
      console.log(
        `📅 ${episode.date} | 👥 ${guestNames.join(", ")}${
          politicians.length > 0
            ? ` | ✅ Politiker: ${politicians
                .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                .join(", ")}`
            : ""
        }`
      );

      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Caren Miosga",
          episode.date,
          politicians
        );
        totalPoliticiansInserted += inserted;
      }

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        await insertEpisodePoliticalAreas(
          "Caren Miosga",
          episode.date,
          politicalAreaIds
        );
      }

      episodesProcessed++;
    } catch (error) {
      console.error(
        `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
        error
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
