import {
  getExistingEpisodeDates,
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  extractGuestsWithAI,
  getPoliticalArea,
} from "../lib/utils.js";
import axios from "axios";
import * as cheerio from "cheerio";

interface EpisodeLink {
  wdrUrl: string;
  title: string;
  date: string;
  ardUrl?: string;
  guestNames?: string[];
}

interface EpisodeDetails {
  title: string;
  date: string;
  description: string;
  politicians: Array<{
    name: string;
    party?: string;
    role?: string;
  }>;
  url?: string; // Add url to details
}

const LIST_URL = "https://www1.wdr.de/daserste/hartaberfair/index.html";
const BASE_URL = "https://www1.wdr.de";

function extractLatestEpisodeFromHomepage(
  $: cheerio.CheerioAPI,
): EpisodeDetails | null {
  // 1. Extract Date
  let date = "";
  let headingText = "";
  $('h2.conHeadline').each((_, el) => {
    const text = $(el).text();
    if (text.includes("Sendung vom")) {
      headingText = text;
      return false; // break
    }
  });

  if (!headingText) return null;

  const dateMatch = headingText.match(/vom (\d{2}\.\d{2}\.\d{4})/);
  if (!dateMatch) return null;

  const [day, month, year] = dateMatch[1].split(".");
  date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  // 2. Extract Title & Description (Main Stage)
  const stage = $(".modA.modStage .teaser").first();
  if (stage.length === 0) return null;

  const titleElement = stage.find("h4.headline");
  let title = titleElement.text().trim();
  title = title.replace(/^Video:\s*/, "").trim();

  const descriptionElement = stage.find(".teasertext");
  const description = descriptionElement.text().trim();

  // Extract URL
  const linkEl = stage.find("a").first();
  const url = linkEl.attr("href") || "";

  // 3. Extract Guests
  const politicians: Array<{
    name: string;
    party?: string;
    role?: string;
  }> = [];

  // Find the "Gäste" section
  let guestSection: any = null;
  $('h2.conHeadline').each((_: number, el: any) => {
    if ($(el).text().trim().includes("Gäste")) {
      guestSection = $(el).closest(".section");
      return false; // break
    }
  });

  if (guestSection && guestSection.length > 0) {
    const guestTeasers = guestSection.find(".box .teaser");
    guestTeasers.each((_: number, teaser: any) => {
      const headline = $(teaser).find("h4.headline");
      const preHeadline = headline.attr("data-pre-headline");
      const subHeadline = $(teaser).find(".teasertext");

      if (headline.length > 0) {
        let fullName = headline.text().trim();
        let party = "";
        let role = preHeadline || "";

        // Handle "Name, Party" format
        if (fullName.includes(",")) {
          const parts = fullName.split(",");
          fullName = parts[0].trim();
          party = parts[1].trim();
        }

        // Fallback for role if not in data-attribute
        if (!role && subHeadline.length > 0) {
          const text = subHeadline.text().trim();
          role = text.replace(/\|\s*mehr$/, "").trim();
        }

        if (fullName && fullName.length > 2) {
          const exists = politicians.some((p) => p.name === fullName);
          if (!exists) {
            politicians.push({ name: fullName, party, role });
          }
        }
      }
    });
  }

  return {
    title,
    date,
    description,
    politicians,
    url: url,
  };
}

function extractArchiveLinks($: cheerio.CheerioAPI): EpisodeLink[] {
  const episodes: EpisodeLink[] = [];

  $('h2.conHeadline').each((_: number, el: any) => {
    const headingText = $(el).text();
    if (
      headingText.includes("Die letzten HART ABER FAIR-Sendungen") ||
      headingText.includes("Weitere Folgen")
    ) {
      const parentSection = $(el).closest(".section");
      if (parentSection.length > 0) {
        const links = parentSection.find(".box .teaser a");
        links.each((_: number, link: any) => {
          const href = $(link).attr("href");
          const titleEl = $(link).find("h4.headline");
          let title = titleEl.text().trim();
          title = title.replace(/^Video:\s*/, "").trim();

          const dateMatch = title.match(/\((\d{2}\.\d{2}\.\d{4})\)/);
          let date = "";

          if (dateMatch) {
            const [day, month, year] = dateMatch[1].split(".");
            date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          if (href && title) {
            episodes.push({
              wdrUrl: href,
              title: title.replace(/\s*\(\d{2}\.\d{2}\.\d{4}\)\s*$/, "").trim(),
              date: date,
            });
          }
        });
      }
    }
  });

  return episodes.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return b.date.localeCompare(a.date);
  });
}

function extractEpisodeDetails(
  html: string,
  episodeLink: EpisodeLink,
): EpisodeDetails | null {
  try {
    const $ = cheerio.load(html);

    let title = $("h1").first().text().trim() || "";
    if (!title) {
      title = $("h2.conHeadline").first().text().trim() || "";
    }
    title = title.replace(/^Video:\s*/, "").trim();

    let date = episodeLink.date;
    if (!date) {
      const dateEl = $(".mediaDate");
      if (dateEl.length > 0) {
        const match = dateEl.text().match(/(\d{2}\.\d{2}\.\d{4})/);
        if (match) {
          const [day, month, year] = match[1].split(".");
          date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }
    }

    // Fallback for date matching from title within page
    if (!date) {
      const match = title.match(/\((\d{2}\.\d{2}\.\d{4})\)/);
      if (match) {
        const [day, month, year] = match[1].split(".");
        date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    let description = "";
    const descSelectors = [
      ".teasertext",
      ".textWrapper p",
      ".mod .text p",
      "p.programInfo + p",
    ];

    for (const selector of descSelectors) {
      const descElement = $(selector).first();
      if (descElement.length > 0 && descElement.text().trim()) {
        description = descElement.text().trim();
        break;
      }
    }

    const politicians: Array<{
      name: string;
      party?: string;
      role?: string;
    }> = [];
    
    let gaesteSectionHeadline: any = null;
    $("h2").each((_: number, el: any) => {
      if ($(el).text().includes("Gäste")) {
        gaesteSectionHeadline = $(el);
        return false; // break
      }
    });

    if (gaesteSectionHeadline && gaesteSectionHeadline.length > 0) {
      const container =
        gaesteSectionHeadline.closest(".section").length > 0
          ? gaesteSectionHeadline.closest(".section")
          : gaesteSectionHeadline.parent();
          
      if (container && container.length > 0) {
        const teasers = container.find(".teaser");
        teasers.each((_: number, t: any) => {
          const h4 = $(t).find("h4");
          if (h4.length > 0) {
            let fullName = h4.text().trim();
            let party = "";
            let role = h4.attr("data-pre-headline") || "";

            if (fullName.includes(",")) {
              const parts = fullName.split(",");
              fullName = parts[0].trim();
              party = parts[1].trim();
            }

            // If role is empty, check teaser text
            if (!role) {
              const tt = $(t).find(".teasertext");
              if (tt.length > 0) {
                role = tt.text().replace(/\|\s*mehr$/, "").trim();
              }
            }

            if (fullName.length > 2) {
              const exists = politicians.some((p) => p.name === fullName);
              if (!exists) {
                politicians.push({ name: fullName, party, role });
              }
            }
          }
        });
      }
    }

    return { title, date, description, politicians };
  } catch (error) {
    console.error(`Fehler beim Extrahieren der Episode-Details:`, error);
    return null;
  }
}


// ─────────────────────────────────────────────
// ARD Mediathek URL + Beschreibung aus einer Episodenseite holen
// Kein Browser nötig – OG Meta-Tags sind serverseitig gerendert
// ─────────────────────────────────────────────
async function fetchEpisodeDetails(
  wdrUrl: string,
): Promise<{ ardUrl: string; description: string }> {
  try {
    const res = await fetch(wdrUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`⚠️  Episodenseite nicht erreichbar (${res.status}): ${wdrUrl}`);
      return { ardUrl: "", description: "" };
    }

    const html = await res.text();

    // ARD Mediathek URL (bevorzuge "das-erste"-Variante)
    const ardMatches = [
      ...html.matchAll(
        /href="(https?:\/\/www\.ardmediathek\.de\/video\/hart-aber-fair\/[^"]+)"/g,
      ),
    ];
    const ardUrl =
      ardMatches.find((m) => m[1].includes("/das-erste/"))?.[1] ||
      ardMatches[0]?.[1] ||
      "";

    // Beschreibung: OG-Description von der ARD-Mediathek-Seite holen
    let description = "";
    if (ardUrl) {
      description = await fetchArdDescription(ardUrl);
    }

    // Fallback: OG-Description der WDR-Seite
    if (!description) {
      const og = html.match(
        /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
      );
      description = og ? decodeHtmlEntities(og[1]) : "";
    }

    return { ardUrl, description };
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${wdrUrl}:`, error);
    return { ardUrl: "", description: "" };
  }
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

// Hilfsfunktion: Hole alle bekannten Episode-Links von der Sendungsseite
async function fetchEpisodeList(): Promise<Array<EpisodeLink>> {
  try {
    const res = await axios.get(LIST_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 30000,
    });
    const html = res.data;
    const $ = cheerio.load(html);

    const episodesToProcess: EpisodeLink[] = [];

    const latestEpisode = extractLatestEpisodeFromHomepage($);
    if (latestEpisode && latestEpisode.date) {
      episodesToProcess.push({
        wdrUrl: LIST_URL,
        ardUrl: latestEpisode.url || undefined,
        title: latestEpisode.title,
        date: latestEpisode.date,
        guestNames: latestEpisode.politicians.map((guest) => guest.name),
      });
    }

    const archiveLinks = extractArchiveLinks($);
    for (const link of archiveLinks) {
      if (link.date && !episodesToProcess.find((e) => e.date === link.date)) {
        episodesToProcess.push({
          wdrUrl: link.wdrUrl.startsWith("http")
            ? link.wdrUrl
            : `${BASE_URL}${link.wdrUrl}`,
          title: link.title,
          date: link.date,
        });
      }
    }

    return episodesToProcess.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("Fehler beim Abrufen der Episodenliste:", error);
    return [];
  }
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

      let structuredDetails: EpisodeDetails | null = null;
      if (!ep.guestNames || ep.guestNames.length === 0) {
        const fullUrl = ep.wdrUrl.startsWith("http")
          ? ep.wdrUrl
          : `${BASE_URL}${ep.wdrUrl}`;

        console.log(`   📥 Lade WDR Episodenseite: ${fullUrl}`);
        const res = await axios.get(fullUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 30000,
        });
        structuredDetails = extractEpisodeDetails(res.data, ep);
      }

      // Beschreibung + ARD-URL von der Episodenseite holen
      const fetchedDetails = await fetchEpisodeDetails(ep.wdrUrl);
      const ardUrl = ep.ardUrl || fetchedDetails.ardUrl;
      const description =
        fetchedDetails.description || structuredDetails?.description || "";

      const scrapedGuestNames = [
        ...(ep.guestNames || []),
        ...((structuredDetails?.politicians || []).map((guest) => guest.name)),
      ].filter((name, index, arr) => Boolean(name) && arr.indexOf(name) === index);

      const guestNames =
        scrapedGuestNames.length > 0
          ? scrapedGuestNames
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
        episodeUrl: ardUrl || ep.wdrUrl,
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
