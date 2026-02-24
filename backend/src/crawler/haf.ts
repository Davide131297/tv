import {
  getLatestEpisodeDate,
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
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

export default async function crawlHartAberFair() {
  console.log("=== Hart aber Fair Crawler gestartet ===");

  const currentYear = new Date().getFullYear();
  const latestEpisodeDate = await getLatestEpisodeDate("Hart aber fair");

  console.log(
    `Aktuelles Jahr: ${currentYear}, Neueste DB-Episode: ${latestEpisodeDate}`,
  );

  const browser = await createBrowser();

  // Stats
  let processedCount = 0;
  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;

  try {
    const page = await setupSimplePage(browser);

    // 1. Visit Homepage

    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 30000 });

    const episodesToProcess: EpisodeDetails[] = [];

    // 2. Get Latest Episode (Homepage)
    const latestEpisode = await extractLatestEpisodeFromHomepage(page);
    if (latestEpisode && latestEpisode.date) {
      // Simple logic: If we have a date, check if it's new
      // Ideally we also handle the URL better
      console.log(
        `Homepage-Episode: ${latestEpisode.title} (${latestEpisode.date})`,
      );

      const epYear = parseInt(latestEpisode.date.split("-")[0]);
      if (epYear >= currentYear) {
        if (!latestEpisodeDate || latestEpisode.date > latestEpisodeDate) {
          episodesToProcess.push(latestEpisode);
        } else {
          console.log(" -> Bereits in DB (überspringe)");
        }
      }
    }

    // 3. Get Archive Links
    const archiveLinks = await extractArchiveLinks(page);
    console.log(`${archiveLinks.length} Archiv-Links gefunden.`);

    const relevantArchiveLinks = archiveLinks.filter((ep) => {
      // If we don't have a date yet, we might need to visit to check.
      // But for efficiency, usually we trust the title date if present.
      if (ep.date) {
        const epYear = parseInt(ep.date.split("-")[0]);
        if (epYear < currentYear) return false;
        // Check against DB
        if (latestEpisodeDate && ep.date <= latestEpisodeDate) return false;
        return true;
      }
      return true; // If no date in title, visit it
    });

    console.log(
      `${relevantArchiveLinks.length} relevante Archiv-Links zum Prüfen.`,
    );

    // 4. Process Archive Links
    for (const link of relevantArchiveLinks) {
      // Duplicate check against homepage episode
      if (episodesToProcess.find((e) => e.date === link.date)) continue;

      const details = await extractEpisodeDetails(page, link);
      if (details && details.date) {
        const epYear = parseInt(details.date.split("-")[0]);
        if (epYear >= currentYear) {
          if (!latestEpisodeDate || details.date > latestEpisodeDate) {
            // Add URL if missing in details but present in link
            details.url = link.url;
            episodesToProcess.push(details);
          }
        }
      }
      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 5. Insert Data
    console.log(`\nVerarbeite ${episodesToProcess.length} neue Episoden...`);

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    for (const ep of episodesToProcess) {
      console.log(`\n🎬 Speichere: ${ep.title} (${ep.date})`);
      processedCount++;

      const politiciansToInsert: Array<{
        politicianId: number;
        politicianName: string;
        partyId?: number;
        partyName?: string;
      }> = [];

      for (const p of ep.politicians) {
        const pDetails = await checkPolitician(p.name, p.role);
        if (pDetails.isPolitician && pDetails.politicianId) {
          // Check for duplicate politicianId in the batch
          const alreadyInBatch = politiciansToInsert.some(
            (existing) => existing.politicianId === pDetails.politicianId,
          );

          if (!alreadyInBatch) {
            politiciansToInsert.push({
              politicianId: pDetails.politicianId,
              politicianName: pDetails.politicianName || p.name,
              partyId: pDetails.party,
              partyName: pDetails.partyName,
            });
            console.log(
              `   ✅ ${pDetails.politicianName} (${pDetails.partyName})`,
            );
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      let insertedCount = 0;
      if (politiciansToInsert.length > 0) {
        insertedCount = await insertMultipleTvShowPoliticians(
          "Das Erste",
          "Hart aber fair",
          ep.date,
          politiciansToInsert,
        );
        totalPoliticiansInserted += insertedCount;

        // Ensure URL is absolute for storage
        const finalUrl = ep.url
          ? ep.url.startsWith("http")
            ? ep.url
            : `${BASE_URL}${ep.url}`
          : LIST_URL;

        episodeLinksToInsert.push({
          episodeUrl: finalUrl,
          episodeDate: ep.date,
        });
      }

      // Topics
      if (ep.description) {
        const areaIds = await getPoliticalArea(ep.description);
        if (areaIds?.length) {
          await insertEpisodePoliticalAreas("Hart aber fair", ep.date, areaIds);
        }
      }
    }

    // 6. Insert Links (Batch)
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Hart aber fair",
        episodeLinksToInsert,
      );
    }

    console.log(`\n=== Crawling abgeschlossen ===`);
    console.log(`${processedCount} neue Episoden verarbeitet`);
    console.log(`${totalPoliticiansInserted} Politiker gesamt eingefügt`);
    console.log(`${totalEpisodeLinksInserted} Episode-URLs eingefügt`);
  } catch (error) {
    console.error("Critical Crawler Error:", error);
  } finally {
    await browser.close();
  }
}
