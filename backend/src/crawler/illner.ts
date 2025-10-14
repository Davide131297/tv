import { createBrowser, setupSimplePage } from "../lib/browser-configs";
import {
  getLatestEpisodeDate,
  getPoliticalArea,
  insertMultipleShowLinks,
  extractGuestsWithAI,
  checkPolitician,
  insertEpisodePoliticalAreas,
  insertMultipleTvShowPoliticians,
} from "../lib/utils";
import { Page } from "puppeteer";

interface GuestWithRole {
  name: string;
  role?: string;
}

const LIST_URL = "https://www.zdf.de/talk/maybrit-illner-128";

// Extrahiere Datum aus URL (ähnlich wie bei Lanz)
function parseISODateFromUrl(url: string): string | null {
  const DE_MONTHS: Record<string, string> = {
    januar: "01",
    februar: "02",
    märz: "03",
    maerz: "03",
    april: "04",
    mai: "05",
    juni: "06",
    juli: "07",
    august: "08",
    september: "09",
    oktober: "10",
    november: "11",
    dezember: "12",
  };

  const m = url.match(/vom-(\d{1,2})-([a-zäöü]+)-(\d{4})/i);
  if (!m) return null;

  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, d, mon, y] = m;
  const key = mon
    .normalize("NFD")
    .replace(/\u0308/g, "")
    .toLowerCase();
  const mm = DE_MONTHS[key];
  if (!mm) return null;

  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Filtere nur neue Episoden (neuere als das letzte Datum in der DB)
function filterNewEpisodes(
  episodeUrls: string[],
  latestDbDate: string | null
): Array<{ url: string; date: string }> {
  console.log(
    `🗓️  Letzte Maybrit Illner Episode in DB: ${latestDbDate || "Keine"}`
  );

  const episodesWithDates = episodeUrls
    .map((url) => ({
      url,
      date: parseISODateFromUrl(url),
    }))
    .filter((ep) => ep.date !== null) as Array<{ url: string; date: string }>;

  if (!latestDbDate) {
    console.log("📋 Keine Episoden in DB - alle sind neu");
    return episodesWithDates;
  }

  const newEpisodes = episodesWithDates.filter((ep) => ep.date > latestDbDate);
  console.log(
    `🆕 ${newEpisodes.length} neue Episoden gefunden (nach ${latestDbDate})`
  );

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Extrahiere die neuesten Episode-Links (nur die ersten paar)
async function getLatestEpisodeLinks(
  page: Page,
  limit = 10
): Promise<string[]> {
  console.log("🔍 Lade die neuesten Maybrit Illner Episode-Links...");

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Cookie-Banner akzeptieren falls vorhanden
  try {
    await page.waitForSelector('[data-testid="cmp-accept-all"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="cmp-accept-all"]');
    console.log("Cookie-Banner akzeptiert");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
  }

  // Hole Maybrit Illner Episode-Links
  const urls = await page.$$eval(
    'a[href^="/video/talk/maybrit-illner-128/"]',
    (as, limitParam) =>
      Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).href))).slice(
        0,
        limitParam
      ),
    limit
  );

  console.log(`📺 Gefunden: ${urls.length} Episode-Links`);
  return urls;
}

// Extrahiere Episodenbeschreibung und bestimme politische Themenbereiche
async function extractEpisodeDescription(
  page: Page
): Promise<number[] | [] | null> {
  try {
    // Suche nach der Episodenbeschreibung in den <p> Elementen nach der Gästeliste
    const description = await page.evaluate(() => {
      // Finde die Section mit der Gästeliste
      const guestSection =
        document.querySelector('section[tabindex="0"]') ||
        document.querySelector("section.tdeoflm");

      if (!guestSection) return null;

      // Sammle alle <p> Elemente in dieser Section
      const paragraphs = Array.from(
        guestSection.querySelectorAll("p.p4fzw5k.tyrgmig.m1iv7h85")
      );

      // Die ersten 3 Paragraphen nach der Gästeliste enthalten meist die Beschreibung
      // Überspringe den ersten <p> der die Gästeliste enthält
      const descriptionParagraphs = paragraphs.slice(1, 4);

      if (descriptionParagraphs.length === 0) return null;

      // Kombiniere die Texte der Beschreibungsparagraphen
      const descriptionText = descriptionParagraphs
        .map((p) => (p.textContent || "").trim())
        .filter((text) => text.length > 20) // Filtere sehr kurze Texte
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

// Extrahiere Gäste aus einer Maybrit Illner Episode
async function extractGuestsFromEpisode(
  page: Page,
  episodeUrl: string
): Promise<{ guests: GuestWithRole[]; politicalAreaIds?: number[] }> {
  console.log(`🎬 Crawle Maybrit Illner Episode: ${episodeUrl}`);

  await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
  });
  await page.waitForSelector("main", { timeout: 15000 }).catch(() => {});

  // Sanft scrollen für Lazy-Content
  await page
    .evaluate(async () => {
      await new Promise<void>((res) => {
        let y = 0;
        const i = setInterval(() => {
          window.scrollBy(0, 500);
          if ((y += 500) > document.body.scrollHeight) {
            clearInterval(i);
            res();
          }
        }, 50);
      });
    })
    .catch(() => {});

  // Primär: Suche nach der Gäste-Liste in <li> Elementen
  let guestsWithRoles: GuestWithRole[] = await page
    .$$eval(
      'section[tabindex="0"] li span, section.tdeoflm li span',
      (els) =>
        els
          .map((el) => {
            const fullText = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (!fullText) return null;

            // Extrahiere nur die ersten 2 Wörter als Namen
            const words = fullText.split(/\s+/);
            if (words.length < 2) return null;

            const name = `${words[0]} ${words[1]}`;

            // Extrahiere Partei aus Klammern falls vorhanden
            const roleMatch = fullText.match(/\(([^)]+)\)/);
            const role = roleMatch ? roleMatch[1] : undefined;

            return { name, role };
          })
          .filter(Boolean) as GuestWithRole[]
    )
    .catch(() => []);

  console.log("📋 Gäste aus <li> Elementen:", guestsWithRoles);

  // Fallback 1: Suche nach allen <li> Elementen im main Bereich
  if (!guestsWithRoles.length) {
    console.log("🔄 Fallback: Suche nach <li> Elementen...");
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

              // Nur Elemente die wie Namen aussehen (mindestens 2 Wörter)
              const words = fullText.split(/\s+/);
              if (words.length < 2) return null;

              const name = `${words[0]} ${words[1]}`;

              // Prüfe ob es ein Name sein könnte (Großbuchstaben am Anfang)
              if (!/^[A-ZÄÖÜ][a-zäöü]+ [A-ZÄÖÜ][a-zäöü]/.test(name))
                return null;

              const roleMatch = fullText.match(/\(([^)]+)\)/);
              const role = roleMatch ? roleMatch[1] : undefined;

              return { name, role };
            })
            .filter(Boolean) as GuestWithRole[]
      )
      .catch(() => []);
  }

  // Fallback: Alt-Text vom Bild
  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Maybrit Illner"], main img[alt*="Illner"]',
        (el) => el.getAttribute("alt") || ""
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
    console.log("� Fallback: Suche nach 'Zu Gast' Text...");

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
      console.log(
        "📋 Gefundener Gäste-Text (gekürzt):",
        guestText.substring(0, 200) + "..."
      );

      // Einfache Extraktion: Suche nach Namen mit Partei-Kennzeichnung
      const namePattern =
        /([A-ZÄÖÜ][a-zäöü]+ [A-ZÄÖÜ][a-zäöü-]+)(?:\s*\(([^)]+)\))?/g;
      const extractedNames = [];
      let match;

      while ((match = namePattern.exec(guestText)) !== null) {
        const name = match[1].trim();
        const role = match[2] ? match[2].trim() : undefined;

        // Filter: Nur Namen die wie echte Personen aussehen
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
        console.log("✅ Namen aus Gäste-Text extrahiert:", extractedNames);
        guestsWithRoles = extractedNames;
      }
    }
  }

  // Letzter Fallback: Alt-Text vom Bild
  if (!guestsWithRoles.length) {
    const alt = await page
      .$eval(
        'main img[alt*="Maybrit Illner"], main img[alt*="Illner"]',
        (el) => el.getAttribute("alt") || ""
      )
      .catch(() => "");

    if (alt && alt.includes(":")) {
      console.log("� Fallback: Alt-Text vom Bild");
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

  // Name-Filter (bereits vorhanden)
  function seemsLikePersonName(name: string): boolean {
    if (!/\S+\s+\S+/.test(name)) return false;
    const re =
      /^[\p{Lu}][\p{L}\-]+(?:\s+(?:von|van|de|da|del|der|den|du|le|la|zu|zur|zum))?(?:\s+[\p{Lu}][\p{L}\-]+)+$/u;
    return re.test(name);
  }

  // Filtere Moderatoren/Hosts aus
  function isModeratorOrHost(name: string): boolean {
    const moderators = [
      "Maybrit Illner",
      "Illner",
      "Maybrit",
      // Weitere bekannte Moderatoren können hier hinzugefügt werden
    ];

    return moderators.some((mod) =>
      name.toLowerCase().includes(mod.toLowerCase())
    );
  }

  // Filter und Duplikat-Entfernung
  const filteredGuests = guestsWithRoles
    .filter((guest) => seemsLikePersonName(guest.name))
    .filter((guest) => !isModeratorOrHost(guest.name)); // Moderatorin ausfiltern

  const uniqueGuests = filteredGuests.reduce(
    (acc: GuestWithRole[], current) => {
      const existing = acc.find((guest) => guest.name === current.name);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    },
    []
  );

  console.log(
    `👥 Gäste gefunden: ${uniqueGuests.map((g) => g.name).join(", ")}`
  );

  // Extrahiere politische Themenbereiche aus der Episodenbeschreibung
  const politicalAreaIds = await extractEpisodeDescription(page);

  return {
    guests: uniqueGuests,
    politicalAreaIds: politicalAreaIds || undefined,
  };
}

export async function crawlNewMaybritIllnerEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Maybrit Illner Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Hole das letzte Datum aus der DB
  const latestDbDate = await getLatestEpisodeDate("Maybrit Illner");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole die neuesten Episode-Links
    const latestEpisodeUrls = await getLatestEpisodeLinks(page);

    if (latestEpisodeUrls.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Filtere nur neue Episoden
    const newEpisodes = filterNewEpisodes(latestEpisodeUrls, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    console.log(`🆕 Crawle ${newEpisodes.length} neue Episoden:`);
    newEpisodes.forEach((ep) => console.log(`   📺 ${ep.date}: ${ep.url}`));

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Verarbeite jede neue Episode
    for (const episode of newEpisodes) {
      try {
        console.log(`\n🎬 Verarbeite Episode vom ${episode.date}`);

        const result = await extractGuestsFromEpisode(page, episode.url);
        const guests = result.guests;
        const politicalAreaIds = result.politicalAreaIds;

        if (guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of guests) {
          console.log(
            `   🔍 Prüfe: ${guest.name}${guest.role ? ` (${guest.role})` : ""}`
          );

          const details = await checkPolitician(guest.name, guest.role);

          if (
            details.isPolitician &&
            details.politicianId &&
            details.politicianName
          ) {
            console.log(
              `      ✅ Politiker: ${details.politicianName} (ID ${
                details.politicianId
              }), Partei: ${details.partyName || "unbekannt"}`
            );
            politicians.push({
              politicianId: details.politicianId,
              politicianName: details.politicianName,
              partyId: details.party,
              partyName: details.partyName,
            });
          } else {
            console.log(`      ❌ Kein Politiker`);
          }

          // Pause zwischen API-Calls
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Nur wenn Episode Politiker hat, füge URL zur Liste hinzu
        if (politicians.length > 0) {
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episode.date,
          });
        }

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Maybrit Illner",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
          );
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Maybrit Illner",
            episode.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        episodesProcessed++;
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
      }
    }

    // Speichere Episode-URLs am Ende
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maybrit Illner",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 Inkrementeller Maybrit Illner Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}
