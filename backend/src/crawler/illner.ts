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

const currentYear = new Date().getFullYear();
const LIST_URL = `https://www.zdf.de/talk/maybrit-illner-128?staffel=${currentYear}`;

// Extrahiere Episodenbeschreibung und bestimme politische Themenbereiche
async function extractEpisodeDescription(
  page: Page,
): Promise<number[] | [] | null> {
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

// Extrahiere die neuesten Episode-Links (nur die ersten paar)
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

// Extrahiere ALLE verfügbaren Episode-Links durch Scrollen und Paginierung
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
      // Kein Load-More Button gefunden, das ist ok
    }
  }

  const finalUrls = Array.from(allUrls);

  // Sortiere nach Datum (neuste zuerst)
  const urlsWithDates = finalUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null)
    .sort((a, b) => b.date!.localeCompare(a.date!));

  return urlsWithDates.map((ep) => ep.url);
}

// Filtere nur neue Episoden (neuere als das letzte Datum in der DB)
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

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Extrahiere Gäste aus einer Maybrit Illner Episode
async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string,
): Promise<{ guests: GuestWithRole[]; politicalAreaIds?: number[] }> {
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

  // Fallback 1: Suche nach allen <li> Elementen im main Bereich
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

  // Fallback: Alt-Text vom Bild
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

  // Fallback 2: Suche nach "Zu Gast" Text und extrahiere einfache Namen
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

  // Letzter Fallback: Alt-Text vom Bild
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

  const politicalAreaIds = await extractEpisodeDescription(page);

  return {
    guests: uniqueGuests,
    politicalAreaIds: politicalAreaIds || undefined,
  };
}

// Hauptfunktion: Crawle nur neue Episoden
export async function crawlNewMaybritIllnerEpisodes(): Promise<void> {
  const latestDbDate = await getLatestEpisodeDate("Maybrit Illner");

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

    console.log(`🆕 ${newEpisodes.length} neue Episoden zu crawlen`);

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    for (const episode of newEpisodes) {
      try {
        const result = await extractGuestsFromEpisode(page, episode.url);
        const guests = result.guests;
        const politicalAreaIds = result.politicalAreaIds;

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

        // Log: Datum + Gäste + Politiker
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
          const inserted = await insertMultipleTvShowPoliticians(
            "ZDF",
            "Maybrit Illner",
            episode.date,
            politicians,
          );

          totalPoliticiansInserted += inserted;
        }

        if (politicalAreaIds && politicalAreaIds.length > 0) {
          await insertEpisodePoliticalAreas(
            "Maybrit Illner",
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

    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maybrit Illner",
        episodeLinksToInsert,
      );
    }

    console.log(`\n=== Maybrit Illner Zusammenfassung ===`);
    console.log(`Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl ALLER Episoden
export async function crawlAllMaybritIllnerEpisodes(): Promise<void> {
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
    }>; // Älteste zuerst für historischen Crawl

    console.log(`📺 Gefunden: ${allEpisodes.length} Episoden zum Crawlen`);
    if (allEpisodes.length > 0) {
      console.log(
        `📅 Zeitraum: ${allEpisodes[0]?.date} bis ${
          allEpisodes[allEpisodes.length - 1]?.date
        }`,
      );
    }

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

        const result = await extractGuestsFromEpisode(page, episode.url);
        const guests = result.guests;
        const politicalAreaIds = result.politicalAreaIds;

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

        // Log: Datum + Gäste + Politiker
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
          const inserted = await insertMultipleTvShowPoliticians(
            "ZDF",
            "Maybrit Illner",
            episode.date,
            politicians,
          );
          totalPoliticiansInserted += inserted;
        }

        if (politicalAreaIds && politicalAreaIds.length > 0) {
          await insertEpisodePoliticalAreas(
            "Maybrit Illner",
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

    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maybrit Illner",
        episodeLinksToInsert,
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`,
      );
    }

    console.log(`\n🎉 VOLLSTÄNDIGER Maybrit Illner Crawl abgeschlossen!`);
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${allEpisodes.length}`,
    );
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
    console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);

    if (episodesWithErrors > 0) {
      console.log(
        `⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`,
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}
