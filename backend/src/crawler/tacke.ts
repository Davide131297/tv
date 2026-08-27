import { Page } from "puppeteer";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  getPoliticalArea,
  extractGuestsWithAI,
} from "../lib/utils.js";
import {
  parseISODateFromUrl,
  acceptCookieBanner,
  seemsLikePersonName,
  isModeratorOrHost,
  isExcludedEpisode,
  GuestWithRole,
  EpisodeResult,
  GuestDetails,
} from "../lib/crawler-utils.js";
import {
  fetchZdfSeasonEpisodes,
  fetchZdfEpisodeHtml,
  parseZdfEpisodeHtml,
  cleanAcademicTitles,
  ZdfEpisode,
  ZdfSeasonResult,
} from "../lib/zdf-api.js";

const SHOW_NAME = "Sarah Tacke";
const CANONICAL = "sarah-tacke-166";
const CHANNEL = "ZDF";
const LIST_URL = "https://www.zdf.de/talk/sarah-tacke-166";
const VIDEO_HREF_PREFIX = 'a[href^="/video/talk/sarah-tacke-166/"]';

// ---------------- Puppeteer Fallback Helpers ----------------

async function clickLoadMoreUntilDone(
  page: Page,
  latestDbDate?: string | null,
): Promise<void> {
  let previousCount = 0;
  let currentCount = await page.$$eval(VIDEO_HREF_PREFIX, (els) => els.length);

  while (true) {
    previousCount = currentCount;

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

    const newCount = await page.$$eval(VIDEO_HREF_PREFIX, (els) => els.length);

    if (latestDbDate && newCount > currentCount) {
      const currentUrls = await page.$$eval(VIDEO_HREF_PREFIX, (as) =>
        as.map((a) => (a as HTMLAnchorElement).href),
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
        VIDEO_HREF_PREFIX,
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

async function collectEpisodeLinks(page: Page): Promise<string[]> {
  const urls = await page.$$eval(VIDEO_HREF_PREFIX, (as) =>
    Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))),
  );
  return urls;
}

async function extractGuestsFromEpisodePuppeteer(
  page: Page,
  episodeUrl: string,
): Promise<GuestWithRole[]> {
  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await acceptCookieBanner(page);

  // 1) Aus li Elementen in der guestSection
  let guestsWithRoles: GuestWithRole[] = await page
    .evaluate(() => {
      const section =
        document.querySelector('section[tabindex="0"]') ||
        document.querySelector("section.tdeoflm");
      if (!section) return [];

      const listItems = Array.from(section.querySelectorAll("li"));
      return listItems
        .map((li) => (li.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((text) => {
          const commaIndex = text.indexOf(",");
          const parenIndex = text.indexOf("(");
          let splitIndex = -1;
          if (commaIndex !== -1 && parenIndex !== -1) {
            splitIndex = Math.min(commaIndex, parenIndex);
          } else if (commaIndex !== -1) {
            splitIndex = commaIndex;
          } else if (parenIndex !== -1) {
            splitIndex = parenIndex;
          }

          if (splitIndex !== -1) {
            return {
              name: text.substring(0, splitIndex).trim(),
              role: text
                .substring(splitIndex)
                .replace(/^\(([^)]+)\)/, "$1")
                .replace(/^,\s*/, "")
                .replace(/^[,\(\s]+|[,\)\s]+$/g, "")
                .trim(),
            };
          }
          return { name: text, role: undefined };
        });
    })
    .catch(() => []);

  // 2) Fallback: Image Alt Tag
  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Sarah Tacke"], main img[alt*="Tacke"]',
        (el) => el.getAttribute("alt") || "",
      )
      .catch(() => "");
    if (
      alt &&
      (alt.includes(":") || alt.includes("gemeinsam mit") || alt.includes("mit ihren Gästen"))
    ) {
      const prefixMatch = alt.match(/(?:Zu Gast bei[^:]*:\s*|gemeinsam mit\s+)(.+)/i);
      const candidates = (prefixMatch ? prefixMatch[1] : alt)
        .split(/,| und /)
        .map((s) => s.trim())
        .filter(Boolean);
      guestsWithRoles = candidates.map((raw) => {
        const parenMatch = raw.match(/\(([^)]+)\)/);
        let role = parenMatch ? parenMatch[1] : undefined;
        let name = raw.replace(/\(([^)]+)\)/, "").trim();
        const commaIdx = name.indexOf(",");
        if (commaIdx !== -1) {
          role = role ? `${role}, ${name.substring(commaIdx + 1).trim()}` : name.substring(commaIdx + 1).trim();
          name = name.substring(0, commaIdx).trim();
        }
        return { name, role };
      });
    }
  }

  const cleanedGuests = guestsWithRoles
    .map((g) => ({
      name: cleanAcademicTitles(g.name),
      role: g.role,
    }))
    .filter(
      (g) => seemsLikePersonName(g.name) && !isModeratorOrHost(g.name, SHOW_NAME),
    );

  const uniqueGuests = cleanedGuests.reduce((acc: GuestWithRole[], current) => {
    if (!acc.find((g) => g.name === current.name)) {
      acc.push(current);
    }
    return acc;
  }, []);

  return uniqueGuests;
}

async function extractEpisodeDescriptionPuppeteer(
  page: Page,
): Promise<string | null> {
  try {
    const description = await page.evaluate(() => {
      const guestSection =
        document.querySelector('section[tabindex="0"]') ||
        document.querySelector("section.tdeoflm");
      if (!guestSection) return null;

      const paragraphs = Array.from(guestSection.querySelectorAll(".p4fzw5k"));
      const cleanTexts = paragraphs
        .map((p) => {
          const clone = p.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("ul, ol, h3, script, style").forEach((el) => el.remove());
          return (clone.textContent || "").trim();
        })
        .filter(
          (text) =>
            text.length > 30 &&
            !text.includes("Zu Gast") &&
            !text.includes("am Donnerstag") &&
            !text.includes("SARAH TACKE“ mit dem Thema"),
        );

      return cleanTexts.length > 0 ? cleanTexts.join(" ") : null;
    });

    return description;
  } catch (error) {
    console.warn(`Fehler beim Extrahieren der Beschreibung (Puppeteer):`, error);
    return null;
  }
}

// ---------------- Database Storage ----------------

async function storeEpisodesInDb(episodes: EpisodeResult[]): Promise<void> {
  let episodesWithPoliticians = 0;
  let totalPoliticiansInserted = 0;
  let totalPoliticalAreasInserted = 0;
  let totalEpisodeLinksInserted = 0;

  const episodeLinksToInsert = episodes
    .filter((ep) => ep.date && ep.episodeUrl)
    .map((ep) => ({
      episodeUrl: ep.episodeUrl,
      episodeDate: ep.date!,
    }));

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      SHOW_NAME,
      episodeLinksToInsert,
    );
  }

  for (const episode of episodes) {
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
        CHANNEL,
        SHOW_NAME,
        episode.date,
        politicians,
      );

      totalPoliticiansInserted += inserted;
      episodesWithPoliticians++;

      if (politicalAreaIds && politicalAreaIds.length > 0) {
        const insertedAreas = await insertEpisodePoliticalAreas(
          SHOW_NAME,
          episode.date,
          politicalAreaIds,
        );
        totalPoliticalAreasInserted += insertedAreas;
      }
    }
  }

  console.log(`\n=== Sarah Tacke Datenbank-Speicherung Zusammenfassung ===`);
  console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
  console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);
  console.log(
    `Politische Themenbereiche gesamt eingefügt: ${totalPoliticalAreasInserted}`,
  );
  console.log(`Episode-URLs gesamt eingefügt: ${totalEpisodeLinksInserted}`);
}

// ---------------- Primary GraphQL / API Crawler ----------------

async function CrawlSarahTackeAPI(
  latestEpisodeDate: string | null,
  fetchAll = false,
): Promise<EpisodeResult[]> {
  console.log("Starting Sarah Tacke Crawling with API-mode...");

  const allApiEpisodes: ZdfEpisode[] = [];
  let hasNext = true;
  let cursor: string | null = null;
  let pageCount = 0;
  const maxPages = fetchAll ? 20 : 5;

  while (hasNext && pageCount < maxPages) {
    const pageResult: ZdfSeasonResult = await fetchZdfSeasonEpisodes(
      CANONICAL,
      0,
      cursor || undefined,
    );
    allApiEpisodes.push(...pageResult.episodes);

    if (!fetchAll && latestEpisodeDate && pageResult.episodes.length > 0) {
      const oldestEpisode = pageResult.episodes[pageResult.episodes.length - 1];
      const oldestDate = oldestEpisode.editorialDate
        ? oldestEpisode.editorialDate.substring(0, 10)
        : null;
      if (oldestDate && oldestDate <= latestEpisodeDate) {
        console.log(
          `Oldest episode in current page (${oldestDate}) is older than or equal to latest DB date (${latestEpisodeDate}). Stopping pagination.`,
        );
        break;
      }
    }

    hasNext = pageResult.hasNextPage;
    cursor = pageResult.endCursor;
    pageCount++;
  }

  console.log(
    `Fetched ${allApiEpisodes.length} episodes from API across ${pageCount} page(s).`,
  );

  let filteredEpisodes = allApiEpisodes;
  if (!fetchAll && latestEpisodeDate) {
    filteredEpisodes = allApiEpisodes.filter((ep) => {
      const date = ep.editorialDate ? ep.editorialDate.substring(0, 10) : null;
      return date && date > latestEpisodeDate;
    });
    console.log(
      `Nach Datum-Filter: ${filteredEpisodes.length}/${allApiEpisodes.length} Episoden (nur neuer als ${latestEpisodeDate})`,
    );
  }

  filteredEpisodes = filteredEpisodes.filter((ep) => {
    const date = ep.editorialDate ? ep.editorialDate.substring(0, 10) : null;
    if (isExcludedEpisode(SHOW_NAME, date)) {
      console.log(`⏭️  Episode ${date} ist ausgeschlossen - wird übersprungen`);
      return false;
    }
    return true;
  });

  if (!filteredEpisodes.length) {
    console.log("Keine neuen Episoden zu crawlen gefunden.");
    return [];
  }

  const byDate = new Map<string, EpisodeResult>();
  const results: EpisodeResult[] = [];

  const batchSize = 5;
  for (let i = 0; i < filteredEpisodes.length; i += batchSize) {
    const batch = filteredEpisodes.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (episode) => {
        try {
          const date = episode.editorialDate
            ? episode.editorialDate.substring(0, 10)
            : null;
          console.log(`Processing episode: ${episode.sharingUrl} (${date})`);

          const html = await fetchZdfEpisodeHtml(episode.sharingUrl);
          const parsed = parseZdfEpisodeHtml("tacke", html);

          let guestNames = parsed.guests.map((g) => g.name);

          // Fallback zu KI-Extraktion, falls in HTML keine Gästeliste gefunden wurde
          if (guestNames.length === 0) {
            const textToExtract =
              episode.description || parsed.description || "";
            if (textToExtract) {
              console.log(
                `🤖 Fallback AI guest extraction for episode ${date}...`,
              );
              const aiGuests = await extractGuestsWithAI(textToExtract);
              for (const rawName of aiGuests) {
                const name = cleanAcademicTitles(rawName);
                if (
                  seemsLikePersonName(name) &&
                  !isModeratorOrHost(name, SHOW_NAME)
                ) {
                  if (!guestNames.includes(name)) {
                    guestNames.push(name);
                  }
                }
              }
            }
          }

          const guestsDetailed: GuestDetails[] = [];
          for (const gName of guestNames) {
            const matchedGuest = parsed.guests.find((g) => g.name === gName);
            const details = await checkPolitician(gName, matchedGuest?.role);
            guestsDetailed.push(details);
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          if (date) {
            const foundPoliticians = guestsDetailed.filter(
              (g) => g.isPolitician && g.politicianId,
            );
            console.log(
              `📅 ${date} | 👥 ${guestNames.join(", ")}${
                foundPoliticians.length > 0
                  ? ` | ✅ Politiker: ${foundPoliticians
                      .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
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
            date: episode.editorialDate
              ? episode.editorialDate.substring(0, 10)
              : null,
            guests: [],
            guestsDetailed: [],
          };
        }
      }),
    );

    results.push(...batchResults);
    if (i + batchSize < filteredEpisodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return byDate.size > 0 ? Array.from(byDate.values()) : results;
}

// ---------------- Puppeteer Fallback Crawler ----------------

async function CrawlSarahTackePuppeteer(
  latestEpisodeDate: string | null,
): Promise<EpisodeResult[]> {
  console.log("Starting Sarah Tacke Crawling with Puppeteer fallback...");
  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await acceptCookieBanner(page);

    await clickLoadMoreUntilDone(page, latestEpisodeDate);
    const episodeUrls = await collectEpisodeLinks(page);

    if (!episodeUrls.length) {
      console.log("Keine Episoden-Links gefunden via Puppeteer");
      return [];
    }

    let filteredUrls = episodeUrls;
    if (latestEpisodeDate) {
      filteredUrls = episodeUrls.filter((url) => {
        const urlDate = parseISODateFromUrl(url);
        return urlDate && urlDate > latestEpisodeDate;
      });
    }

    filteredUrls = filteredUrls.filter((url) => {
      const urlDate = parseISODateFromUrl(url);
      return !isExcludedEpisode(SHOW_NAME, urlDate);
    });

    if (!filteredUrls.length) {
      console.log("Keine neuen Episoden zu crawlen gefunden (Puppeteer)");
      return [];
    }

    const byDate = new Map<string, EpisodeResult>();
    const results: EpisodeResult[] = [];
    const batchSize = 3;

    for (let i = 0; i < filteredUrls.length; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const p = await setupSimplePage(browser);
          try {
            const date = parseISODateFromUrl(url);
            const [guestsWithRoles, description] = await Promise.all([
              extractGuestsFromEpisodePuppeteer(p, url),
              extractEpisodeDescriptionPuppeteer(p),
            ]);

            let guestNames = guestsWithRoles.map((g) => g.name);

            // Fallback auf KI
            if (guestNames.length === 0 && description) {
              const aiGuests = await extractGuestsWithAI(description);
              for (const raw of aiGuests) {
                const name = cleanAcademicTitles(raw);
                if (
                  seemsLikePersonName(name) &&
                  !isModeratorOrHost(name, SHOW_NAME)
                ) {
                  if (!guestNames.includes(name)) {
                    guestNames.push(name);
                  }
                }
              }
            }

            const guestsDetailed: GuestDetails[] = [];
            for (const gName of guestNames) {
              const matchedRole = guestsWithRoles.find(
                (g) => g.name === gName,
              )?.role;
              const details = await checkPolitician(gName, matchedRole);
              guestsDetailed.push(details);
              await new Promise((resolve) => setTimeout(resolve, 200));
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
          } catch (e: any) {
            console.warn(`Fehler bei Puppeteer Episode ${url}:`, e.message);
            return {
              episodeUrl: url,
              date: parseISODateFromUrl(url),
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
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return byDate.size > 0 ? Array.from(byDate.values()) : results;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------- Public Entry Points ----------------

export async function crawlNewSarahTackeEpisodes(): Promise<void> {
  const latestEpisodeDate = await getLatestEpisodeDate(SHOW_NAME);

  try {
    const apiResults = await CrawlSarahTackeAPI(latestEpisodeDate, false);
    if (apiResults.length > 0) {
      await storeEpisodesInDb(apiResults);
    } else {
      console.log("Sarah Tacke API crawler finished: No new episodes to store.");
    }
  } catch (error: any) {
    console.error(
      "API-based CrawlSarahTacke failed. Falling back to Puppeteer...",
      error.message,
    );
    const puppeteerResults = await CrawlSarahTackePuppeteer(latestEpisodeDate);
    if (puppeteerResults.length > 0) {
      await storeEpisodesInDb(puppeteerResults);
    }
  }
}

export async function crawlAllSarahTackeEpisodes(): Promise<void> {
  try {
    const apiResults = await CrawlSarahTackeAPI(null, true);
    if (apiResults.length > 0) {
      await storeEpisodesInDb(apiResults);
    }
  } catch (error: any) {
    console.error(
      "API-based crawlAllSarahTackeEpisodes failed. Falling back to Puppeteer...",
      error.message,
    );
    const puppeteerResults = await CrawlSarahTackePuppeteer(null);
    if (puppeteerResults.length > 0) {
      await storeEpisodesInDb(puppeteerResults);
    }
  }
}

export default async function CrawlSarahTacke(): Promise<{
  message: string;
  status: number;
}> {
  const latestEpisodeDate = await getLatestEpisodeDate(SHOW_NAME);

  try {
    const apiResults = await CrawlSarahTackeAPI(latestEpisodeDate, false);
    if (apiResults.length > 0) {
      await storeEpisodesInDb(apiResults);
    }

    return {
      message: "Sarah Tacke Crawling (API-mode) erfolgreich",
      status: 200,
    };
  } catch (error: any) {
    console.error(
      "API-based CrawlSarahTacke failed. Falling back to Puppeteer...",
      error.message,
    );

    try {
      const puppeteerResults = await CrawlSarahTackePuppeteer(latestEpisodeDate);
      if (puppeteerResults.length > 0) {
        await storeEpisodesInDb(puppeteerResults);
      }

      return {
        message: "Sarah Tacke Crawling (Puppeteer-fallback) erfolgreich",
        status: 200,
      };
    } catch (fallbackError: any) {
      console.error(
        "Puppeteer fallback also failed for Sarah Tacke:",
        fallbackError.message,
      );
      return {
        message: "Fehler beim Sarah Tacke Crawling (inklusive Fallback)",
        status: 500,
      };
    }
  }
}
