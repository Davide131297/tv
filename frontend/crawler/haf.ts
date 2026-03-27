import {
  getExistingEpisodeDates,
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "@/lib/supabase-server-utils";
import { extractGuestsWithAI, getPoliticalArea } from "@/lib/ai-utils";

const BASE_URL = "https://www1.wdr.de";
const SENDUNGEN_URL = `${BASE_URL}/daserste/hartaberfair/index.html`;

// ─────────────────────────────────────────────
// Episoden-Links + Datum aus der WDR-Sendungen-Seite extrahieren
// Kein Browser nötig – HTML ist serverseitig gerendert
// ─────────────────────────────────────────────
async function fetchEpisodeList(): Promise<
  { url: string; title: string; date: string }[]
> {
  const res = await fetch(SENDUNGEN_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`WDR Seite nicht erreichbar: ${res.status}`);

  const html = await res.text();
  const episodes: { url: string; title: string; date: string }[] = [];
  const seen = new Set<string>();

  // Featured episode on the homepage.
  // WDR occasionally shows a stale archive URL further down the page while the
  // current episode only exists in the hero block.
  const featuredMatch = html.match(
    /<h2 class="conHeadline">\s*Sendung vom (\d{2})\.(\d{2})\.(\d{4})\s*<\/h2>[\s\S]*?<a href="(https?:\/\/www\.ardmediathek\.de\/video\/hart-aber-fair\/[^"]+)"[^>]*title="([^"]+)"/i,
  );

  if (featuredMatch) {
    const [, day, month, year, featuredUrl, featuredTitle] = featuredMatch;
    episodes.push({
      url: featuredUrl,
      title: decodeHtmlEntities(featuredTitle).trim(),
      date: `${year}-${month}-${day}`,
    });
    seen.add(`${year}-${month}-${day}`);
  }

  // Archive link pattern:
  // <a href="/daserste/hartaberfair/sendungen/..." title="Titel (DD.MM.YYYY)">
  const linkRegex =
    /href="(\/daserste\/hartaberfair\/sendungen\/[^"]+\.html)"[^>]*title="([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const relUrl = match[1];
    const titleRaw = match[2];

    // Überspringe CSS/Feed/AMP-Dateien
    if (/\.(css|feed|amp)/.test(relUrl)) continue;
    // Überspringe index.html selbst
    if (relUrl.endsWith("/index.html")) continue;
    if (seen.has(relUrl)) continue;
    seen.add(relUrl);

    // Datum aus Titel extrahieren: "(DD.MM.YYYY)"
    const dateMatch = titleRaw.match(/\((\d{2})\.(\d{2})\.(\d{4})\)/);
    const date = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : "";

    if (date && seen.has(date)) continue;

    const title = titleRaw.replace(/\s*\(\d{2}\.\d{2}\.\d{4}\)\s*$/, "").trim();
    const url = `${BASE_URL}${relUrl}`;

    episodes.push({ url, title, date });
    if (date) seen.add(date);
  }

  // Neueste zuerst
  return episodes.sort((a, b) => b.date.localeCompare(a.date));
}

// ─────────────────────────────────────────────
// ARD Mediathek URL + Beschreibung aus einer Episodenseite holen
// Kein Browser nötig – OG Meta-Tags sind serverseitig gerendert
// ─────────────────────────────────────────────
async function fetchEpisodeDetails(
  episodeUrl: string,
): Promise<{ ardUrl: string; description: string; guestNames: string[] }> {
  try {
    const isArdUrl = episodeUrl.includes("ardmediathek.de/video/");
    const detailsUrl = isArdUrl ? SENDUNGEN_URL : episodeUrl;

    const res = await fetch(detailsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`⚠️  Episodenseite nicht erreichbar (${res.status}): ${detailsUrl}`);
      return { ardUrl: "", description: "", guestNames: [] };
    }

    const html = await res.text();

    const guestNames = extractGuestNamesFromHtml(html);
    const pageDescription = extractEpisodeDescriptionFromHtml(html);
    const wdrArdUrl = extractArdUrlFromHtml(html);
    const ardUrl = isArdUrl ? episodeUrl : wdrArdUrl;

    let description = pageDescription;

    // Beschreibung: OG-Description von der ARD-Mediathek-Seite holen
    if (ardUrl) {
      const ardDescription = await fetchArdDescription(ardUrl);
      if (
        ardDescription &&
        !/Das Polit-Talkmagazin im Ersten mit Louis Klamroth/i.test(ardDescription)
      ) {
        description = ardDescription;
      }
    }

    return { ardUrl, description, guestNames };
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${episodeUrl}:`, error);
    return { ardUrl: "", description: "", guestNames: [] };
  }
}

function extractArdUrlFromHtml(html: string): string {
  const ardMatches = [
    ...html.matchAll(
      /href="(https?:\/\/www\.ardmediathek\.de\/video\/hart-aber-fair\/[^"]+)"/g,
    ),
  ];

  return (
    ardMatches.find((m) => m[1].includes("/das-erste/"))?.[1] ||
    ardMatches[0]?.[1] ||
    ""
  );
}

function extractEpisodeDescriptionFromHtml(html: string): string {
  const paragraphPatterns = [
    /<p class="teasertext">\s*([^<][\s\S]*?)\s*&nbsp;\|\s*&nbsp;\s*<strong>(?:video|mehr)<\/strong>\s*<\/p>/i,
    /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
  ];

  for (const pattern of paragraphPatterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    const text = decodeHtmlEntities(stripHtml(match[1])).trim();
    if (text) return text;
  }

  return "";
}

function extractGuestNamesFromHtml(html: string): string[] {
  const guestSectionMatch = html.match(
    /<h2 class="conHeadline">\s*Gäste\s*<\/h2>([\s\S]*?)(?:<h2 class="conHeadline">|<\/body>)/i,
  );
  const guestSection = guestSectionMatch?.[1] ?? html;
  const names = new Set<string>();

  for (const match of guestSection.matchAll(
    /<h4[^>]*class="headline"[^>]*>\s*([\s\S]*?)\s*<\/h4>/g,
  )) {
    const text = decodeHtmlEntities(stripHtml(match[1]))
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 3) continue;
    if (/^(Gäste|Diskutieren Sie mit!|Gästebuch)$/i.test(text)) continue;
    if (text.includes("Sendung vom")) continue;

    names.add(text);
  }

  return [...names].map(normalizeGuestName);
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function normalizeGuestName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/,\s*(SPD|CDU|CSU|FDP|AfD|BSW|Die Linke|Bündnis 90\/Die Grünen|Grüne)$/i, "")
    .trim();
}

// Beschreibung via OG Meta-Tag von der ARD Mediathek holen
async function fetchArdDescription(ardUrl: string): Promise<string> {
  try {
    const res = await fetch(ardUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) return "";

    const html = await res.text();

    const match = html.match(
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
    );
    if (match) return decodeHtmlEntities(match[1]);

    const fallback = html.match(
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
    );
    return fallback ? decodeHtmlEntities(fallback[1]) : "";
  } catch {
    return "";
  }
}

// HTML-Entities dekodieren (z. B. &amp; → &)
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
// Politiker für eine Episode prüfen & strukturiert zurückgeben
// ─────────────────────────────────────────────
async function processPoliticians(guestNames: string[]) {
  const politicians = [];

  for (const name of guestNames) {
    const details = await checkPolitician(name);

    if (details.isPolitician && details.politicianId && details.politicianName) {
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

// ─────────────────────────────────────────────
// Hauptfunktion: Inkrementeller Crawl
// Holt nur Episoden die noch nicht in Supabase sind
// ─────────────────────────────────────────────
export default async function crawlHartAberFair(): Promise<void> {
  console.log("🚀 Starte Hart aber fair Crawler...");

  const existingDates = await getExistingEpisodeDates("Hart aber fair");
  console.log(`📅 Bereits ${existingDates.size} Episoden in DB vorhanden`);

  // Alle Episoden von der Sendungsseite holen
  const allEpisodes = await fetchEpisodeList();
  console.log(`📋 ${allEpisodes.length} Episoden auf der Sendungsseite gefunden`);

  // Nur neue Episoden (nicht in DB)
  const newEpisodes = allEpisodes.filter(
    (ep) => ep.date && !existingDates.has(ep.date),
  );

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden – alles aktuell!");
    return;
  }

  console.log(`\n🔄 ${newEpisodes.length} neue Episoden zu verarbeiten...\n`);

  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;
  const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] = [];

  // Älteste zuerst verarbeiten
  const sortedEpisodes = [...newEpisodes].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  for (const ep of sortedEpisodes) {
    try {
      console.log(`\n🎬 Verarbeite: ${ep.title} (${ep.date})`);

      // Beschreibung + ARD-URL von der Episodenseite holen
      const { ardUrl, description, guestNames: htmlGuestNames } =
        await fetchEpisodeDetails(ep.url);

      // Bevorzuge direkte HTML-Gästeliste. AI ist nur Fallback.
      const guestNames =
        htmlGuestNames.length > 0
          ? htmlGuestNames
          : await extractGuestsWithAI(description || ep.title);

      console.log(`   👥 Gäste: ${guestNames.join(", ") || "–"}`);
      console.log(`   🔗 ARD URL: ${ardUrl || "–"}`);

      if (guestNames.length === 0) {
        console.log(`   ⚠️  Keine Gäste gefunden – überspringe`);
        continue;
      }

      // Politische Themenbereiche
      const politicalAreaIds = await getPoliticalArea(description);

      // Politiker prüfen
      const politicians = await processPoliticians(guestNames);

      if (politicians.length > 0) {
        console.log(
          `   ✅ Politiker: ${politicians.map((p) => `${p.politicianName} (${p.partyName || "?"})`).join(", ")}`,
        );

        const inserted = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Hart aber fair",
          ep.date,
          politicians,
        );
        totalPoliticiansInserted += inserted;
      }

      // Episode-URL speichern (ARD Mediathek URL bevorzugt, fallback auf WDR-URL)
      episodeLinksToInsert.push({
        episodeUrl: ardUrl || ep.url,
        episodeDate: ep.date,
      });

      // Politische Themenbereiche speichern
      if (politicalAreaIds?.length) {
        await insertEpisodePoliticalAreas(
          "Hart aber fair",
          ep.date,
          politicalAreaIds,
        );
      }

      episodesProcessed++;

      // Kurze Pause zwischen Seiten-Requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Fehler beim Verarbeiten von ${ep.date}:`, error);
    }
  }

  // Episode-URLs batch-speichern
  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Hart aber fair",
      episodeLinksToInsert,
    );
  }

  console.log(`\n=== Hart aber fair Zusammenfassung ===`);
  console.log(`Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}
