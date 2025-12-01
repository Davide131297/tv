import { Page } from "puppeteer";
import axios from "axios";
import type { AbgeordnetenwatchPolitician } from "@/types";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  checkPoliticianOverride,
  insertMultipleShowLinks,
  insertEpisodePoliticalAreas,
  splitFirstLast,
} from "@/lib/supabase-server-utils";
import { createBrowser, setupSimplePage } from "@/lib/browser-config";
import { extractGuestsWithAI, getPoliticalArea } from "@/lib/ai-utils";

interface MaischbergerEpisode {
  url: string;
  date: string;
  title: string;
  teaserText: string;
  detailedDescription?: string;
}

interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

const BASE_URL = "https://www.daserste.de";
const LIST_URL =
  "https://www.daserste.de/information/talk/maischberger/sendung/index.html";

const MODEL = process.env.NEXT_PUBLIC_AI_MODEL_NAME;

// Hilfsfunktion: Hole detaillierte Beschreibung von der Episodenseite
async function getEpisodeDetailedDescription(
  page: Page,
  episodeUrl: string
): Promise<number[] | [] | null> {
  try {
    await page.goto(episodeUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Extrahiere alle Beschreibungstexte
    const descriptions = await page.evaluate(() => {
      const texts: string[] = [];

      // Finde alle <p class="text small"> Elemente, die Beschreibungen enthalten
      const paragraphs = document.querySelectorAll("p.text.small");

      for (const p of paragraphs) {
        const text = p.textContent?.trim() || "";

        // Filtere relevante Beschreibungen (nicht die Produktionsinfo)
        if (
          text &&
          text.length > 20 &&
          !text.includes("Gemeinschaftsproduktion") &&
          !text.includes("hergestellt vom") &&
          !text.includes("Vincent productions")
        ) {
          texts.push(text);
        }
      }

      return texts;
    });

    const combinedDescription = descriptions.join(" ");

    const res = await getPoliticalArea(combinedDescription);
    return res;
  } catch (error) {
    console.error(
      `❌ Fehler beim Laden der Episodenseite ${episodeUrl}:`,
      error
    );
    return null;
  }
}

function extractGuestsFallback(teaserText: string): string[] {
  console.log("🔄 Verwende Fallback-Gästeextraktion...");

  // Entferne "Zu Gast:" und ähnliche Prefixe
  const cleanText = teaserText
    .replace(/^.*?Zu Gast:?\s*/i, "")
    .replace(/\s*\|\s*mehr\s*$/i, "");

  // Splitze bei Kommas und "und"
  const parts = cleanText
    .split(/,|\s+und\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const guests: string[] = [];

  for (const part of parts) {
    // Extrahiere Namen (mindestens 2 Wörter, beginnend mit Großbuchstaben)
    const nameMatch = part.match(
      /([A-ZÄÖÜ][a-zäöü\-]+\s+[A-ZÄÖÜ][a-zäöü\-]+(?:\s+[a-zäöü\-]+)*)/
    );
    if (nameMatch) {
      const name = nameMatch[1].trim();
      // Filter: Nur Namen die plausibel sind
      if (
        name.length > 3 &&
        name.includes(" ") &&
        !name.toLowerCase().includes("maischberger")
      ) {
        guests.push(name);
      }
    }
  }

  console.log(`   ✅ Fallback extrahierte ${guests.length} Gäste:`, guests);
  return guests;
}

// Hilfsfunktion zur Disambiguierung basierend auf Partei-Info
function disambiguateByRole(
  politicians: AbgeordnetenwatchPolitician[],
  role: string
): AbgeordnetenwatchPolitician | null {
  const roleUpper = role.toUpperCase();

  // Partei-Mappings
  const partyMappings: Record<string, string[]> = {
    CDU: ["CDU", "CHRISTLICH DEMOKRATISCHE UNION"],
    CSU: ["CSU", "CHRISTLICH-SOZIALE UNION"],
    SPD: ["SPD", "SOZIALDEMOKRATISCHE PARTEI"],
    FDP: ["FDP", "FREIE DEMOKRATISCHE PARTEI"],
    GRÜNE: ["BÜNDNIS 90/DIE GRÜNEN", "DIE GRÜNEN"],
    LINKE: ["DIE LINKE"],
    AFD: ["AFD", "ALTERNATIVE FÜR DEUTSCHLAND"],
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

  return null;
}

// Politiker-Prüfung mit Abgeordnetenwatch API
async function checkPolitician(
  name: string,
  role?: string,
  retries = 3
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

  for (let attempt = 1; attempt <= retries; attempt++) {
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
        const hit = politicians[0];

        // Korrektur: Bayernpartei → CSU (häufiges Problem bei bayerischen CSU-Politikern)
        let correctedPartyName = hit.party?.label;
        if (correctedPartyName === "Bayernpartei") {
          console.log(`🔧 Korrigiere Bayernpartei → CSU für ${hit.label}`);
          correctedPartyName = "CSU";
        }

        return {
          name,
          isPolitician: true,
          politicianId: hit.id,
          politicianName: hit.label || name,
          party: hit.party?.id,
          partyName: correctedPartyName,
        };
      }

      // Mehrere Treffer - versuche Disambiguierung
      if (role && politicians.length > 1) {
        console.log(
          `🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`
        );

        const selectedPolitician = disambiguateByRole(politicians, role);
        if (selectedPolitician) {
          console.log(
            `✅ Politiker ausgewählt: ${selectedPolitician.label} (${selectedPolitician.party?.label})`
          );

          // Korrektur: Bayernpartei → CSU
          let correctedPartyName = selectedPolitician.party?.label;
          if (correctedPartyName === "Bayernpartei") {
            console.log(
              `🔧 Korrigiere Bayernpartei → CSU für ${selectedPolitician.label}`
            );
            correctedPartyName = "CSU";
          }

          return {
            name,
            isPolitician: true,
            politicianId: selectedPolitician.id,
            politicianName: selectedPolitician.label || name,
            party: selectedPolitician.party?.id,
            partyName: correctedPartyName,
          };
        }
      }

      // Fallback: ersten Treffer verwenden
      console.log(
        `⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`
      );
      const hit = politicians[0];

      // Korrektur: Bayernpartei → CSU
      let correctedPartyName = hit.party?.label;
      if (correctedPartyName === "Bayernpartei") {
        console.log(`🔧 Korrigiere Bayernpartei → CSU für ${hit.label}`);
        correctedPartyName = "CSU";
      }

      return {
        name,
        isPolitician: true,
        politicianId: hit.id,
        politicianName: hit.label || name,
        party: hit.party?.id,
        partyName: correctedPartyName,
      };
    } catch (error) {
      console.error(
        `❌ API-Fehler für ${name} (Versuch ${attempt}/${retries}):`,
        error
      );

      if (attempt === retries) {
        return {
          name,
          isPolitician: false,
          politicianId: null,
        };
      }
    }
  }

  // Fallback falls alle Versuche fehlschlagen
  return {
    name,
    isPolitician: false,
    politicianId: null,
  };
}

// Hauptfunktion: Crawle nur NEUE Maischberger Episoden (inkrementell) - NUR 2025
export async function crawlNewMaischbergerEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Maischberger Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);
  console.log(`🎯 Filterung: Nur Episoden aus dem Jahr 2025`);

  // Hole das letzte Datum aus der DB
  const latestDbDate = await await getLatestEpisodeDate("Maischberger");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Crawle nur neue Episoden seit letztem DB-Eintrag
    const newEpisodes = await getNewMaischbergerEpisodes(page, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    // Filtere nur Episoden aus 2025
    const episodes2025 = newEpisodes.filter((episode) => {
      const year = parseInt(episode.date.split("-")[0]);
      return year === 2025;
    });

    if (episodes2025.length === 0) {
      console.log("✅ Keine neuen 2025 Episoden gefunden!");
      return;
    }

    console.log(
      `🆕 Gefunden: ${episodes2025.length} neue 2025 Episoden (von ${newEpisodes.length} gesamt)`
    );
    if (episodes2025.length > 0) {
      console.log(
        `📅 2025 Zeitraum: ${episodes2025[episodes2025.length - 1]?.date} bis ${
          episodes2025[0]?.date
        }`
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs für Batch-Insert
    const episodeLinksToInsert = episodes2025.map((episode) => ({
      episodeUrl: episode.url,
      episodeDate: episode.date,
    }));

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    // Verarbeite jede Episode (älteste zuerst für chronologische Reihenfolge)
    const sortedEpisodes = episodes2025.sort(
      (a: MaischbergerEpisode, b: MaischbergerEpisode) =>
        a.date.localeCompare(b.date)
    );

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${
            sortedEpisodes.length
          }] Verarbeite 2025 Episode vom ${episode.date}: ${episode.title}`
        );

        if (!episode.teaserText || episode.teaserText.length < 10) {
          console.log("   ❌ Kein verwertbarer Teasertext");
          continue;
        }

        // Hole detaillierte Beschreibung von der Episodenseite
        const politicalAreaIds = await getEpisodeDetailedDescription(
          page,
          episode.url
        );

        // Extrahiere Gäste mit AI aus dem kombinierten Text
        const guestNames = await extractGuestsWithAI(episode.teaserText);

        if (guestNames.length === 0) {
          console.log("   ❌ Keine Gäste extrahiert");
          continue;
        }

        console.log(`👥 Gefundene Gäste: ${guestNames.join(", ")}`);

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guestName of guestNames) {
          console.log(`   🔍 Prüfe: ${guestName}`);

          const details = await checkPolitician(guestName);

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

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Maischberger",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker in DB gespeichert`
          );

          console.log("   🏛️  Politiker in dieser Episode:");
          politicians.forEach((pol) => {
            console.log(
              `      - ${pol.politicianName} (${pol.partyName || "unbekannt"})`
            );
          });
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Maischberger",
            episode.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        episodesProcessed++;

        // Fortschritt alle 5 Episoden
        if ((i + 1) % 5 === 0) {
          console.log(
            `\n📊 Zwischenstand: ${episodesProcessed}/${sortedEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker in DB`
          );
        }
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
        episodesWithErrors++;
      }
    }

    // Speichere Episode-URLs am Ende (erste Funktion)
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 Inkrementeller Maischberger 2025 Crawl abgeschlossen!`);
    console.log(
      `📊 2025 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`
    );
    console.log(`👥 Politiker in DB gespeichert: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
    console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);

    if (episodesWithErrors > 0) {
      console.log(
        `⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// Hauptfunktion: Crawle ALLE Maischberger Episoden für 2025 und speichere in DB (Vollständiger Crawl)
export async function crawlMaischberger2025(): Promise<void> {
  console.log("🚀 Starte VOLLSTÄNDIGEN Maischberger 2025 Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);
  console.log(`🎯 Ziel: Alle Episoden ab 21.01.2025 bis heute`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Crawle ALLE verfügbaren Episoden bis 2025 erreicht ist
    const all2025Episodes = await getAllMaischberger2025Episodes(page);

    if (all2025Episodes.length === 0) {
      console.log("❌ Keine 2025 Episoden gefunden");
      return;
    }

    console.log(`📺 Gefunden: ${all2025Episodes.length} Episoden aus 2025`);
    if (all2025Episodes.length > 0) {
      console.log(
        `📅 Zeitraum: ${
          all2025Episodes[all2025Episodes.length - 1]?.date
        } bis ${all2025Episodes[0]?.date}`
      );
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Sammle Episode-URLs nur von Episoden mit politischen Gästen für Batch-Insert
    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] =
      [];

    // Verarbeite jede Episode (älteste zuerst für chronologische Reihenfolge)
    const sortedEpisodes = all2025Episodes.sort(
      (a: MaischbergerEpisode, b: MaischbergerEpisode) =>
        a.date.localeCompare(b.date)
    );

    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${sortedEpisodes.length}] Verarbeite Episode vom ${
            episode.date
          }: ${episode.title}`
        );

        if (!episode.teaserText || episode.teaserText.length < 10) {
          console.log("   ❌ Kein verwertbarer Teasertext");
          continue;
        }

        // Hole detaillierte Beschreibung von der Episodenseite
        const politicalAreaIds = await getEpisodeDetailedDescription(
          page,
          episode.url
        );

        console.log(
          `📝 Teasertext: ${episode.teaserText.substring(0, 100)}...`
        );

        // Extrahiere Gäste mit AI
        const guestNames = await extractGuestsWithAI(episode.teaserText);

        if (guestNames.length === 0) {
          console.log("   ❌ Keine Gäste extrahiert");
          continue;
        }

        console.log(`👥 Gefundene Gäste: ${guestNames.join(", ")}`);

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guestName of guestNames) {
          console.log(`   🔍 Prüfe: ${guestName}`);

          const details = await checkPolitician(guestName);

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

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Maischberger",
            episode.date,
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker in DB gespeichert`
          );

          // Nur wenn Episode Politiker hat, füge URL zur Liste hinzu
          episodeLinksToInsert.push({
            episodeUrl: episode.url,
            episodeDate: episode.date,
          });

          console.log("   🏛️  Politiker in dieser Episode:");
          politicians.forEach((pol) => {
            console.log(
              `      - ${pol.politicianName} (${pol.partyName || "unbekannt"})`
            );
          });
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        // Speichere politische Themenbereiche
        if (politicalAreaIds && politicalAreaIds.length > 0) {
          const insertedAreas = await insertEpisodePoliticalAreas(
            "Maischberger",
            episode.date,
            politicalAreaIds
          );
          console.log(
            `   🏛️  ${insertedAreas}/${politicalAreaIds.length} Themenbereiche gespeichert`
          );
        }

        episodesProcessed++;

        // Fortschritt alle 5 Episoden
        if ((i + 1) % 5 === 0) {
          console.log(
            `\n📊 Zwischenstand: ${episodesProcessed}/${sortedEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker in DB`
          );
        }
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
        episodesWithErrors++;
      }
    }

    // Speichere Episode-URLs am Ende
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Maischberger",
        episodeLinksToInsert
      );
      console.log(
        `📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}/${episodeLinksToInsert.length}`
      );
    }

    console.log(`\n🎉 VOLLSTÄNDIGER Maischberger 2025 Crawl abgeschlossen!`);
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`
    );
    console.log(`👥 Politiker in DB gespeichert: ${totalPoliticiansInserted}`);
    console.log(`📎 Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);
    console.log(`❌ Episoden mit Fehlern: ${episodesWithErrors}`);

    if (episodesWithErrors > 0) {
      console.log(
        `⚠️  ${episodesWithErrors} Episoden hatten Fehler und wurden übersprungen`
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }
}

// Extrahiere ALLE Maischberger Episoden für 2025 (ab 21.01.2025)
async function getAllMaischberger2025Episodes(
  page: Page
): Promise<MaischbergerEpisode[]> {
  console.log("🔍 Lade ALLE Maischberger Episoden für 2025...");

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Cookie-Banner akzeptieren falls vorhanden
  try {
    await page.waitForSelector('button:contains("Akzeptieren")', {
      timeout: 5000,
    });
    await page.click('button:contains("Akzeptieren")');
    console.log("Cookie-Banner akzeptiert");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    console.log("Kein Cookie-Banner gefunden");
  }

  // Warte auf Content
  await page.waitForSelector(".boxCon", { timeout: 15000 });

  const allEpisodes: MaischbergerEpisode[] = [];
  const episodes2025: MaischbergerEpisode[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  let foundPre2025 = false; // Flag um zu stoppen wenn wir vor 2025 angekommen sind

  while (hasMorePages && currentPage <= 50 && !foundPre2025) {
    // Max 50 Seiten zur Sicherheit
    console.log(`📄 Crawle Seite ${currentPage}...`);

    const episodes = await page.evaluate((baseUrl) => {
      const episodes: MaischbergerEpisode[] = [];

      // Finde alle Episode-Boxen
      const boxes = document.querySelectorAll(".box.viewA");
      console.log(`Gefunden: ${boxes.length} Episoden-Boxen auf Seite`);

      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];

        // Datum extrahieren
        const dateElement = box.querySelector("h3.ressort");
        const dateText = dateElement?.textContent || "";
        const dateMatch = dateText.match(
          /Sendung vom (\d{2})\.(\d{2})\.(\d{4})/
        );

        if (!dateMatch) {
          console.log("Kein Datum gefunden in:", dateText);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, day, month, year] = dateMatch;
        const isoDate = `${year}-${month}-${day}`;

        // URL extrahieren
        const linkElement = box.querySelector(
          ".teasertext a"
        ) as HTMLAnchorElement;
        if (!linkElement) {
          console.log("Kein Link gefunden in Box");
          continue;
        }

        let url = linkElement.href;
        if (url.startsWith("/")) {
          url = baseUrl + url;
        }

        // Titel extrahieren
        const titleElement = box.querySelector("h4.headline a");
        const title = titleElement?.textContent?.trim() || "maischberger";

        // Teasertext extrahieren (wichtig für Gäste!)
        const teaserElement = box.querySelector(".teasertext a");
        const teaserText = teaserElement?.textContent?.trim() || "";

        console.log(`Episode gefunden: ${isoDate}, Teaser: "${teaserText}"`);

        episodes.push({
          url,
          date: isoDate,
          title,
          teaserText,
        });
      }

      return episodes;
    }, BASE_URL);

    // Füge Episoden zur Gesamtliste hinzu
    allEpisodes.push(...episodes);

    // Filtere 2025 Episoden (ab 21.01.2025)
    const page2025Episodes = episodes.filter((ep) => {
      const episodeYear = parseInt(ep.date.split("-")[0]);
      if (episodeYear > 2025) return false; // Zukünftige Jahre
      if (episodeYear < 2025) {
        foundPre2025 = true;
        return false; // Vor 2025 -> stoppen
      }
      // 2025: Prüfe ob nach 21.01.2025
      return ep.date >= "2025-01-21";
    });

    episodes2025.push(...page2025Episodes);

    console.log(
      `   ✅ ${episodes.length} Episoden gefunden, ${page2025Episodes.length} davon aus 2025 (Gesamt 2025: ${episodes2025.length})`
    );

    // Stoppe wenn wir Episoden vor 2025 gefunden haben
    if (foundPre2025) {
      console.log(`🛑 Erreicht Episoden vor 2025 - Stoppe Crawling`);
      break;
    }

    // Prüfe ob es eine nächste Seite gibt
    const nextPageLink = await page.$('.button.right a[href*="seite"]');

    if (nextPageLink) {
      console.log(`🔄 Navigiere zur nächsten Seite...`);

      // Klicke auf "weiter" Button
      await nextPageLink.click();
      await page.waitForSelector(".boxCon", { timeout: 15000 });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Kurz warten

      currentPage++;
    } else {
      console.log(`📄 Keine weitere Seite gefunden`);
      hasMorePages = false;
    }
  }

  // Filtere nur gültige 2025 Episoden mit Gäste-Informationen
  const valid2025Episodes = episodes2025.filter((ep) => {
    if (!ep.teaserText || ep.teaserText.length < 10) {
      console.log(`Episode übersprungen (kein Teasertext): ${ep.date}`);
      return false;
    }

    if (ep.teaserText.includes("Zu Gast:")) {
      return true; // Hat Gäste-Info
    }

    if (ep.teaserText.length > 50 && !ep.teaserText.match(/^\s*mehr\s*$/)) {
      return true; // Hat substantiellen Content
    }

    console.log(`Episode übersprungen (keine Gäste-Info): ${ep.date}`);
    return false;
  });

  console.log(
    `📺 Gesamt gefunden: ${allEpisodes.length} Episoden auf ${currentPage} Seiten`
  );
  console.log(`📅 2025 Episoden (ab 21.01.): ${episodes2025.length}`);
  console.log(
    `📋 Gültige 2025 Episoden mit Gäste-Info: ${valid2025Episodes.length}`
  );

  return valid2025Episodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Extrahiere nur NEUE Maischberger Episoden (seit letztem DB-Eintrag)
async function getNewMaischbergerEpisodes(
  page: Page,
  latestDbDate: string | null
): Promise<MaischbergerEpisode[]> {
  console.log("🔍 Lade neue Maischberger Episoden...");
  console.log(`📅 Suche nach Episoden seit: ${latestDbDate || "Beginn"}`);

  await page.goto(LIST_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // Cookie-Banner akzeptieren falls vorhanden
  try {
    await page.waitForSelector('button:contains("Akzeptieren")', {
      timeout: 5000,
    });
    await page.click('button:contains("Akzeptieren")');
    console.log("Cookie-Banner akzeptiert");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    console.log("Kein Cookie-Banner gefunden");
  }

  // Warte auf Content
  await page.waitForSelector(".boxCon", { timeout: 15000 });

  const allEpisodes: MaischbergerEpisode[] = [];
  const newEpisodes: MaischbergerEpisode[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  let reachedLatestDbDate = false; // Flag um zu stoppen wenn wir das letzte DB-Datum erreicht haben

  while (hasMorePages && currentPage <= 20 && !reachedLatestDbDate) {
    // Max 20 Seiten
    console.log(`📄 Crawle Seite ${currentPage}...`);

    const episodes = await page.evaluate((baseUrl) => {
      const episodes: MaischbergerEpisode[] = [];

      // Finde alle Episode-Boxen
      const boxes = document.querySelectorAll(".box.viewA");
      console.log(`Gefunden: ${boxes.length} Episoden-Boxen auf Seite`);

      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];

        // Datum extrahieren
        const dateElement = box.querySelector("h3.ressort");
        const dateText = dateElement?.textContent || "";
        const dateMatch = dateText.match(
          /Sendung vom (\d{2})\.(\d{2})\.(\d{4})/
        );

        if (!dateMatch) {
          console.log("Kein Datum gefunden in:", dateText);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, day, month, year] = dateMatch;
        const isoDate = `${year}-${month}-${day}`;

        // URL extrahieren
        const linkElement = box.querySelector(
          ".teasertext a"
        ) as HTMLAnchorElement;
        if (!linkElement) {
          console.log("Kein Link gefunden in Box");
          continue;
        }

        let url = linkElement.href;
        if (url.startsWith("/")) {
          url = baseUrl + url;
        }

        // Titel extrahieren
        const titleElement = box.querySelector("h4.headline a");
        const title = titleElement?.textContent?.trim() || "maischberger";

        // Teasertext extrahieren (wichtig für Gäste!)
        const teaserElement = box.querySelector(".teasertext a");
        const teaserText = teaserElement?.textContent?.trim() || "";

        console.log(`Episode gefunden: ${isoDate}, Teaser: "${teaserText}"`);

        episodes.push({
          url,
          date: isoDate,
          title,
          teaserText,
        });
      }

      return episodes;
    }, BASE_URL);

    // Füge Episoden zur Gesamtliste hinzu
    allEpisodes.push(...episodes);

    // Filtere neue Episoden basierend auf dem letzten DB-Datum
    const pageNewEpisodes = episodes.filter((ep) => {
      // Falls kein DB-Datum vorhanden, sind alle Episoden neu
      if (!latestDbDate) return true;

      // Prüfe ob Episode nach dem letzten DB-Datum liegt
      const isNewer = ep.date > latestDbDate;

      if (!isNewer && ep.date <= latestDbDate) {
        console.log(
          `Episode erreicht bekanntes Datum: ${ep.date} <= ${latestDbDate}`
        );
        reachedLatestDbDate = true;
      }

      return isNewer;
    });

    // Nur gültige neue Episoden mit Gäste-Informationen hinzufügen
    const validPageNewEpisodes = pageNewEpisodes.filter((ep) => {
      if (!ep.teaserText || ep.teaserText.length < 10) {
        console.log(`Episode übersprungen (kein Teasertext): ${ep.date}`);
        return false;
      }

      if (ep.teaserText.includes("Zu Gast:")) {
        return true; // Hat Gäste-Info
      }

      if (ep.teaserText.length > 50 && !ep.teaserText.match(/^\s*mehr\s*$/)) {
        return true; // Hat substantiellen Content
      }

      console.log(`Episode übersprungen (keine Gäste-Info): ${ep.date}`);
      return false;
    });

    newEpisodes.push(...validPageNewEpisodes);

    console.log(
      `   ✅ ${episodes.length} Episoden gefunden, ${validPageNewEpisodes.length} davon neu und gültig (Gesamt neu: ${newEpisodes.length})`
    );

    // Stoppe wenn wir das letzte DB-Datum erreicht haben
    if (reachedLatestDbDate) {
      console.log(
        `🛑 Erreicht bekanntes Datum ${latestDbDate} - Stoppe Crawling`
      );
      break;
    }

    // Prüfe ob es eine nächste Seite gibt
    const nextPageLink = await page.$('.button.right a[href*="seite"]');

    if (nextPageLink) {
      console.log(`🔄 Navigiere zur nächsten Seite...`);

      // Klicke auf "weiter" Button
      await nextPageLink.click();
      await page.waitForSelector(".boxCon", { timeout: 15000 });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Kurz warten

      currentPage++;
    } else {
      console.log(`📄 Keine weitere Seite gefunden`);
      hasMorePages = false;
    }
  }

  console.log(
    `📺 Gesamt durchsucht: ${allEpisodes.length} Episoden auf ${currentPage} Seiten`
  );
  console.log(`🆕 Neue gültige Episoden: ${newEpisodes.length}`);

  return newEpisodes.sort((a, b) => b.date.localeCompare(a.date)); // Neueste zuerst
}

// Funktion zum Löschen aller Maischberger-Daten aus der Tabelle
export async function clearMaischbergerData(): Promise<number> {
  console.log("🗑️  Lösche alle Maischberger-Daten aus tv_show_politicians...");

  const { supabase } = await import("@/lib/supabase");

  const { error, count } = await supabase
    .from("tv_show_politicians")
    .delete({ count: "exact" })
    .eq("show_name", "Maischberger");

  if (error) {
    console.error("❌ Fehler beim Löschen:", error);
    throw error;
  }

  const deletedCount = count || 0;
  console.log(`✅ ${deletedCount} Maischberger-Einträge gelöscht`);

  return deletedCount;
}
