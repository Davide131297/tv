import {
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  getLatestEpisodeDate,
} from "../lib/utils.js";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  parseISODateFromUrl,
  extractDateISO,
  seemsLikePersonName,
  acceptCookieBanner,
  gentleScroll,
  GuestWithRole,
  GuestDetails,
  EpisodeResult,
} from "../lib/crawler-utils.js";
import { Page } from "puppeteer";
import { getPoliticalArea } from "../lib/utils.js";
import {
  fetchZdfSeasonEpisodes,
  fetchZdfEpisodeHtml,
  parseZdfEpisodeHtml,
  ZdfEpisode,
  ZdfSeasonResult
} from "../lib/zdf-api.js";

const LIST_URL = `https://www.zdf.de/talk/markus-lanz-114?staffel=$%7BcurrentYear%7D`;

// ---------------- Puppeteer Fallback Functions (Original Code) ----------------

async function clickLoadMoreUntilDone(
  page: Page,
  latestDbDate: string | null,
  maxClicks = 100,
) {
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  let currentCount = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (els) => els.length,
  );

  if (latestDbDate) {
    const currentUrls = await page.$$eval(
      'a[href^="/video/talk/markus-lanz-114/"]',
      (as) => as.map((a) => (a as HTMLAnchorElement).href),
    );

    let oldestVisibleDate: string | null = null;

    for (const url of currentUrls) {
      const urlDate = parseISODateFromUrl(url);
      if (urlDate) {
        if (!oldestVisibleDate || urlDate < oldestVisibleDate) {
          oldestVisibleDate = urlDate;
        }
      }
    }

    if (oldestVisibleDate && oldestVisibleDate <= latestDbDate) {
      return;
    }
  }

  for (let i = 0; i < maxClicks; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const hasButton = await page.$('[data-testid="pagination-button"]');

    if (hasButton) {
      await hasButton.scrollIntoView();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const [response] = await Promise.all([
          page.waitForResponse(
            (res) =>
              res.url().includes("graphql") &&
              res.url().includes("seasonByCanonical"),
            { timeout: 15000 },
          ),
          hasButton.click(),
        ]);
        void response;
      } catch {
        await hasButton.click();
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      for (let scroll = 0; scroll < 5; scroll++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const newCount = await page.$$eval(
      'a[href^="/video/talk/markus-lanz-114/"]',
      (els) => els.length,
    );

    if (latestDbDate && newCount > currentCount) {
      const currentUrls = await page.$$eval(
        'a[href^="/video/talk/markus-lanz-114/"]',
        (as) => as.map((a) => (a as HTMLAnchorElement).href),
      );

      let oldestVisibleDate: string | null = null;

      for (const url of currentUrls) {
        const urlDate = parseISODateFromUrl(url);
        if (urlDate) {
          if (!oldestVisibleDate || urlDate < oldestVisibleDate) {
            oldestVisibleDate = urlDate;
          }
        }
      }

      if (oldestVisibleDate && oldestVisibleDate <= latestDbDate) {
        break;
      }
    }

    if (newCount <= currentCount) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const finalCheck = await page.$$eval(
        'a[href^="/video/talk/markus-lanz-114/"]',
        (els) => els.length,
      );
      if (finalCheck <= currentCount) {
        break;
      }
      currentCount = finalCheck;
    } else {
      currentCount = newCount;
    }
  }
}

async function collectEpisodeLinks(page: Page) {
  const urls = await page.$$eval(
    'a[href^="/video/talk/markus-lanz-114/"]',
    (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))),
  );
  return urls;
}

async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string,
): Promise<GuestWithRole[]> {
  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  await gentleScroll(page);

  let guestsWithRoles: GuestWithRole[] = await page
    .$$eval('section[tabindex="0"] p b, section.tdeoflm p b', (els) =>
      Array.from(
        new Set(
          els
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .filter((t) => t.includes(","))
            .map((t) => {
              const parts = t.split(",");
              return {
                name: parts[0].trim(),
                role: parts.slice(1).join(",").trim() || undefined,
              };
            }),
        ),
      ),
    )
    .catch(() => []);

  if (!guestsWithRoles.length) {
    guestsWithRoles = await page
      .$$eval("main b", (els) =>
        Array.from(
          new Set(
            els
              .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
              .filter(Boolean)
              .filter((t) => t.includes(","))
              .map((t) => {
                const parts = t.split(",");
                return {
                  name: parts[0].trim(),
                  role: parts.slice(1).join(",").trim() || undefined,
                };
              }),
          ),
        ),
      )
      .catch(() => []);
  }

  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Markus Lanz"]',
        (el) => el.getAttribute("alt") || "",
      )
      .catch(() => "");
    if (alt && alt.includes(":")) {
      const list = alt
        .split(":")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      guestsWithRoles = list.map((name) => ({ name, role: undefined }));
    }
  }

  const filteredGuests = guestsWithRoles.filter((guest) =>
    seemsLikePersonName(guest.name),
  );

  const uniqueGuests = filteredGuests.reduce(
    (acc: GuestWithRole[], current) => {
      const existing = acc.find((guest) => guest.name === current.name);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    },
    [],
  );

  return uniqueGuests;
}

async function extractEpisodeDescription(page: Page): Promise<string | null> {
  try {
    const selectors = [
      'p[data-testid="short-description"]',
      "p.daltwma",
      "p.dfv1fla",
      "section p:not(:empty)",
    ];

    let description: string | null = null;

    for (const selector of selectors) {
      description = await page
        .$eval(selector, (el) => {
          const text = (el.textContent || "").trim();
          if (
            text.length < 20 ||
            text.includes("Abspielen") ||
            text.includes("Merken")
          ) {
            return null;
          }
          return text;
        })
        .catch(() => null);

      if (description) {
        break;
      }
    }

    return description;
  } catch (error) {
    console.warn(`Fehler beim Extrahieren der Episode-Beschreibung:`, error);
    return null;
  }
}

async function CrawlLanzPuppeteer(latestEpisodeDate: string | null) {
  console.log("Starting Lanz Crawling with Puppeteer fallback...");
  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

    await acceptCookieBanner(page);

    await clickLoadMoreUntilDone(page, latestEpisodeDate);

    const episodeUrls = await collectEpisodeLinks(page);

    if (!episodeUrls.length) {
      return {
        message: "Keine Episoden-Links gefunden",
        status: 404,
      };
    }

    let filteredUrls = episodeUrls;
    if (latestEpisodeDate) {
      filteredUrls = episodeUrls.filter((url) => {
        const urlDate = parseISODateFromUrl(url);
        return urlDate && urlDate > latestEpisodeDate;
      });
      console.log(
        `Nach Datum-Filter: ${filteredUrls.length}/${episodeUrls.length} URLs (nur neuer als ${latestEpisodeDate})`,
      );
    }

    if (!filteredUrls.length) {
      console.log("Keine neuen Episoden zu crawlen gefunden");
      return {
        message: "Keine neuen Episoden zu crawlen gefunden",
        status: 200,
      };
    }

    const byDate = new Map<string, EpisodeResult>();

    const batchSize = 3;
    const results: EpisodeResult[] = [];

    for (let i = 0; i < filteredUrls.length; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const p = await setupSimplePage(browser);
          try {
            const [guests, date, description] = await Promise.all([
              extractGuestsFromEpisode(p, url),
              extractDateISO(p, url),
              extractEpisodeDescription(p),
            ]);

            const guestsDetailed: GuestDetails[] = [];
            for (const guest of guests) {
              const details = await checkPolitician(guest.name, guest.role);
              guestsDetailed.push(details);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            const guestNames = guests.map((g) => g.name);

            if (date) {
              const foundPoliticians = guestsDetailed.filter(
                (g) => g.isPolitician && g.politicianId,
              );
              console.log(
                `📅 ${date} | 👥 ${guestNames.join(", ")}${
                  foundPoliticians.length > 0
                    ? ` | ✅ Politiker: ${foundPoliticians
                        .map(
                          (p) => `${p.politicianName} (${p.partyName || "?"})`,
                        )
                        .join(", ")}`
                    : ""
                }`,
              );
            }

            const res: EpisodeResult = {
              episodeUrl: url,
              date,
              guests: guestNames,
              guestsDetailed,
              description: description || undefined,
            };

            if (date) {
              const prev = byDate.get(date);
              if (!prev || guestNames.length > prev.guests.length) {
                byDate.set(date, res);
              }
            }

            return res;
          } catch (e) {
            console.warn("Fehler bei Episode:", url, e);
            return {
              episodeUrl: url,
              date: null,
              guests: [],
              guestsDetailed: [],
            };
          } finally {
            await p.close().catch(() => {});
          }
        }),
      );

      results.push(...batchResults);

      if (i + batchSize < filteredUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const finalResults =
      byDate.size > 0 ? Array.from(byDate.values()) : results;

    return finalResults;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------- Database Storage Function (Shared) ----------------

async function storeEpisodesInDb(finalResults: EpisodeResult[]) {
  finalResults.sort((a: EpisodeResult, b: EpisodeResult) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  let totalPoliticiansInserted = 0;
  let totalPoliticalAreasInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesWithPoliticians = 0;

  const episodeLinksToInsert = finalResults
    .filter((episode) => {
      if (!episode.date) return false;
      const hasPoliticians = episode.guestsDetailed.some(
        (guest) => guest.isPolitician && guest.politicianId,
      );
      return hasPoliticians;
    })
    .map((episode) => ({
      episodeUrl: episode.episodeUrl,
      episodeDate: episode.date!,
    }));

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Markus Lanz",
      episodeLinksToInsert,
    );
  }

  for (const episode of finalResults) {
    if (!episode.date) continue;

    const politicians = episode.guestsDetailed
      .filter((guest) => guest.isPolitician && guest.politicianId)
      .map((guest) => ({
        politicianId: guest.politicianId!,
        politicianName: guest.politicianName || guest.name,
        partyId: guest.party,
        partyName: guest.partyName,
      }));

    if (politicians.length > 0) {
      let politicalAreaIds: number[] = [];
      if (episode.description) {
        const areas = await getPoliticalArea(episode.description);
        politicalAreaIds = areas || [];
      }

      const inserted = await insertMultipleTvShowPoliticians(
        "ZDF",
        "Markus Lanz",
        episode.date,
        politicians,
      );

      totalPoliticiansInserted += inserted;
      episodesWithPoliticians++;

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        const insertedAreas = await insertEpisodePoliticalAreas(
          "Markus Lanz",
          episode.date,
          politicalAreaIds,
        );

        totalPoliticalAreasInserted += insertedAreas;
      }
    }
  }

  console.log(`\n=== Datenbank-Speicherung Zusammenfassung ===`);
  console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
  console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);
  console.log(
    `Politische Themenbereiche gesamt eingefügt: ${totalPoliticalAreasInserted}`,
  );
  console.log(`Episode-URLs gesamt eingefügt: ${totalEpisodeLinksInserted}`);
}

// ---------------- Primary GraphQL / API Crawler ----------------

async function CrawlLanzAPI(latestEpisodeDate: string | null): Promise<EpisodeResult[]> {
  console.log("Starting Lanz Crawling with API-mode...");
  
  // 1) Fetch season episodes from GraphQL API
  // We can fetch up to 3 pages if the oldest episode is still newer than the latest DB date
  const allApiEpisodes: ZdfEpisode[] = [];
  let hasNext = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNext && pageCount < 5) {
    const pageResult: ZdfSeasonResult = await fetchZdfSeasonEpisodes("markus-lanz-114", 0, cursor || undefined);
    allApiEpisodes.push(...pageResult.episodes);
    
    // Check if we need to load more
    if (latestEpisodeDate && pageResult.episodes.length > 0) {
      const oldestEpisode = pageResult.episodes[pageResult.episodes.length - 1];
      const oldestDate = oldestEpisode.editorialDate ? oldestEpisode.editorialDate.substring(0, 10) : null;
      if (oldestDate && oldestDate <= latestEpisodeDate) {
        console.log(`Oldest episode in current page (${oldestDate}) is older than or equal to latest DB date (${latestEpisodeDate}). Stopping pagination.`);
        break;
      }
    }
    
    hasNext = pageResult.hasNextPage;
    cursor = pageResult.endCursor;
    pageCount++;
  }

  console.log(`Fetched ${allApiEpisodes.length} episodes from API across ${pageCount} page(s).`);

  // 2) Filter new episodes
  let filteredEpisodes = allApiEpisodes;
  if (latestEpisodeDate) {
    filteredEpisodes = allApiEpisodes.filter((ep) => {
      const date = ep.editorialDate ? ep.editorialDate.substring(0, 10) : null;
      return date && date > latestEpisodeDate;
    });
    console.log(
      `Nach Datum-Filter: ${filteredEpisodes.length}/${allApiEpisodes.length} Episoden (nur neuer als ${latestEpisodeDate})`,
    );
  }

  if (!filteredEpisodes.length) {
    console.log("Keine neuen Episoden zu crawlen gefunden.");
    return [];
  }

  const byDate = new Map<string, EpisodeResult>();
  const results: EpisodeResult[] = [];

  // 3) Process new episodes in batches using direct HTTP fetches & Cheerio
  const batchSize = 5; // We can use larger batches since this is just HTTP + Cheerio (not Puppeteer)
  for (let i = 0; i < filteredEpisodes.length; i += batchSize) {
    const batch = filteredEpisodes.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (episode) => {
        try {
          const date = episode.editorialDate ? episode.editorialDate.substring(0, 10) : null;
          console.log(`Processing episode: ${episode.sharingUrl} (${date})`);

          // Fetch individual episode HTML
          const html = await fetchZdfEpisodeHtml(episode.sharingUrl);
          
          // Parse guests & description
          const parsed = parseZdfEpisodeHtml("lanz", html);
          
          const guestsDetailed: GuestDetails[] = [];
          for (const guest of parsed.guests) {
            const details = await checkPolitician(guest.name, guest.role);
            guestsDetailed.push(details);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const guestNames = parsed.guests.map((g) => g.name);

          if (date) {
            const foundPoliticians = guestsDetailed.filter(
              (g) => g.isPolitician && g.politicianId,
            );
            console.log(
              `📅 ${date} | 👥 ${guestNames.join(", ")}${
                foundPoliticians.length > 0
                  ? ` | ✅ Politiker: ${foundPoliticians
                      .map(
                        (p) => `${p.politicianName} (${p.partyName || "?"})`,
                      )
                      .join(", ")}`
                  : ""
              }`,
            );
          }

          const res: EpisodeResult = {
            episodeUrl: episode.sharingUrl,
            date,
            guests: guestNames,
            guestsDetailed,
            description: parsed.description || episode.description || undefined,
          };

          if (date) {
            const prev = byDate.get(date);
            if (!prev || guestNames.length > prev.guests.length) {
              byDate.set(date, res);
            }
          }

          return res;
        } catch (e: any) {
          console.warn(`Fehler bei Episode ${episode.sharingUrl}:`, e.message);
          return {
            episodeUrl: episode.sharingUrl,
            date: episode.editorialDate ? episode.editorialDate.substring(0, 10) : null,
            guests: [],
            guestsDetailed: [],
          };
        }
      })
    );

    results.push(...batchResults);
    if (i + batchSize < filteredEpisodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return byDate.size > 0 ? Array.from(byDate.values()) : results;
}

// ---------------- Entry Point ----------------

export default async function CrawlLanz() {
  const latestEpisodeDate = await getLatestEpisodeDate("Markus Lanz");

  try {
    // Attempt API-only crawl first
    const apiResults = await CrawlLanzAPI(latestEpisodeDate);
    
    if (apiResults.length > 0) {
      await storeEpisodesInDb(apiResults);
    } else {
      console.log("API crawler successfully finished with no new episodes.");
    }

    return {
      message: "Lanz Crawling (API-mode) erfolgreich",
      status: 200,
    };
  } catch (error: any) {
    console.error("API-based CrawlLanz failed. Falling back to Puppeteer...", error.message);
    
    try {
      const puppeteerResults = await CrawlLanzPuppeteer(latestEpisodeDate);
      
      if (Array.isArray(puppeteerResults) && puppeteerResults.length > 0) {
        await storeEpisodesInDb(puppeteerResults);
      }
      
      return {
        message: "Lanz Crawling (Puppeteer-fallback) erfolgreich",
        status: 200,
      };
    } catch (fallbackError: any) {
      console.error("Puppeteer fallback also failed:", fallbackError.message);
      return {
        message: "Fehler beim Lanz Crawling (inklusive Fallback)",
        status: 500,
      };
    }
  }
}
