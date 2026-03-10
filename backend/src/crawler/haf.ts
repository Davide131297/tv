import {
  getExistingEpisodeDates,
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  extractGuestsWithAI,
} from "../lib/utils.js";
import { Page } from "puppeteer";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import { getPoliticalArea } from "../lib/utils.js";

interface EpisodeLink {
  url: string;
  title: string;
  date: string;
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

async function extractLatestEpisodeFromHomepage(
  page: Page,
): Promise<EpisodeDetails | null> {
  return await page.evaluate(() => {
    // 1. Extract Date
    const heading = document.querySelector("h2.conHeadline");
    if (!heading?.textContent?.includes("Sendung vom")) return null;

    const dateMatch = heading.textContent.match(/vom (\d{2}\.\d{2}\.\d{4})/);
    if (!dateMatch) return null;

    const [day, month, year] = dateMatch[1].split(".");
    const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // 2. Extract Title & Description (Main Stage)
    const stage = document.querySelector(".modA.modStage .teaser");
    if (!stage) return null;

    const titleElement = stage.querySelector("h4.headline");
    // Often "Video: Title" or similar, clean it
    let title = titleElement?.textContent?.trim() || "";
    title = title.replace(/^Video:\s*/, "").trim();

    const descriptionElement = stage.querySelector(".teasertext");
    const description = descriptionElement?.textContent?.trim() || "";

    // Extract URL
    const linkEl = stage.querySelector("a");
    const url = linkEl?.getAttribute("href") || "";

    // 3. Extract Guests
    const politicians: Array<{
      name: string;
      party?: string;
      role?: string;
    }> = [];

    // Find the "Gäste" section
    const sectionHeadlines = Array.from(
      document.querySelectorAll("h2.conHeadline"),
    );
    const guestHeadline = sectionHeadlines.find((h) =>
      h.textContent?.trim().includes("Gäste"),
    );

    if (guestHeadline) {
      const guestSection = guestHeadline.closest(".section");
      if (guestSection) {
        const guestTeasers = guestSection.querySelectorAll(".box .teaser");
        guestTeasers.forEach((teaser) => {
          const headline = teaser.querySelector("h4.headline");
          const preHeadline = headline?.getAttribute("data-pre-headline");
          const subHeadline = teaser.querySelector(".teasertext"); // Sometimes role is here

          if (headline) {
            let fullName = headline.textContent?.trim() || "";
            let party = "";
            let role = preHeadline || "";

            // Handle "Name, Party" format
            if (fullName.includes(",")) {
              const parts = fullName.split(",");
              fullName = parts[0].trim();
              party = parts[1].trim();
            }

            // Fallback for role if not in data-attribute
            if (!role && subHeadline) {
              const text = subHeadline.textContent?.trim() || "";
              // Remove "mehr" link text
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
    }

    return {
      title,
      date,
      description,
      politicians,
      url: url,
    };
  });
}

async function extractArchiveLinks(page: Page): Promise<EpisodeLink[]> {
  return await page.evaluate(() => {
    const episodes: EpisodeLink[] = [];

    // Look for "Die letzten HART ABER FAIR-Sendungen" or similar slider sections
    // or "Weitere Folgen"
    const headlines = Array.from(document.querySelectorAll("h2.conHeadline"));
    const archiveHeadlines = headlines.filter(
      (h) =>
        h.textContent?.includes("Die letzten HART ABER FAIR-Sendungen") ||
        h.textContent?.includes("Weitere Folgen"),
    );

    archiveHeadlines.forEach((archiveHeadline) => {
      const parentSection = archiveHeadline.closest(".section");
      if (parentSection) {
        const links = parentSection.querySelectorAll(".box .teaser a");
        links.forEach((link) => {
          const href = link.getAttribute("href");
          const titleEl = link.querySelector("h4.headline");
          let title = titleEl?.textContent?.trim() || "";
          title = title.replace(/^Video:\s*/, "").trim();

          const dateMatch = title.match(/\((\d{2}\.\d{2}\.\d{4})\)/);
          let date = "";

          if (dateMatch) {
            const [day, month, year] = dateMatch[1].split(".");
            date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          }

          if (href && title) {
            episodes.push({
              url: href,
              title: title.replace(/\s*\(\d{2}\.\d{2}\.\d{4}\)\s*$/, "").trim(),
              date: date,
            });
          }
        });
      }
    });

    // Sort desc
    return episodes.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
  });
}

async function extractEpisodeDetails(
  page: Page,
  episodeLink: EpisodeLink,
): Promise<EpisodeDetails | null> {
  try {
    const fullUrl = episodeLink.url.startsWith("http")
      ? episodeLink.url
      : `${BASE_URL}${episodeLink.url}`;

    await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });

    return await page.evaluate((initialDate) => {
      let title = document.querySelector("h1")?.textContent?.trim() || "";
      if (!title)
        title =
          document.querySelector("h2.conHeadline")?.textContent?.trim() || "";
      title = title.replace(/^Video:\s*/, "").trim();

      let date = initialDate;
      if (!date) {
        const dateEl = document.querySelector(".mediaDate");
        if (dateEl?.textContent) {
          const match = dateEl.textContent.match(/(\d{2}\.\d{2}\.\d{4})/);
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
        const descElement = document.querySelector(selector);
        if (descElement?.textContent?.trim()) {
          description = descElement.textContent.trim();
          break;
        }
      }

      const politicians: Array<{
        name: string;
        party?: string;
        role?: string;
      }> = [];
      const gaesteSectionHeadline = Array.from(
        document.querySelectorAll("h2"),
      ).find((h) => h.textContent?.includes("Gäste"));
      if (gaesteSectionHeadline) {
        const container =
          gaesteSectionHeadline.closest(".section") ||
          gaesteSectionHeadline.parentElement;
        if (container) {
          const teasers = container.querySelectorAll(".teaser");
          teasers.forEach((t) => {
            const h4 = t.querySelector("h4");
            if (h4) {
              let fullName = h4.textContent?.trim() || "";
              let party = "";
              // Try different attributes for role
              let role = h4.getAttribute("data-pre-headline") || "";

              if (fullName.includes(",")) {
                const parts = fullName.split(",");
                fullName = parts[0].trim();
                party = parts[1].trim();
              }

              // If role is empty, check teaser text but be careful
              if (!role) {
                const tt = t.querySelector(".teasertext");
                if (tt) {
                  role = tt.textContent?.replace(/\|\s*mehr$/, "").trim() || "";
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
    }, episodeLink.date);
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

// Hilfsfunktion: Hole alle bekannten Episode-Links von der Sendungsseite (via Browser)
async function fetchEpisodeList(): Promise<
  Array<{ url: string; title: string; date: string }>
> {
  const browser = await createBrowser();
  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 30000 });

    const episodesToProcess: Array<{ url: string; title: string; date: string }> = [];

    const latestEpisode = await extractLatestEpisodeFromHomepage(page);
    if (latestEpisode && latestEpisode.date) {
      episodesToProcess.push({
        url: latestEpisode.url ?? LIST_URL,
        title: latestEpisode.title,
        date: latestEpisode.date,
      });
    }

    const archiveLinks = await extractArchiveLinks(page);
    for (const link of archiveLinks) {
      if (link.date && !episodesToProcess.find((e) => e.date === link.date)) {
        episodesToProcess.push({
          url: link.url.startsWith("http") ? link.url : `${BASE_URL}${link.url}`,
          title: link.title,
          date: link.date,
        });
      }
    }

    return episodesToProcess.sort((a, b) => b.date.localeCompare(a.date));
  } finally {
    await browser.close().catch(() => {});
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

      // Beschreibung + ARD-URL von der Episodenseite holen
      const { ardUrl, description } = await fetchEpisodeDetails(ep.url);

      // Gäste mit AI aus Beschreibung extrahieren
      const guestNames = await extractGuestsWithAI(description || ep.title);

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
