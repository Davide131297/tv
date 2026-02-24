import {
  insertMultipleTvShowPoliticians,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
  getLatestEpisodeDate,
} from "@/lib/supabase-server-utils";
import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import {
  parseISODateFromUrl,
  extractDateISO,
  seemsLikePersonName,
  acceptCookieBanner,
  gentleScroll,
  GuestWithRole,
  GuestDetails,
  EpisodeResult,
} from "@/lib/crawler-utils";
import { Page } from "puppeteer";
import { getPoliticalArea } from "@/lib/ai-utils";

const LIST_URL = `https://www.zdf.de/talk/markus-lanz-114?staffel=$%7BcurrentYear%7D`;

// ---------------- Lade mehr / Episoden-Links ----------------

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

// ---------------- Gäste aus Episode ----------------

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

// ---------------- Episode Text Extraktion ----------------

async function extractPoliticalAreaIds(
  page: Page,
): Promise<number[] | [] | null> {
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

    if (description) {
      const politicalAreaIds = await getPoliticalArea(description);
      return politicalAreaIds;
    } else {
      return null;
    }
  } catch (error) {
    console.warn(`Fehler beim Extrahieren der Episode-Beschreibung:`, error);
    return null;
  }
}

export default async function CrawlLanz() {
  const latestEpisodeDate = await getLatestEpisodeDate("Markus Lanz");

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

    const batchSize = 6;
    const results: EpisodeResult[] = [];

    for (let i = 0; i < filteredUrls.length; i += batchSize) {
      const batch = filteredUrls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const p = await setupSimplePage(browser);
          try {
            const [guests, date, politicalAreaIds] = await Promise.all([
              extractGuestsFromEpisode(p, url),
              extractDateISO(p, url),
              extractPoliticalAreaIds(p),
            ]);

            const guestsDetailed: GuestDetails[] = [];
            for (const guest of guests) {
              const details = await checkPolitician(guest.name, guest.role);
              guestsDetailed.push(details);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            const guestNames = guests.map((g) => g.name);

            // Log: Datum + Gäste + gefundene Politiker
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
              politicalAreaIds: politicalAreaIds || [],
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
        const inserted = await insertMultipleTvShowPoliticians(
          "ZDF",
          "Markus Lanz",
          episode.date,
          politicians,
        );

        totalPoliticiansInserted += inserted;
        episodesWithPoliticians++;
      }

      if (episode.politicalAreaIds && episode.politicalAreaIds.length > 0) {
        const insertedAreas = await insertEpisodePoliticalAreas(
          "Markus Lanz",
          episode.date,
          episode.politicalAreaIds,
        );

        totalPoliticalAreasInserted += insertedAreas;
      }
    }

    console.log(`\n=== Datenbank-Speicherung Zusammenfassung ===`);
    console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`Politiker gesamt eingefügt: ${totalPoliticiansInserted}`);
    console.log(
      `Politische Themenbereiche gesamt eingefügt: ${totalPoliticalAreasInserted}`,
    );
    console.log(`Episode-URLs gesamt eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Lanz Crawling erfolgreich",
      status: 200,
    };
  } catch {
    return {
      message: "Fehler beim Lanz Crawling",
      status: 500,
    };
  }
}
