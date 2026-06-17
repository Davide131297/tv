import { Page } from "puppeteer";
import { createBrowser, setupSimplePage } from "../lib/browser-configs.js";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  checkPolitician,
} from "../lib/utils.js";
import { getPoliticalArea } from "../lib/utils.js";
import {
  parseISODateFromUrl,
  acceptCookieBanner,
  gentleScroll,
  seemsLikePersonName,
  isModeratorOrHost,
  GuestWithRole,
} from "../lib/crawler-utils.js";
import {
  fetchZdfSeasonEpisodes,
  fetchZdfEpisodeHtml,
  parseZdfEpisodeHtml,
  ZdfEpisode,
  ZdfSeasonResult
} from "../lib/zdf-api.js";

const currentYear = new Date().getFullYear();
const LIST_URL = `https://www.zdf.de/talk/maybrit-illner-128?staffel=${currentYear}`;

// ---------------- Puppeteer Fallback Functions (Original Code) ----------------

async function extractEpisodeDescription(page: Page): Promise<string | null> {
  try {
    const description = await page.evaluate(() => {
      const guestSection =
        document.querySelector('section[tabindex="0"]') ||
        document.querySelector("section.tdeoflm");

      if (!guestSection) return null;

      const paragraphs = Array.from(
        guestSection.querySelectorAll("p.p4fzw5k.tyrgmig.m1iv7h85"),
      );

      const descriptionParagraphs = paragraphs.slice(1, 4);

      if (descriptionParagraphs.length === 0) return null;

      const descriptionText = descriptionParagraphs
        .map((p) => (p.textContent || "").trim())
        .filter((text) => text.length > 20)
        .join(" ");

      return descriptionText.length > 50 ? descriptionText : null;
    });

    return description;
  } catch (error) {
    console.warn(`Fehler beim Extrahieren der Episode-Beschreibung:`, error);
    return null;
  }
}

async function getLatestEpisodeLinks(
  page: Page,
  limit = 10,
): Promise<string[]> {
  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  await acceptCookieBanner(page);

  const urls = await page.$$eval(
    'a[href^="/video/talk/maybrit-illner-128/"]',
    (as, limitParam) =>
      Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).slice(
        0,
        limitParam,
      ),
    limit,
  );

  return urls;
}

async function getAllEpisodeLinks(page: Page): Promise<string[]> {
  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  await acceptCookieBanner(page);

  const allUrls = new Set<string>();
  let previousCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 100;

  while (scrollAttempts < maxScrollAttempts) {
    const currentUrls = await page.$$eval(
      'a[href^="/video/talk/maybrit-illner-128/"]',
      (as) => as.map((a) => (a as HTMLAnchorElement).href),
    );

    currentUrls.forEach((url) => allUrls.add(url));

    if (allUrls.size === previousCount) {
      break;
    }

    previousCount = allUrls.size;
    scrollAttempts++;

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const loadMoreButton = await page.$(
        'button[data-tracking*="load"], button:contains("Mehr"), button:contains("Weitere")',
      );
      if (loadMoreButton) {
        await loadMoreButton.click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch {
      // No load more button, that's fine
    }
  }

  const finalUrls = Array.from(allUrls);

  const urlsWithDates = finalUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null)
    .sort((a, b) => b.date!.localeCompare(a.date!));

  return urlsWithDates.map((ep) => ep.url);
}

function filterNewEpisodes(
  episodeUrls: string[],
  latestDbDate: string | null,
): Array<{ url: string; date: string }> {
  const episodesWithDates = episodeUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null) as Array<{ url: string; date: string }>;

  if (!latestDbDate) {
    return episodesWithDates;
  }

  const newEpisodes = episodesWithDates.filter((ep) => ep.date > latestDbDate);

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date));
}

async function extractGuestsFromEpisodePuppeteer(
  page: Page,
  episodeUrl: string,
): Promise<{ guests: GuestWithRole[]; description?: string }> {
  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  await gentleScroll(page);

  let guestsWithRoles: GuestWithRole[] = await page
    .$$eval(
      'section[tabindex="0"] li span, section.tdeoflm li span',
      (els) =>
        els
          .map((el) => {
            const fullText = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (!fullText) return null;

            const words = fullText.split(/\s+/);
            if (words.length < 2) return null;

            const name = `${words[0]} ${words[1]}`;

            const roleMatch = fullText.match(/\(([^)]+)\)/);
            const role = roleMatch ? roleMatch[1] : undefined;

            return { name, role };
          })
          .filter(Boolean) as GuestWithRole[],
    )
    .catch(() => []);

  if (!guestsWithRoles.length) {
    guestsWithRoles = await page
      .$$eval(
        "main li",
        (els) =>
          els
            .map((el) => {
              const fullText = (el.textContent || "")
                .replace(/\s+/g, " ")
                .trim();
              if (!fullText) return null;

              const words = fullText.split(/\s+/);
              if (words.length < 2) return null;

              const name = `${words[0]} ${words[1]}`;

              if (!/^[A-ZÄÖÜ][a-zäöü]+ [A-ZÄÖÜ][a-zäöü]/.test(name))
                return null;

              const roleMatch = fullText.match(/\(([^)]+)\)/);
              const role = roleMatch ? roleMatch[1] : undefined;

              return { name, role };
            })
            .filter(Boolean) as GuestWithRole[],
      )
      .catch(() => []);
  }

  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Maybrit Illner"], main img[alt*="Illner"]',
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

  if (!guestsWithRoles.length) {
    const guestText = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const text = el.textContent || "";
        if (
          text.includes("Zu Gast bei Maybrit Illner sind") ||
          text.includes("Paul Ziemiak")
        ) {
          return text;
        }
      }
      return "";
    });

    if (guestText) {
      const namePattern =
        /([A-ZÄÖÜ][a-zäöü]+ [A-ZÄÖÜ][a-zäöü-]+)(?:\s*\(([^)]+)\))?/g;
      const extractedNames = [];
      let match;

      while ((match = namePattern.exec(guestText)) !== null) {
        const name = match[1].trim();
        const role = match[2] ? match[2].trim() : undefined;

        if (
          name.length > 5 &&
          !name.toLowerCase().includes("illner") &&
          !name.toLowerCase().includes("deutschland") &&
          !name.toLowerCase().includes("september")
        ) {
          extractedNames.push({ name, role });
        }
      }

      if (extractedNames.length > 0) {
        guestsWithRoles = extractedNames;
      }
    }
  }

  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Maybrit Illner"], main img[alt*="Illner"]',
        (el) => el.getAttribute("alt") || "",
      )
      .catch(() => "");

    if (alt && alt.includes(":")) {
      const list = alt
        .split(":")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((name) => name.length > 5 && name.includes(" "))
        .map((name) => {
          const words = name.split(/\s+/);
          return words.length >= 2 ? `${words[0]} ${words[1]}` : name;
        });
      guestsWithRoles = list.map((name) => ({ name, role: undefined }));
    }
  }

  const filteredGuests = guestsWithRoles
    .filter((guest) => seemsLikePersonName(guest.name))
    .filter((guest) => !isModeratorOrHost(guest.name, "Maybrit Illner"));

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

  const description = await extractEpisodeDescription(page);

  return {
    guests: uniqueGuests,
    description: description || undefined,
  };
}

async function crawlNewMaybritIllnerEpisodesPuppeteer(latestDbDate: string | null): Promise<void> {
  console.log("CrawlNewMaybritIllnerEpisodes: Falling back to Puppeteer...");
  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    const latestEpisodeUrls = await getLatestEpisodeLinks(page);

    if (latestEpisodeUrls.length === 0) {
      return;
    }

    const newEpisodes = filterNewEpisodes(latestEpisodeUrls, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    console.log(`🆕 ${newEpisodes.length} neue Episoden zu crawlen (Puppeteer)`);

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    for (const episode of newEpisodes) {
      try {
        const result = await extractGuestsFromEpisodePuppeteer(page, episode.url);
        const guests = result.guests;
        const description = result.description;

        if (guests.length === 0) continue;

        const politicians = [];
        for (const guest of guests) {
          const details = await checkPolitician(guest.name, guest.role);

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

        if (politicians.length > 0) {
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episode.date,
          });
        }

        const guestNames = guests.map((g) => g.name);
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
          let politicalAreaIds: number[] = [];
          if (description) {
            const areas = await getPoliticalArea(description);
            politicalAreaIds = areas || [];
          }

          const inserted = await insertMultipleTvShowPoliticians(
            "ZDF",
            "Maybrit Illner",
            episode.date,
            politicians,
          );

          totalPoliticiansInserted += inserted;

          if (politicalAreaIds && politicalAreaIds.length > 0) {
            await insertEpisodePoliticalAreas(
              "Maybrit Illner",
              episode.date,
              politicalAreaIds,
            );
          }
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
        "Maybrit Illner",
        episodeLinksToInsert,
      );
    }

    console.log(`\n=== Maybrit Illner Zusammenfassung (Puppeteer) ===`);
    console.log(`Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function crawlAllMaybritIllnerEpisodesPuppeteer(): Promise<void> {
  console.log("CrawlAllMaybritIllnerEpisodes: Falling back to Puppeteer...");
  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    const allEpisodeUrls = await getAllEpisodeLinks(page);

    if (allEpisodeUrls.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    const allEpisodes = allEpisodeUrls
      .map((url) => ({
        url,
        date: parseISODateFromUrl(url),
      }))
      .filter((ep) => ep.date !== null)
      .sort((a, b) => a.date!.localeCompare(b.date!)) as Array<{
      url: string;
      date: string;
    }>;

    console.log(`📺 Gefunden: ${allEpisodes.length} Episoden zum Crawlen (Puppeteer)`);

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    for (let i = 0; i < allEpisodes.length; i++) {
      const episode = allEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${allEpisodes.length}] Verarbeite Episode vom ${
            episode.date
          }`,
        );

        const result = await extractGuestsFromEpisodePuppeteer(page, episode.url);
        const guests = result.guests;
        const description = result.description;

        if (guests.length === 0) continue;

        const politicians = [];
        for (const guest of guests) {
          const details = await checkPolitician(guest.name, guest.role);

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

        const guestNames = guests.map((g) => g.name);
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
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episode.date,
          });
        }

        if (politicians.length > 0) {
          let politicalAreaIds: number[] = [];
          if (description) {
            const areas = await getPoliticalArea(description);
            politicalAreaIds = areas || [];
          }

          const inserted = await insertMultipleTvShowPoliticians(
            "ZDF",
            "Maybrit Illner",
            episode.date,
            politicians,
          );
          totalPoliticiansInserted += inserted;

          if (politicalAreaIds && politicalAreaIds.length > 0) {
            await insertEpisodePoliticalAreas(
              "Maybrit Illner",
              episode.date,
              politicalAreaIds,
            );
          }
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

    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maybrit Illner",
        episodeLinksToInsert,
      );
    }

    console.log(`\n🎉 VOLLSTÄNDIGER Maybrit Illner Crawl abgeschlossen (Puppeteer)!`);
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${allEpisodes.length}`,
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

// ---------------- Primary GraphQL / API Crawlers ----------------

async function storeIllnerEpisodesInDb(episodesToStore: Array<{ url: string; date: string; guests: { name: string; role?: string }[]; description?: string }>) {
  let totalPoliticiansInserted = 0;
  let totalEpisodeLinksInserted = 0;
  let episodesProcessed = 0;

  const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] = [];

  for (const episode of episodesToStore) {
    try {
      const politicians = [];
      for (const guest of episode.guests) {
        const details = await checkPolitician(guest.name, guest.role);

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

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (politicians.length > 0) {
        episodeLinksToInsert.push({
          episodeUrl: episode.url,
          episodeDate: episode.date,
        });
      }

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
        let politicalAreaIds: number[] = [];
        if (episode.description) {
          const areas = await getPoliticalArea(episode.description);
          politicalAreaIds = areas || [];
        }

        const inserted = await insertMultipleTvShowPoliticians(
          "ZDF",
          "Maybrit Illner",
          episode.date,
          politicians,
        );

        totalPoliticiansInserted += inserted;

        if (politicalAreaIds && politicalAreaIds.length > 0) {
          await insertEpisodePoliticalAreas(
            "Maybrit Illner",
            episode.date,
            politicalAreaIds,
          );
        }
      }

      episodesProcessed++;
    } catch (error: any) {
      console.error(`❌ Fehler beim Verarbeiten von Episode ${episode.date}:`, error.message);
    }
  }

  if (episodeLinksToInsert.length > 0) {
    totalEpisodeLinksInserted = await insertMultipleShowLinks(
      "Maybrit Illner",
      episodeLinksToInsert,
    );
  }

  console.log(`\n=== Maybrit Illner Datenbank-Speicherung Zusammenfassung ===`);
  console.log(`Episoden verarbeitet: ${episodesProcessed}`);
  console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
  console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}

async function crawlNewMaybritIllnerEpisodesAPI(latestDbDate: string | null): Promise<void> {
  console.log("CrawlNewMaybritIllnerEpisodes: Starting API-mode...");

  // 1) Fetch season episodes from GraphQL
  const allApiEpisodes: ZdfEpisode[] = [];
  let hasNext = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNext && pageCount < 5) {
    const pageResult: ZdfSeasonResult = await fetchZdfSeasonEpisodes("maybrit-illner-128", 0, cursor || undefined);
    allApiEpisodes.push(...pageResult.episodes);
    
    // Stop paging if we are beyond latest DB date
    if (latestDbDate && pageResult.episodes.length > 0) {
      const oldestEpisode = pageResult.episodes[pageResult.episodes.length - 1];
      const oldestDate = oldestEpisode.editorialDate ? oldestEpisode.editorialDate.substring(0, 10) : null;
      if (oldestDate && oldestDate <= latestDbDate) {
        break;
      }
    }
    
    hasNext = pageResult.hasNextPage;
    cursor = pageResult.endCursor;
    pageCount++;
  }

  // 2) Filter new episodes
  const newEpisodes = allApiEpisodes
    .map((ep) => ({
      url: ep.sharingUrl,
      date: ep.editorialDate ? ep.editorialDate.substring(0, 10) : null,
      apiDescription: ep.description
    }))
    .filter((ep) => ep.date !== null && (!latestDbDate || ep.date > latestDbDate)) as Array<{ url: string; date: string; apiDescription?: string }>;

  if (newEpisodes.length === 0) {
    console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
    return;
  }

  console.log(`🆕 ${newEpisodes.length} neue Episoden zu crawlen (API)`);

  const episodesToStore = [];
  const batchSize = 5;

  for (let i = 0; i < newEpisodes.length; i += batchSize) {
    const batch = newEpisodes.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (episode) => {
        try {
          const html = await fetchZdfEpisodeHtml(episode.url);
          const parsed = parseZdfEpisodeHtml("illner", html);
          
          return {
            url: episode.url,
            date: episode.date,
            guests: parsed.guests,
            description: parsed.description || episode.apiDescription
          };
        } catch (e: any) {
          console.warn(`Fehler bei Episode ${episode.url}:`, e.message);
          return null;
        }
      })
    );

    for (const r of batchResults) {
      if (r && r.guests.length > 0) {
        episodesToStore.push(r);
      }
    }

    if (i + batchSize < newEpisodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (episodesToStore.length > 0) {
    await storeIllnerEpisodesInDb(episodesToStore);
  }
}

async function crawlAllMaybritIllnerEpisodesAPI(): Promise<void> {
  console.log("CrawlAllMaybritIllnerEpisodes: Starting API-mode...");

  // 1) Fetch all season episodes from GraphQL
  const allApiEpisodes: ZdfEpisode[] = [];
  let hasNext = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNext && pageCount < 20) {
    const pageResult: ZdfSeasonResult = await fetchZdfSeasonEpisodes("maybrit-illner-128", 0, cursor || undefined);
    allApiEpisodes.push(...pageResult.episodes);
    hasNext = pageResult.hasNextPage;
    cursor = pageResult.endCursor;
    pageCount++;
  }

  // Map and filter (oldest first for historical crawl)
  const allEpisodes = allApiEpisodes
    .map((ep) => ({
      url: ep.sharingUrl,
      date: ep.editorialDate ? ep.editorialDate.substring(0, 10) : null,
      apiDescription: ep.description
    }))
    .filter((ep) => ep.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!)) as Array<{ url: string; date: string; apiDescription?: string }>;

  console.log(`📺 Gefunden: ${allEpisodes.length} Episoden zum Crawlen (API)`);

  const episodesToStore = [];
  const batchSize = 5;

  for (let i = 0; i < allEpisodes.length; i += batchSize) {
    const batch = allEpisodes.slice(i, i + batchSize);
    console.log(`Processing batch [${i + 1}-${Math.min(i + batchSize, allEpisodes.length)} / ${allEpisodes.length}]`);

    const batchResults = await Promise.all(
      batch.map(async (episode) => {
        try {
          const html = await fetchZdfEpisodeHtml(episode.url);
          const parsed = parseZdfEpisodeHtml("illner", html);
          
          return {
            url: episode.url,
            date: episode.date,
            guests: parsed.guests,
            description: parsed.description || episode.apiDescription
          };
        } catch (e: any) {
          console.warn(`Fehler bei Episode ${episode.url}:`, e.message);
          return null;
        }
      })
    );

    for (const r of batchResults) {
      if (r && r.guests.length > 0) {
        episodesToStore.push(r);
      }
    }

    if (i + batchSize < allEpisodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (episodesToStore.length > 0) {
    await storeIllnerEpisodesInDb(episodesToStore);
  }
}

// ---------------- Entry Points ----------------

// Hauptfunktion: Crawle nur neue Episoden
export async function crawlNewMaybritIllnerEpisodes(): Promise<void> {
  const latestDbDate = await getLatestEpisodeDate("Maybrit Illner");

  try {
    await crawlNewMaybritIllnerEpisodesAPI(latestDbDate);
  } catch (error: any) {
    console.error("crawlNewMaybritIllnerEpisodes API failed, falling back to Puppeteer:", error.message);
    await crawlNewMaybritIllnerEpisodesPuppeteer(latestDbDate);
  }
}

// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl ALLER Episoden
export async function crawlAllMaybritIllnerEpisodes(): Promise<void> {
  try {
    await crawlAllMaybritIllnerEpisodesAPI();
  } catch (error: any) {
    console.error("crawlAllMaybritIllnerEpisodes API failed, falling back to Puppeteer:", error.message);
    await crawlAllMaybritIllnerEpisodesPuppeteer();
  }
}
