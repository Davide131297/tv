import type { GuestWithRole } from "@/types";
import {
  insertMultipleTvShowPoliticians,
  getExistingEpisodeDates,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "@/lib/supabase-server-utils";
import { extractGuestsWithAI, getPoliticalArea } from "@/lib/ai-utils";

// ARD Mediathek API — Maischberger Widget-Endpunkt
const WIDGET_API_URL =
  "https://api.ardmediathek.de/page-gateway/widgets/ard/asset/Y3JpZDovL2Rhc2Vyc3RlLmRlL21lbnNjaGVuIGJlaSBtYWlzY2hiZXJnZXI";

const PAGE_SIZE = 24;

// ─────────────────────────────────────────────
// Typen aus der ARD API
// ─────────────────────────────────────────────
interface ArdTeaser {
  id: string;
  longTitle: string;
  broadcastedOn: string; // ISO-8601: "2026-03-04T21:50:00Z"
  availableTo: string;
  duration: number; // Sekunden
  coreAssetType: string; // "EPISODE" | "SECTION" | "EXTRA_BONUS_CONTENT"
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
  pageNumber: number,
): Promise<ArdWidgetResponse> {
  const url = `${WIDGET_API_URL}?pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `ARD API Fehler: ${res.status} ${res.statusText} (Seite ${pageNumber})`,
    );
  }

  return res.json() as Promise<ArdWidgetResponse>;
}

// ─────────────────────────────────────────────
// Episodenbeschreibung via OG-Meta-Tag holen
// (serverseitig gerendert — kein Browser nötig)
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
        `⚠️  Episode-Seite nicht erreichbar (${res.status}): ${episodeUrl}`,
      );
      return "";
    }

    const html = await res.text();

    // OG-Description aus Meta-Tag extrahieren
    const match = html.match(
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    );

    if (!match) {
      // Fallback: name="description"
      const fallback = html.match(
        /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      );
      return fallback ? decodeHtmlEntities(fallback[1]) : "";
    }

    return decodeHtmlEntities(match[1]);
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`,
      error,
    );
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
// Prüft ob eine Episode ein Gebärdensprache-Duplikat ist
// (ID endet auf "/gebaerdensprache" ODER Titel enthält "Gebärdensprache")
// ─────────────────────────────────────────────
function isSignLanguageVariant(teaser: ArdTeaser): boolean {
  return (
    teaser.id.endsWith("/gebaerdensprache") ||
    teaser.longTitle.toLowerCase().includes("gebärdensprache")
  );
}

// ─────────────────────────────────────────────
// Prüft ob eine Episode eine vollständige Sendung ist
// (coreAssetType === "EPISODE", nicht SECTION oder EXTRA_BONUS_CONTENT)
// ─────────────────────────────────────────────
function isFullEpisode(teaser: ArdTeaser): boolean {
  return teaser.coreAssetType === "EPISODE";
}

// ─────────────────────────────────────────────
// Alle neuen Episoden von der ARD API holen
// Stoppt sobald ein bereits bekanntes Datum gefunden wird
// ─────────────────────────────────────────────
async function fetchNewEpisodes(
  existingDates: Set<string>,
): Promise<EpisodeData[]> {
  const newEpisodes: EpisodeData[] = [];
  let pageNumber = 0;
  let foundKnown = false;

  // Erste Seite holen, um totalElements zu kennen
  const firstPage = await fetchEpisodePage(0);
  const { totalElements } = firstPage.pagination;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE);

  console.log(
    `📋 Gesamt ${totalElements} Einträge in ${totalPages} Seiten verfügbar`,
  );

  const processPage = async (data: ArdWidgetResponse): Promise<boolean> => {
    // Filtere: nur vollständige Episoden, keine Gebärdensprache-Duplikate
    const episodes = data.teasers.filter(
      (t) => isFullEpisode(t) && !isSignLanguageVariant(t),
    );

    for (const teaser of episodes) {
      // ISO-Datum: "2026-03-04T21:50:00Z" → "2026-03-04"
      const date = teaser.broadcastedOn.split("T")[0];

      // Episode bereits in der DB? → Stoppe hier (chronologisch absteigend)
      if (existingDates.has(date)) {
        console.log(
          `🛑 Datum ${date} bereits in DB — keine weiteren Seiten nötig`,
        );
        foundKnown = true;
        return true;
      }

      // Episoden-URL aufbauen
      const episodeUrl = `https://www.ardmediathek.de/video/${teaser.links.target.urlId}`;

      console.log(`🔍 Lade Beschreibung für ${date}: ${teaser.longTitle}`);

      // Beschreibung von der Mediathek-Seite holen (OG meta tag)
      const description = await fetchEpisodeDescription(episodeUrl);

      // Gäste mit AI aus Beschreibung extrahieren
      const guestNames = await extractGuestsWithAI(
        description || teaser.longTitle,
      );
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
        `📺 ${date} | "${teaser.longTitle}" | Gäste: ${guestNames.join(", ") || "–"}`,
      );
    }

    return false; // Noch nicht fertig
  };

  // Erste Seite verarbeiten
  foundKnown = await processPage(firstPage);

  // Weitere Seiten paginiert abrufen bis bekanntes Datum gefunden
  for (pageNumber = 1; pageNumber < totalPages && !foundKnown; pageNumber++) {
    console.log(`📄 Lade Seite ${pageNumber + 1}/${totalPages}...`);
    const page = await fetchEpisodePage(pageNumber);
    foundKnown = await processPage(page);
  }

  // Neueste zuerst
  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date));
}

// ─────────────────────────────────────────────
// Hilfsfunktion: Politiker für eine Episode prüfen & zurückgeben
// ─────────────────────────────────────────────
async function processPoliticians(episode: EpisodeData) {
  const politicians = [];

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

    // Kurze Pause zwischen API-Calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return politicians;
}

// ─────────────────────────────────────────────
// INKREMENTELLER Crawl (Standard-Modus)
// Holt nur Episoden die noch nicht in Supabase sind
// ─────────────────────────────────────────────
export async function crawlNewMaischbergerEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Maischberger Crawl (ARD API)...");

  // Bereits gespeicherte Episodendaten aus Supabase holen
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

  // Älteste zuerst verarbeiten (chronologisch)
  const sortedEpisodes = [...newEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  for (const episode of sortedEpisodes) {
    try {
      if (episode.guests.length === 0) {
        console.log(`⚠️  ${episode.date}: Keine Gäste gefunden – überspringe`);
        continue;
      }

      // Politische Themenbereiche bestimmen
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
        }`,
      );

      // Politiker in DB speichern
      if (politicians.length > 0) {
        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Maischberger",
          episode.date,
          politicians,
        );
        totalPoliticiansInserted += inserted;
      }

      // Episode-URL immer speichern (auch wenn keine Politiker)
      episodeLinksToInsert.push({
        episodeUrl: episode.episodeUrl,
        episodeDate: episode.date,
      });

      // Politische Themenbereiche speichern
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

  // Episode-URLs batch-speichern
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

// ─────────────────────────────────────────────
// VOLLSTÄNDIGER historischer Crawl (alle Seiten, alle Episoden)
// ─────────────────────────────────────────────
export async function crawlMaischbergerFull(): Promise<void> {
  console.log("🚀 Starte vollständigen Maischberger Crawl (ARD API)...");

  // Leeres Set = kein Filter → alle Episoden holen
  const allEpisodes = await fetchNewEpisodes(new Set());

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

  // Episode-URLs alle auf einmal speichern
  const episodeLinksToInsert = sortedEpisodes.map((ep) => ({
    episodeUrl: ep.episodeUrl,
    episodeDate: ep.date,
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

// ─────────────────────────────────────────────
// Funktion zum Löschen aller Maischberger-Daten
// ─────────────────────────────────────────────
export async function clearMaischbergerData(): Promise<number> {
  console.log("🗑️  Lösche alle Maischberger-Daten aus tv_show_politicians...");

  const { supabase } = await import("@/lib/supabase");

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
