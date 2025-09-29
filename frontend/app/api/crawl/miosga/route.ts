import { Page } from "puppeteer";
import axios from "axios";

import {
  initTvShowPoliticiansTable,
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  checkPoliticianOverride,
} from "@/lib/supabase-server-utils";

import type {
  AbgeordnetenwatchPolitician,
  GuestDetails,
  GuestWithRole,
} from "@/types";
import { NextRequest, NextResponse } from "next/server";
import { createBrowser, setupSimplePage } from "@/lib/browser-config";

const LIST_URL =
  "https://www.ardaudiothek.de/sendung/caren-miosga/urn:ard:show:d6e5ba24e1508004/";

// Hilfsfunktion: Name in Vor- und Nachname aufteilen
function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
}

// Hilfsfunktion zur Disambiguierung basierend auf Beschreibung/Rolle
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

    // Spezialbehandlung für Markus Söder - immer CSU wählen
    if (
      name.includes("Markus") &&
      (name.includes("Söder") || name.includes("Soder"))
    ) {
      console.log(
        `🎯 Spezialbehandlung für Markus Söder - wähle CSU-Politiker`
      );
      const csuSoeder = politicians.find((p) => p.party?.label === "CSU");
      if (csuSoeder) {
        console.log(
          `✅ CSU-Söder gefunden: ${csuSoeder.label} (ID: ${csuSoeder.id})`
        );
        return {
          name,
          isPolitician: true,
          politicianId: csuSoeder.id,
          politicianName: csuSoeder.label || name,
          party: csuSoeder.party?.id,
          partyName: csuSoeder.party?.label,
        };
      }
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

    // Mehrere Treffer - versuche Disambiguierung über Rolle/Beschreibung
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

// Extrahiere Datum aus ARD Audiothek HTML (DD.MM.YYYY Format)
function parseISODateFromArdHtml(dateText: string): string | null {
  // Format: "21.09.2025" -> "2025-09-21"
  const match = dateText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

// Extrahiere die neuesten Episode-Links von der ARD Audiothek mit Gäste-Informationen
async function getLatestEpisodeLinks(
  page: Page,
  limit = 10
): Promise<
  Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }>
> {
  console.log("🔍 Lade die neuesten Caren Miosga Episode-Links...");

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
    console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
  }

  // Warte auf die Episode-Liste
  await page.waitForSelector('[itemprop="itemListElement"]', {
    timeout: 15000,
  });

  // Extrahiere Episode-Informationen UND Gäste basierend auf dem bereitgestellten HTML
  const episodes = await page.evaluate((limitParam) => {
    const episodes: Array<{
      url: string;
      date: string;
      title: string;
      guests: Array<{ name: string; role?: string }>;
    }> = [];

    // Finde alle Episode-Container
    const episodeElements = document.querySelectorAll(
      '[itemprop="itemListElement"]'
    );

    for (let i = 0; i < Math.min(episodeElements.length, limitParam); i++) {
      const episode = episodeElements[i];

      // Suche nach Link
      const linkElement = episode.querySelector(
        'a[itemprop="url"]'
      ) as HTMLAnchorElement;
      if (!linkElement) continue;

      const url = linkElement.href;

      // Suche nach Datum (Format DD.MM.YYYY)
      const dateElement = episode.querySelector(".i1cdaksz");
      const dateText = dateElement?.textContent?.trim() || "";

      // Suche nach Titel
      const titleElement = episode.querySelector("h3");
      const title = titleElement?.textContent?.trim() || "";

      // Extrahiere Gäste aus der Beschreibung
      const descriptionElement = episode.querySelector(
        "p.b1ja19fa.b11cvmny.bicmnlc._suw2zx"
      );
      const description = descriptionElement?.textContent?.trim() || "";

      const guests: Array<{ name: string; role?: string }> = [];

      console.log(
        `Debug - Episode "${title}": Beschreibung = "${description}"`
      );

      if (description && description.includes("Caren Miosga")) {
        console.log(
          "✓ Episode Beschreibung mit Caren Miosga gefunden:",
          description
        );

        // Extrahiere Namen nach "Caren Miosga mit" Pattern
        const patterns = [
          /Caren Miosga (?:mit|spricht mit)\s+(.+?)(?:\.|$)/i,
          /Caren Miosga.*?mit\s+(.+?)(?:\.|$)/i,
        ];
        for (const pattern of patterns) {
          const match = description.match(pattern);
          if (match) {
            const guestText = match[1];

            // Splitze bei Kommata und "und"
            const guestParts = guestText
              .split(/,|\sund\s/)
              .map((part) => part.trim());

            for (const part of guestParts) {
              // Verschiedene Patterns für Namen mit Berufsbezeichnungen
              let name = "";
              let role = "";

              // Pattern 1: "Berufsbezeichnung Name" (z.B. "Linke-Politikerin Heidi Reichinnek")
              let match1 = part.match(
                /^([\w\-]+(?:\-[\w]+)?)\s+([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
              );
              if (match1) {
                role = match1[1];
                name = match1[2];
              }

              // Pattern 2: "Name" ohne Berufsbezeichnung
              if (!name) {
                match1 = part.match(
                  /^([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
                );
                if (match1) {
                  name = match1[1];
                }
              }

              // Pattern 3: "Berufsbezeichnung Name Name" (z.B. "Ökonomin Philippa Sigl-Glöckner")
              if (!name) {
                match1 = part.match(
                  /^([\w]+)\s+([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
                );
                if (match1) {
                  role = match1[1];
                  name = match1[2];
                }
              }

              // Bereinige den Namen
              if (name) {
                name = name.trim().replace(/^[^\w]+|[^\w]+$/g, "");

                // Filter: Nur Namen die wie echte Personen aussehen
                if (
                  name.length > 3 &&
                  name.includes(" ") &&
                  !name.toLowerCase().includes("caren") &&
                  !name.toLowerCase().includes("miosga")
                ) {
                  guests.push({ name, role: role || undefined });
                }
              }
            }
            break;
          }
        }
      }

      if (url && dateText && title) {
        episodes.push({ url, date: dateText, title, guests });
      }
    }

    return episodes;
  }, limit);

  console.log(`📺 Gefunden: ${episodes.length} Episode-Links`);

  // Konvertiere Datumsformat und filtere ungültige
  const episodesWithISODate = episodes
    .map((ep) => ({
      ...ep,
      isoDate: parseISODateFromArdHtml(ep.date),
    }))
    .filter((ep) => ep.isoDate !== null);

  return episodesWithISODate.map((ep) => ({
    url: ep.url,
    date: ep.isoDate!,
    title: ep.title,
    guests: ep.guests,
  }));
}

// Extrahiere ALLE verfügbaren Episode-Links durch Scrollen mit Gäste-Informationen
async function getAllEpisodeLinks(
  page: Page
): Promise<
  Array<{ url: string; date: string; title: string; guests: GuestWithRole[] }>
> {
  console.log("🔍 Lade ALLE verfügbaren Caren Miosga Episode-Links...");

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
    console.log("Kein Cookie-Banner gefunden oder bereits akzeptiert");
  }

  const allEpisodes = new Map<
    string,
    { url: string; date: string; title: string; guests: GuestWithRole[] }
  >();
  let previousCount = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 50; // Verhindere Endlosschleife

  console.log("📜 Scrolle für alle verfügbaren Episoden...");

  while (scrollAttempts < maxScrollAttempts) {
    // Sammle alle aktuell sichtbaren Episode-Informationen UND Gäste
    const currentEpisodes = await page.evaluate(() => {
      const episodes: Array<{
        url: string;
        date: string;
        title: string;
        guests: Array<{ name: string; role?: string }>;
      }> = [];

      // Finde alle Episode-Container
      const episodeElements = document.querySelectorAll(
        '[itemprop="itemListElement"]'
      );

      for (const episode of episodeElements) {
        // Suche nach Link
        const linkElement = episode.querySelector(
          'a[itemprop="url"]'
        ) as HTMLAnchorElement;
        if (!linkElement) continue;

        const url = linkElement.href;

        // Suche nach Datum
        const dateElement = episode.querySelector(".i1cdaksz");
        const dateText = dateElement?.textContent?.trim() || "";

        // Suche nach Titel
        const titleElement = episode.querySelector("h3");
        const title = titleElement?.textContent?.trim() || "";

        // Extrahiere Gäste aus der Beschreibung
        const descriptionElement = episode.querySelector(
          "p.b1ja19fa.b11cvmny.bicmnlc._suw2zx"
        );
        const description = descriptionElement?.textContent?.trim() || "";

        const guests: Array<{ name: string; role?: string }> = [];

        console.log(
          `Debug - Episode "${title}": Beschreibung = "${description}"`
        );

        if (description && description.includes("Caren Miosga")) {
          console.log(
            "✓ Episode Beschreibung mit Caren Miosga gefunden:",
            description
          );

          // Extrahiere Namen nach "Caren Miosga mit" Pattern
          const patterns = [
            /Caren Miosga (?:mit|spricht mit)\s+(.+?)(?:\.|$)/i,
            /Caren Miosga.*?mit\s+(.+?)(?:\.|$)/i,
          ];

          for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
              const guestText = match[1];
              console.log("Gefundener Gästetext:", guestText);

              // Splitze bei Kommata und "und"
              const guestParts = guestText
                .split(/,|\sund\s/)
                .map((part) => part.trim());
              console.log("Gäste-Teile:", guestParts);

              for (const part of guestParts) {
                console.log(`Verarbeite Teil: "${part}"`);

                // Verschiedene Patterns für Namen mit Berufsbezeichnungen
                let name = "";
                let role = "";

                // Pattern 1: "Berufsbezeichnung Name" (z.B. "Linke-Politikerin Heidi Reichinnek")
                let match1 = part.match(
                  /^([\w\-]+(?:\-[\w]+)?)\s+([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
                );
                if (match1) {
                  role = match1[1];
                  name = match1[2];
                  console.log(
                    `Pattern 1 Match: Name="${name}", Rolle="${role}"`
                  );
                }

                // Pattern 2: "Name" ohne Berufsbezeichnung
                if (!name) {
                  match1 = part.match(
                    /^([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
                  );
                  if (match1) {
                    name = match1[1];
                    console.log(`Pattern 2 Match: Name="${name}"`);
                  }
                }

                // Pattern 3: "Berufsbezeichnung Name Name" (z.B. "Ökonomin Philippa Sigl-Glöckner")
                if (!name) {
                  match1 = part.match(
                    /^([\w]+)\s+([A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü\-]+)+)/
                  );
                  if (match1) {
                    role = match1[1];
                    name = match1[2];
                    console.log(
                      `Pattern 3 Match: Name="${name}", Rolle="${role}"`
                    );
                  }
                }

                // Bereinige den Namen (entferne führende/nachfolgende Sonderzeichen)
                if (name) {
                  name = name.trim().replace(/^[^\w]+|[^\w]+$/g, "");

                  // Filter: Nur Namen die wie echte Personen aussehen
                  if (
                    name.length > 3 &&
                    name.includes(" ") &&
                    !name.toLowerCase().includes("caren") &&
                    !name.toLowerCase().includes("miosga")
                  ) {
                    console.log(
                      `✓ Gültiger Gast gefunden: "${name}" (Rolle: "${role}")`
                    );
                    guests.push({ name, role: role || undefined });
                  } else {
                    console.log(`✗ Name gefiltert: "${name}"`);
                  }
                } else {
                  console.log(`✗ Kein Name extrahiert aus: "${part}"`);
                }
              }
              break;
            }
          }
        }

        if (url && dateText && title) {
          episodes.push({ url, date: dateText, title, guests });
        }
      }

      return episodes;
    });

    // Füge neue Episodes hinzu (verwende URL als Key für Duplikatsvermeidung)
    currentEpisodes.forEach((ep) => {
      const isoDate = parseISODateFromArdHtml(ep.date);
      if (isoDate) {
        allEpisodes.set(ep.url, {
          url: ep.url,
          date: isoDate,
          title: ep.title,
          guests: ep.guests,
        });
      }
    });

    console.log(
      `   📊 Gefunden: ${allEpisodes.size} Episoden (Runde ${
        scrollAttempts + 1
      })`
    );

    // Wenn keine neuen Episodes gefunden wurden, sind wir am Ende
    if (allEpisodes.size === previousCount) {
      console.log("   ✅ Keine neuen Episoden mehr gefunden");
      break;
    }

    previousCount = allEpisodes.size;
    scrollAttempts++;

    // Scrolle nach unten für Lazy Loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });

    // Warte auf neuen Content
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Prüfe auf "Mehr laden" Button oder ähnliches
    try {
      const loadMoreButton = await page.$(
        'button[data-tracking*="load"], button:contains("Mehr"), button:contains("Weitere")'
      );
      if (loadMoreButton) {
        console.log("   🔄 Klicke 'Mehr laden' Button...");
        await loadMoreButton.click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch {
      // Kein Load-More Button gefunden, das ist ok
    }
  }

  const finalEpisodes = Array.from(allEpisodes.values());
  console.log(`📺 Gesamt gefunden: ${finalEpisodes.length} Episode-Links`);

  // Sortiere nach Datum (neuste zuerst)
  const sortedEpisodes = finalEpisodes.sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  if (sortedEpisodes.length > 0) {
    console.log(
      `📅 Zeitraum: ${sortedEpisodes[sortedEpisodes.length - 1]?.date} bis ${
        sortedEpisodes[0]?.date
      }`
    );
  }

  return sortedEpisodes;
}

// Filtere nur neue Episoden (neuere als das letzte Datum in der DB)
function filterNewEpisodes(
  episodes: Array<{
    url: string;
    date: string;
    title: string;
    guests: GuestWithRole[];
  }>,
  latestDbDate: string | null
): Array<{
  url: string;
  date: string;
  title: string;
  guests: GuestWithRole[];
}> {
  console.log(
    `🗓️  Letzte Caren Miosga Episode in DB: ${latestDbDate || "Keine"}`
  );

  if (!latestDbDate) {
    console.log("📋 Keine Episoden in DB - alle sind neu");
    return episodes;
  }

  // Hilfsfunktion: Konvertiere verschiedene Datumsformate zu yyyy-mm-dd für Vergleich
  function dateToSortable(dateStr: string): string {
    if (dateStr.includes(".")) {
      // Format: dd.mm.yyyy (aus DB)
      const [day, month, year] = dateStr.split(".");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else if (dateStr.includes("-")) {
      // Format: yyyy-mm-dd (von Website)
      return dateStr;
    }
    console.error(`ERROR: Unknown date format: "${dateStr}"`);
    return dateStr;
  }

  const latestDbDateSortable = dateToSortable(latestDbDate);

  const newEpisodes = episodes.filter((ep) => {
    const episodeDateSortable = dateToSortable(ep.date);
    return episodeDateSortable > latestDbDateSortable;
  });

  console.log(
    `🆕 ${newEpisodes.length} neue Episoden gefunden (nach ${latestDbDate})`
  );

  return newEpisodes.sort((a, b) => {
    const aSort = dateToSortable(a.date);
    const bSort = dateToSortable(b.date);
    return bSort.localeCompare(aSort); // Neueste zuerst
  });
}

// Hilfsfunktion: Konvertiere dd.mm.yyyy zu yyyy-mm-dd für DB-Konsistenz
function formatDateForDB(dateStr: string): string {
  if (dateStr.includes(".")) {
    // Format: dd.mm.yyyy -> yyyy-mm-dd
    const [day, month, year] = dateStr.split(".");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Falls bereits im richtigen Format
  return dateStr;
}

// Hauptfunktion: Crawle nur neue Episoden
async function crawlNewCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte inkrementellen Caren Miosga Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Stelle sicher dass die Tabelle existiert
  initTvShowPoliticiansTable();

  // Hole das letzte Datum aus der DB
  const latestDbDate = await getLatestEpisodeDate("Caren Miosga");
  console.log(`🗃️  Letzte Episode in DB: ${latestDbDate || "Keine"}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole die neuesten Episode-Links
    const latestEpisodes = await getLatestEpisodeLinks(page);

    if (latestEpisodes.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Filtere nur neue Episoden
    const newEpisodes = filterNewEpisodes(latestEpisodes, latestDbDate);

    if (newEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden gefunden - alles aktuell!");
      return;
    }

    console.log(`🆕 Crawle ${newEpisodes.length} neue Episoden:`);
    newEpisodes.forEach((ep) => console.log(`   📺 ${ep.date}: ${ep.title}`));

    let totalPoliticiansInserted = 0;
    let episodesProcessed = 0;

    // Verarbeite jede neue Episode
    for (const episode of newEpisodes) {
      try {
        console.log(
          `\n🎬 Verarbeite Episode vom ${episode.date}: ${episode.title}`
        );
        console.log(
          `👥 Gefundene Gäste: ${
            episode.guests.map((g) => g.name).join(", ") || "Keine"
          }`
        );

        if (episode.guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of episode.guests) {
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

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Caren Miosga",
            formatDateForDB(episode.date),
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
          );
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        episodesProcessed++;
      } catch (error) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode ${episode.date}:`,
          error
        );
      }
    }

    console.log(`\n🎉 Inkrementeller Caren Miosga Crawl abgeschlossen!`);
    console.log(`📊 Episoden verarbeitet: ${episodesProcessed}`);
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Hauptfunktion: VOLLSTÄNDIGER historischer Crawl ALLER Episoden
async function crawlAllCarenMiosgaEpisodes(): Promise<void> {
  console.log("🚀 Starte VOLLSTÄNDIGEN Caren Miosga Crawler...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  // Stelle sicher dass die Tabelle existiert
  initTvShowPoliticiansTable();

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole ALLE verfügbaren Episode-Links
    const allEpisodes = await getAllEpisodeLinks(page);

    if (allEpisodes.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    // Sortiere für historischen Crawl (älteste zuerst)
    const sortedEpisodes = allEpisodes.sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    console.log(`📺 Gefunden: ${sortedEpisodes.length} Episoden zum Crawlen`);
    if (sortedEpisodes.length > 0) {
      console.log(
        `📅 Zeitraum: ${sortedEpisodes[0]?.date} bis ${
          sortedEpisodes[sortedEpisodes.length - 1]?.date
        }`
      );
    }

    let totalPoliticiansInserted = 0;
    let episodesProcessed = 0;
    let episodesWithErrors = 0;

    // Verarbeite jede Episode
    for (let i = 0; i < sortedEpisodes.length; i++) {
      const episode = sortedEpisodes[i];

      try {
        console.log(
          `\n🎬 [${i + 1}/${sortedEpisodes.length}] Verarbeite Episode vom ${
            episode.date
          }: ${episode.title}`
        );
        console.log(
          `👥 Gefundene Gäste: ${
            episode.guests.map((g) => g.name).join(", ") || "Keine"
          }`
        );

        if (episode.guests.length === 0) {
          console.log("   ❌ Keine Gäste gefunden");
          continue;
        }

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        for (const guest of episode.guests) {
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

        // Speichere Politiker in die Datenbank
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Caren Miosga",
            formatDateForDB(episode.date),
            politicians
          );

          totalPoliticiansInserted += inserted;
          console.log(
            `   💾 ${inserted}/${politicians.length} Politiker gespeichert`
          );
        } else {
          console.log(`   📝 Keine Politiker in dieser Episode`);
        }

        episodesProcessed++;

        // Fortschritt alle 10 Episoden
        if ((i + 1) % 10 === 0) {
          console.log(
            `\n📊 Zwischenstand: ${episodesProcessed}/${sortedEpisodes.length} Episoden, ${totalPoliticiansInserted} Politiker`
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

    console.log(`\n🎉 VOLLSTÄNDIGER Caren Miosga Crawl abgeschlossen!`);
    console.log(
      `📊 Episoden verarbeitet: ${episodesProcessed}/${sortedEpisodes.length}`
    );
    console.log(`👥 Politiker eingefügt: ${totalPoliticiansInserted}`);
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

// Test-Funktion: Crawle die letzten 10 Episoden nur für Console-Output
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function testCrawlLast10Episodes(): Promise<void> {
  console.log("🚀 Teste Caren Miosga Crawler - letzte 10 Episoden...");
  console.log(`📅 Datum: ${new Date().toISOString()}`);

  const browser = await createBrowser();

  try {
    const page = await setupSimplePage(browser);

    // Hole die neuesten 10 Episode-Links
    const latestEpisodes = await getLatestEpisodeLinks(page, 10);

    if (latestEpisodes.length === 0) {
      console.log("❌ Keine Episode-Links gefunden");
      return;
    }

    console.log(`📺 Gefunden: ${latestEpisodes.length} Episode-Links`);
    console.log("\n" + "=".repeat(80));

    // Verarbeite jede Episode für Test-Output
    for (let i = 0; i < latestEpisodes.length; i++) {
      const episode = latestEpisodes[i];

      console.log(
        `\n🎬 [${i + 1}/${latestEpisodes.length}] Episode vom ${episode.date}`
      );
      console.log(`📺 Titel: ${episode.title}`);
      console.log(`🔗 URL: ${episode.url}`);
      console.log(
        `👥 Gefundene Gäste: ${
          episode.guests.length > 0
            ? episode.guests.map((g) => g.name).join(", ")
            : "Keine"
        }`
      );

      if (episode.guests.length === 0) {
        console.log("   ❌ Keine Gäste gefunden - überspringe Episode");
        continue;
      }

      console.log("\n   🔍 Prüfe Politiker-Status der Gäste:");

      // Prüfe jeden Gast auf Politiker-Status
      for (let j = 0; j < episode.guests.length; j++) {
        const guest = episode.guests[j];
        console.log(
          `\n   👤 [${j + 1}/${episode.guests.length}] ${guest.name}${
            guest.role ? ` (${guest.role})` : ""
          }`
        );

        try {
          const details = await checkPolitician(guest.name, guest.role);

          if (
            details.isPolitician &&
            details.politicianId &&
            details.politicianName
          ) {
            console.log(`      ✅ POLITIKER GEFUNDEN!`);
            console.log(`         Name: ${details.politicianName}`);
            console.log(`         ID: ${details.politicianId}`);
            console.log(
              `         Partei: ${details.partyName || "unbekannt"} (ID: ${
                details.party || "N/A"
              })`
            );
          } else {
            console.log(
              `      ❌ Kein Politiker (nicht in Abgeordnetenwatch gefunden)`
            );
          }
        } catch (error) {
          console.log(`      ⚠️  Fehler bei Politiker-Prüfung: ${error}`);
        }

        // Pause zwischen API-Calls
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      console.log("\n" + "-".repeat(60));
    }

    console.log("\n" + "=".repeat(80));
    console.log(
      `🎉 Test-Crawl abgeschlossen! ${latestEpisodes.length} Episoden analysiert.`
    );
    console.log("💡 Keine Daten wurden in die Datenbank geschrieben.");
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  let runType: "incremental" | "full" = "incremental"; // Default fallback

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch (error) {
    console.log(
      "Fehler beim Parsen des Request Body - verwende Default 'incremental':",
      error
    );
  }

  console.log(`\n\n=== Caren Miosga Crawler gestartet (${runType}) ===`);
  try {
    if (runType === "incremental") {
      console.log("Starte inkrementellen Crawl...");
      await crawlNewCarenMiosgaEpisodes();
    } else if (runType === "full") {
      console.log("Starte vollständigen Crawl...");
      await crawlAllCarenMiosgaEpisodes();
    }
    return NextResponse.json({
      message: "Caren Miosga Crawl erfolgreich abgeschlossen",
      status: 200,
    });
  } catch (error) {
    console.error("Fehler im Caren Miosga Crawl:", error);
    return NextResponse.json({ message: "Crawl fehlgeschlagen", status: 500 });
  }
}
