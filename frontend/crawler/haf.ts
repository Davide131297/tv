import {
  getLatestEpisodeDate,
  insertMultipleTvShowPoliticians,
  checkPoliticianOverride,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  splitFirstLast,
} from "@/lib/supabase-server-utils";
import { Page } from "puppeteer";
import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import { GuestDetails } from "@/types";
import axios from "axios";
import { AbgeordnetenwatchPolitician } from "@/types";
import { getPoliticalArea } from "@/lib/utils";

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
}

const LIST_URL =
  "https://www1.wdr.de/daserste/hartaberfair/sendungen/index.html#goToHead";
const BASE_URL = "https://www1.wdr.de";

async function extractEpisodeLinks(page: Page): Promise<EpisodeLink[]> {
  return await page.evaluate(() => {
    const episodes: EpisodeLink[] = [];

    // Find all episode links - both in main sections and grid sections
    const episodeSelectors = [
      '.modA.modStage .teaser a[href*="/sendungen/"]', // Main featured episode
      '.modD .teaser a[href*="/sendungen/"]', // Grid episodes
    ];

    episodeSelectors.forEach((selector) => {
      const links = document.querySelectorAll(selector);

      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href || href.includes("index.html")) return;

        const titleElement = link.querySelector("h4.headline");
        const title = titleElement?.textContent?.trim() || "";

        // Extract date from title - Hart aber Fair episodes typically have dates in format (DD.MM.YYYY)
        const dateMatch = title.match(/\((\d{2}\.\d{2}\.\d{4})\)/);
        let date = "";

        if (dateMatch) {
          // Convert DD.MM.YYYY to YYYY-MM-DD
          const [day, month, year] = dateMatch[1].split(".");
          date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else {
          // Try to extract from parent heading
          const parentSection = link.closest(".section");
          const heading = parentSection?.querySelector("h2.conHeadline");
          if (heading?.textContent?.includes("vom ")) {
            const headingDate = heading.textContent.match(
              /vom (\d{2}\.\d{2}\.\d{4})/
            );
            if (headingDate) {
              const [day, month, year] = headingDate[1].split(".");
              date = `${year}-${month.padStart(2, "0")}-${day.padStart(
                2,
                "0"
              )}`;
            }
          }
        }

        if (title && href && date) {
          episodes.push({
            url: href,
            title: title.replace(/\s*\(\d{2}\.\d{2}\.\d{4}\)\s*$/, "").trim(), // Remove date from title
            date,
          });
        }
      });
    });

    // Remove duplicates and sort by date (newest first)
    const uniqueEpisodes = episodes.filter(
      (episode, index, arr) =>
        arr.findIndex((e) => e.url === episode.url) === index
    );

    return uniqueEpisodes.sort((a, b) => b.date.localeCompare(a.date));
  });
}

async function extractEpisodeDetails(
  page: Page,
  episodeLink: EpisodeLink
): Promise<EpisodeDetails | null> {
  try {
    // Navigate to the individual episode page
    const fullUrl = episodeLink.url.startsWith("http")
      ? episodeLink.url
      : `${BASE_URL}${episodeLink.url}`;
    console.log(`Navigiere zu Episode: ${fullUrl}`);

    await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extract episode details
    const details = await page.evaluate(() => {
      // Extract description from various possible locations
      let description = "";
      const descSelectors = [
        ".teasertext",
        ".textWrapper p",
        ".mod .text p",
        "p",
      ];

      for (const selector of descSelectors) {
        const descElement = document.querySelector(selector);
        if (descElement?.textContent?.trim()) {
          description = descElement.textContent.trim();
          break;
        }
      }

      // Extract politicians/guests from the dedicated "Gäste" section
      const politicians: Array<{
        name: string;
        party?: string;
        role?: string;
      }> = [];

      // Look for the "Gäste" section specifically
      const gaesteSection = Array.from(
        document.querySelectorAll("h2.conHeadline")
      ).find((h) => h.textContent?.trim() === "Gäste");

      if (gaesteSection) {
        console.log("🎯 Gäste-Sektion gefunden!");

        // Find the parent section of the Gäste headline
        const gaesteContainer = gaesteSection.closest(".section");

        if (gaesteContainer) {
          // Look for guest entries in the slider/carousel
          const guestBoxes = gaesteContainer.querySelectorAll(".box .teaser");

          guestBoxes.forEach((box) => {
            const titleLink = box.querySelector("a");
            const headline = box.querySelector("h4.headline");
            const preHeadline = box
              .querySelector("h4.headline")
              ?.getAttribute("data-pre-headline");

            if (headline && titleLink) {
              const fullTitle = headline.textContent?.trim() || "";

              // Extract name and party from title
              // Format is usually "Name, PARTY" or just "Name"
              let name = "";
              let party = "";

              if (fullTitle.includes(",")) {
                const parts = fullTitle.split(",");
                name = parts[0]?.trim() || "";
                party = parts[1]?.trim() || "";
              } else {
                name = fullTitle;
              }

              // Get role from pre-headline if available
              const role = preHeadline || "";

              if (name && name.length > 2) {
                // Check if we already have this politician (avoid duplicates)
                const existing = politicians.find(
                  (p) => p.name.toLowerCase() === name.toLowerCase()
                );

                if (!existing) {
                  politicians.push({
                    name,
                    party: party || undefined,
                    role: role || undefined,
                  });
                }
              }
            }
          });
        }
      }

      // Fallback: If no guests found in dedicated section, try other methods
      if (politicians.length === 0) {
        console.log(
          "⚠️ Keine Gäste in dedicierter Sektion gefunden, versuche Fallback..."
        );

        // Try to find politician patterns in text content
        const contentSelectors = [
          ".textWrapper",
          ".teasertext",
          ".mod .text",
          ".content",
        ];

        let allText = "";
        contentSelectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (el.textContent) {
              allText += " " + el.textContent;
            }
          });
        });

        // Common German politician titles and roles
        const politicianPatterns = [
          // Pattern: Title Name (Party)
          /(?:Bundesminister|Ministerin|Minister|Kanzler|Kanzlerin|Abgeordnete|Abgeordneter|MdB|Staatssekretär|Staatssekretärin)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)*)\s*\(([^)]+)\)/gi,
          // Pattern: Name (Party), Title
          /([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)*)\s*\(([^)]+)\),?\s*(?:Bundesminister|Ministerin|Minister|Kanzler|Kanzlerin|Abgeordnete|Abgeordneter|MdB|Staatssekretär|Staatssekretärin)/gi,
          // Pattern: Name, Party
          /([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß-]+)*),?\s+(CDU|CSU|SPD|FDP|Grüne|Die Linke|AfD|BSW)/gi,
        ];

        politicianPatterns.forEach((pattern) => {
          let match;
          while ((match = pattern.exec(allText)) !== null) {
            const name = match[1]?.trim();
            const party = match[2]?.trim();

            if (name && name.length > 2) {
              // Check if we already have this politician
              const existing = politicians.find(
                (p) => p.name.toLowerCase() === name.toLowerCase()
              );

              if (!existing) {
                politicians.push({
                  name,
                  party: party || undefined,
                  role: undefined,
                });
              }
            }
          }
        });
      }

      return {
        description,
        politicians,
      };
    });

    return {
      title: episodeLink.title,
      date: episodeLink.date,
      description: details.description,
      politicians: details.politicians,
    };
  } catch (error) {
    console.error(`Fehler beim Extrahieren der Episode-Details:`, error);
    return null;
  }
}

// Hilfsfunktion zur Disambiguierung basierend auf ZDF-Rolle
function disambiguateByRole(
  politicians: AbgeordnetenwatchPolitician[],
  role: string
): AbgeordnetenwatchPolitician | null {
  const roleUpper = role.toUpperCase();

  // Partei-Mappings für die Disambiguierung
  const partyMappings: Record<string, string[]> = {
    CDU: ["CDU", "CHRISTLICH DEMOKRATISCHE UNION"],
    CSU: ["CSU", "CHRISTLICH-SOZIALE UNION"],
    SPD: ["SPD", "SOZIALDEMOKRATISCHE PARTEI"],
    FDP: ["FDP", "FREIE DEMOKRATISCHE PARTEI"],
    GRÜNE: ["BÜNDNIS 90/DIE GRÜNEN", "DIE GRÜNEN"],
    LINKE: ["DIE LINKE"],
    AFD: ["AFD", "ALTERNATIVE FÜR DEUTSCHLAND"],
  };

  // Positionen für die Disambiguierung
  const positionMappings: Record<string, string[]> = {
    BUNDESKANZLER: ["BUNDESKANZLER", "KANZLER"],
    MINISTERPRÄSIDENT: [
      "MINISTERPRÄSIDENT",
      "REGIERUNGSCHEF",
      "LANDESVORSITZENDE",
    ],
    MINISTER: ["MINISTER", "BUNDESMINISTER", "STAATSSEKRETÄR"],
    BUNDESTAG: ["BUNDESTAG", "MDB", "ABGEORDNETE"],
    LANDTAG: ["LANDTAG", "MDL", "LANDESABGEORDNETE"],
  };

  // 1. Versuche Partei-Match
  for (const [party, variants] of Object.entries(partyMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      const partyMatch = politicians.find(
        (p) => p.party && p.party.label.toUpperCase().includes(party)
      );
      if (partyMatch) {
        console.log(`✅ Partei-Match gefunden: ${party}`);
        return partyMatch;
      }
    }
  }

  // 2. Versuche Position-Match
  for (const [position, variants] of Object.entries(positionMappings)) {
    if (variants.some((variant) => roleUpper.includes(variant))) {
      // Für spezifische Positionen, nimm den ersten Treffer
      if (["BUNDESKANZLER", "MINISTERPRÄSIDENT"].includes(position)) {
        console.log(`✅ Position-Match gefunden: ${position}`);
        return politicians[0];
      }
    }
  }

  return null;
}

// Politiker-Prüfung mit Disambiguierung
async function checkPolitician(
  name: string,
  role?: string
): Promise<GuestDetails> {
  // Prüfe zuerst Override-Cases
  const override = checkPoliticianOverride(name);
  if (override) {
    return override;
  }

  const { first, last } = splitFirstLast(name);
  if (!first || !last) {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }

  const url = `https://www.abgeordnetenwatch.de/api/v2/politicians?first_name=${encodeURIComponent(
    first
  )}&last_name=${encodeURIComponent(last)}`;

  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const politicians: AbgeordnetenwatchPolitician[] = data?.data || [];

    if (politicians.length === 0) {
      return {
        name,
        isPolitician: false,
        politicianId: null,
      };
    }

    if (politicians.length === 1) {
      // Nur ein Treffer - verwende ihn direkt
      const hit = politicians[0];
      return {
        name,
        isPolitician: true,
        politicianId: hit.id,
        politicianName: hit.label || name,
        party: hit.party?.id,
        partyName: hit.party?.label,
      };
    }

    // Mehrere Treffer - versuche Disambiguierung über ZDF-Rolle
    if (role && politicians.length > 1) {
      console.log(
        `🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`
      );

      const selectedPolitician = disambiguateByRole(politicians, role);
      if (selectedPolitician) {
        console.log(
          `✅ Politiker ausgewählt: ${selectedPolitician.label} (${selectedPolitician.party?.label})`
        );
        return {
          name,
          isPolitician: true,
          politicianId: selectedPolitician.id,
          politicianName: selectedPolitician.label || name,
          party: selectedPolitician.party?.id,
          partyName: selectedPolitician.party?.label,
        };
      }
    }

    // Fallback: ersten Treffer verwenden
    console.log(
      `⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`
    );
    const hit = politicians[0];
    return {
      name,
      isPolitician: true,
      politicianId: hit.id,
      politicianName: hit.label || name,
      party: hit.party?.id,
      partyName: hit.party?.label,
    };
  } catch {
    return {
      name,
      isPolitician: false,
      politicianId: null,
    };
  }
}

export default async function crawlHartAberFair() {
  console.log("=== Hart aber Fair Crawler gestartet ===");

  const currentYear = new Date().getFullYear();
  console.log(
    `🗓️ Aktuelles Jahr: ${currentYear} - crawle nur Episoden aus ${currentYear}`
  );

  const latestEpisodeDate = await getLatestEpisodeDate("Hart aber fair");
  console.log(
    `Neueste Episode in DB: ${latestEpisodeDate || "Keine vorhanden"}`
  );

  const browser = await createBrowser();
  let processedCount = 0;
  let totalEpisodeLinksInserted = 0;
  let totalPoliticiansInserted = 0;

  try {
    const page = await setupSimplePage(browser);

    // Navigate to the episodes list page
    console.log("Navigiere zur Episoden-Liste...");
    await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 30000 });

    // Extract episode links from the page
    const episodeLinks = await extractEpisodeLinks(page);
    console.log(`${episodeLinks.length} Episoden gefunden`);

    // Filter episodes for current year and new episodes only
    const currentYearEpisodes = episodeLinks.filter((ep) => {
      const episodeYear = parseInt(ep.date.split("-")[0]);
      if (episodeYear < currentYear) return false;
      if (latestEpisodeDate && ep.date <= latestEpisodeDate) return false;
      return true;
    });

    console.log(
      `📺 ${currentYearEpisodes.length} neue Episoden aus ${currentYear} zu verarbeiten`
    );

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Process each episode
    for (const episodeLink of currentYearEpisodes) {
      try {
        console.log(`\n🎬 Verarbeite Episode: ${episodeLink.title}`);
        console.log(`📅 Datum: ${episodeLink.date}`);

        // Extract detailed episode information
        const episodeDetails = await extractEpisodeDetails(page, episodeLink);

        if (!episodeDetails) {
          console.log(
            `❌ Konnte Details für Episode nicht extrahieren: ${episodeLink.title}`
          );
          continue;
        }

        // Process politicians for this episode
        console.log(
          `\n🎭 GÄSTE (${episodeDetails.politicians.length} gefunden):`
        );

        const politiciansToInsert: Array<{
          politicianId: number;
          politicianName: string;
          partyId?: number;
          partyName?: string;
        }> = [];

        for (const politician of episodeDetails.politicians) {
          console.log(`   🔍 Verarbeite: ${politician.name}`);

          const politicianDetails = await checkPolitician(
            politician.name,
            politician.role
          );

          if (
            politicianDetails.isPolitician &&
            politicianDetails.politicianId
          ) {
            politiciansToInsert.push({
              politicianId: politicianDetails.politicianId,
              politicianName:
                politicianDetails.politicianName || politician.name,
              partyId: politicianDetails.party,
              partyName: politicianDetails.partyName,
            });
            console.log(
              `      ✅ Politiker gefunden: ${
                politicianDetails.politicianName
              } (${politicianDetails.partyName || "keine Partei"})`
            );
          } else {
            console.log(`      ❌ Kein Politiker: ${politician.name}`);
          }

          // Add delay to be respectful to external APIs
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Batch insert politicians
        let politiciansInserted = 0;
        if (politiciansToInsert.length > 0) {
          politiciansInserted = await insertMultipleTvShowPoliticians(
            "Hart aber fair",
            episodeDetails.date,
            politiciansToInsert
          );
          console.log(
            `   👥 ${politiciansInserted}/${politiciansToInsert.length} Politiker gespeichert`
          );
        }

        // Speichere politische Themenbereiche
        const politicalAreaIds = await getPoliticalArea(
          episodeDetails.description
        );
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Hart aber fair",
            episodeDetails.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        processedCount++;
        totalPoliticiansInserted += politiciansInserted;

        // Add episode URL if it had politicians
        if (politiciansInserted > 0) {
          const fullUrl = episodeLink.url.startsWith("http")
            ? episodeLink.url
            : `${BASE_URL}${episodeLink.url}`;
          episodeLinksToInsert.push({
            episodeUrl: fullUrl,
            episodeDate: episodeLink.date,
          });
        }

        console.log(
          `\n✅ Episode erfolgreich verarbeitet: ${episodeDetails.title}`
        );
        console.log(
          `📊 ${politiciansInserted}/${episodeDetails.politicians.length} Politiker gespeichert`
        );
        console.log(`📈 Gesamt Episoden verarbeitet: ${processedCount}`);

        // Add delay between episodes
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten der Episode ${episodeLink.title}:`,
          error
        );
        continue;
      }
    }

    // Speichere Episode-URLs am Ende
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Hart aber fair",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }
  } catch (error) {
    console.error("Fehler beim Crawlen:", error);
  } finally {
    await browser.close();
  }

  console.log(`\n=== Crawling abgeschlossen ===`);
  console.log(`${processedCount} neue Episoden verarbeitet`);
  console.log(`${totalPoliticiansInserted} Politiker gesamt eingefügt`);
  console.log(`${totalEpisodeLinksInserted} Episode-URLs eingefügt`);
  console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
}
