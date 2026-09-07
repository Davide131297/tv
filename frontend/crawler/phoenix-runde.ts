import axios from "axios";
import {
  insertMultipleTvShowPoliticians,
  getLatestEpisodeDate,
  insertMultipleShowLinks,
  checkPolitician,
  insertEpisodePoliticalAreas,
} from "@/lib/supabase-server-utils";
import { getPoliticalArea, extractGuestsWithAI } from "@/lib/ai-utils";
import { seemsLikePersonName, isModeratorOrHost } from "@/lib/crawler-utils";

const SHOW_ID = 121346; // Phoenix Runde
const BASE_URL = "https://www.phoenix.de";

const PHOENIX_RUNDE_MODERATORS = [
  "Alexander Kähler",
  "Anke Plättner",
  "Michaela Kolster",
  "Julia Schöning",
];

function cleanAcademicTitles(name: string): string {
  return name
    .replace(
      /\b(Prof\.|Dr\.|h\.c\.|med\.|rer\.|nat\.|pol\.|iur\.|jur\.|phil\.)\s*/gi,
      "",
    )
    .trim();
}

function isPhoenixHost(name: string, dynamicModerator?: string): boolean {
  if (isModeratorOrHost(name, "Phoenix Runde")) return true;
  if (
    dynamicModerator &&
    name.toLowerCase().includes(dynamicModerator.toLowerCase())
  ) {
    return true;
  }
  return PHOENIX_RUNDE_MODERATORS.some((mod) =>
    name.toLowerCase().includes(mod.toLowerCase()),
  );
}

interface PhoenixEpisodeItem {
  artikel_id: number;
  link: string;
  titel: string;
  subtitel: string;
  vorspann?: string;
  sendung?: {
    sendezeit?: string;
  };
}

interface PhoenixListResponse {
  typ: string;
  titel: string;
  content: {
    items: PhoenixEpisodeItem[];
    next_url?: string;
  };
}

interface PhoenixEpisodeDetail {
  id: number;
  titel: string;
  subtitel: string;
  vorspann?: string;
  absaetze?: Array<{
    typ: string;
    text?: string;
  }>;
}

const axiosClient = axios.create({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Haupt-Crawler-Funktion via nativer Phoenix JSON-API
export default async function CrawlPhoenixRunde() {
  const latestDbDate = await getLatestEpisodeDate("Phoenix Runde");
  console.log(`📅 Letztes DB-Datum für Phoenix Runde: ${latestDbDate || "Keines (initialer Lauf)"}`);

  try {
    const currentYear = new Date().getFullYear();
    const allEpisodes: PhoenixEpisodeItem[] = [];
    let nextUrl: string | undefined = `/response/id/${SHOW_ID}`;
    let pageCount = 0;
    const maxPages = 15;

    console.log(`🌐 Rufe Episodenliste via API ab...`);

    while (nextUrl && pageCount < maxPages) {
      const apiUrl: string = nextUrl.startsWith("http")
        ? nextUrl
        : `${BASE_URL}${nextUrl}`;
      const res = await axiosClient.get<PhoenixListResponse>(apiUrl);
      const items = res.data.content?.items || [];
      if (items.length === 0) break;

      allEpisodes.push(...items);
      pageCount++;

      const oldestItem = items[items.length - 1];
      const oldestDate = oldestItem.sendung?.sendezeit
        ? oldestItem.sendung.sendezeit.substring(0, 10)
        : "";
      const oldestYear = oldestDate ? parseInt(oldestDate.substring(0, 4), 10) : currentYear;

      if (oldestYear < currentYear) {
        break;
      }
      if (latestDbDate && oldestDate && oldestDate <= latestDbDate) {
        break;
      }

      nextUrl = res.data.content?.next_url;
    }

    console.log(`📺 ${allEpisodes.length} Episoden über API geladen (${pageCount} Seiten)`);

    if (allEpisodes.length === 0) {
      console.log("❌ Keine Episoden gefunden");
      return {
        message: "Keine Episoden gefunden",
        status: 404,
      };
    }

    // Datumskonvertierung und Filterung (nur aktuelles Jahr, neuer als latestDbDate)
    const filteredEpisodes = allEpisodes
      .map((ep) => {
        const date = ep.sendung?.sendezeit
          ? ep.sendung.sendezeit.substring(0, 10)
          : "";
        const fullUrl = `${BASE_URL}${ep.link}`;
        return { ...ep, formattedDate: date, fullUrl };
      })
      .filter((ep) => {
        if (!ep.formattedDate) return false;
        const year = parseInt(ep.formattedDate.substring(0, 4), 10);
        if (year !== currentYear) return false;
        if (latestDbDate && ep.formattedDate <= latestDbDate) return false;
        return true;
      });

    // Nach Datum aufsteigend sortieren, damit chronologisch eingefügt wird
    filteredEpisodes.sort((a, b) => a.formattedDate.localeCompare(b.formattedDate));

    console.log(`🆕 ${filteredEpisodes.length} neue Episoden zu verarbeiten`);

    if (filteredEpisodes.length === 0) {
      console.log("✅ Keine neuen Episoden zu crawlen");
      return {
        message: "Keine neuen Episoden zu crawlen",
        status: 200,
      };
    }

    let totalPoliticiansInserted = 0;
    let totalEpisodeLinksInserted = 0;
    let totalPoliticalAreasInserted = 0;
    let episodesWithPoliticians = 0;

    const episodeLinksToInsert: { episodeUrl: string; episodeDate: string }[] = [];

    // Verarbeite jede Episode
    for (let i = 0; i < filteredEpisodes.length; i++) {
      const episode = filteredEpisodes[i];
      const episodeDate = episode.formattedDate;

      try {
        // Detailseite als JSON laden
        const detailRes = await axiosClient.get<PhoenixEpisodeDetail>(
          `${BASE_URL}/response/id/${episode.artikel_id}`,
        );
        const detail = detailRes.data;

        // Moderator ermitteln falls im Vorspann angegeben (z. B. "Moderation: Anke Plättner")
        let dynamicModerator: string | undefined;
        if (detail.vorspann) {
          const modMatch = detail.vorspann.match(/Moderation:\s*([^\n,]+)/i);
          if (modMatch) {
            dynamicModerator = modMatch[1].trim();
          }
        }

        // Text aus Absätzen zusammenstellen
        const rawHtml =
          detail.absaetze?.map((a) => a.text || "").join(" ") || "";
        const cleanText = rawHtml
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const textToExtract = cleanText || episode.subtitel;
        if (!textToExtract) continue;

        // Extrahiere Gäste mit AI
        const rawGuestNames = await extractGuestsWithAI(textToExtract);
        if (rawGuestNames.length === 0) continue;

        const guestNames: string[] = [];
        for (const rawName of rawGuestNames) {
          const name = cleanAcademicTitles(rawName);
          if (seemsLikePersonName(name) && !isPhoenixHost(name, dynamicModerator)) {
            if (!guestNames.includes(name)) {
              guestNames.push(name);
            }
          }
        }

        if (guestNames.length === 0) continue;

        // Prüfe jeden Gast auf Politiker-Status
        const politicians = [];
        const combinedText = `${episode.subtitel} ${cleanText}`;

        for (const guestName of guestNames) {
          const roleMatch = combinedText.match(
            new RegExp(
              `${guestName}[^\\n]*?([A-ZÄÖÜ][^,\\n]*?)(?:,|\\n|$)`,
              "i",
            ),
          );
          const role = roleMatch ? roleMatch[1].trim() : undefined;

          const details = await checkPolitician(guestName, role);

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

          // Pause zwischen API-Calls zum Schutz vor Rate-Limits
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Log: Datum + Gäste + Politiker
        console.log(
          `📅 ${episodeDate} | 👥 ${guestNames.join(", ")}${
            politicians.length > 0
              ? ` | ✅ Politiker: ${politicians
                  .map((p) => `${p.politicianName} (${p.partyName || "?"})`)
                  .join(", ")}`
              : ""
          }`,
        );

        // Speichere Politiker und verknüpfte Daten
        if (politicians.length > 0) {
          const inserted = await insertMultipleTvShowPoliticians(
            "Phoenix",
            "Phoenix Runde",
            episodeDate,
            politicians,
          );
          totalPoliticiansInserted += inserted;
          episodesWithPoliticians++;
          episodeLinksToInsert.push({
            episodeUrl: episode.fullUrl,
            episodeDate: episodeDate,
          });

          // Analysiere politische Themen (verwende Titel + Beschreibung)
          const politicalAreaIds =
            (await getPoliticalArea(episode.subtitel + " " + cleanText)) || [];

          // Speichere politische Themenbereiche
          if (politicalAreaIds.length > 0) {
            const insertedAreas = await insertEpisodePoliticalAreas(
              "Phoenix Runde",
              episodeDate,
              politicalAreaIds,
            );
            totalPoliticalAreasInserted += insertedAreas;
          }
        }
      } catch (error: any) {
        console.error(
          `❌ Fehler beim Verarbeiten von Episode "${episode.subtitel}":`,
          error.message,
        );
      }
    }

    // Speichere Episode-URLs
    if (episodeLinksToInsert.length > 0) {
      totalEpisodeLinksInserted = await insertMultipleShowLinks(
        "Phoenix Runde",
        episodeLinksToInsert,
      );
    }

    console.log(`\n=== Phoenix Runde Zusammenfassung ===`);
    console.log(`Episoden verarbeitet: ${filteredEpisodes.length}`);
    console.log(`Episoden mit Politikern: ${episodesWithPoliticians}`);
    console.log(`Politiker eingefügt: ${totalPoliticiansInserted}`);
    console.log(`Themenbereiche eingefügt: ${totalPoliticalAreasInserted}`);
    console.log(`Episode-URLs eingefügt: ${totalEpisodeLinksInserted}`);

    return {
      message: "Phoenix Runde Crawling erfolgreich",
      status: 200,
    };
  } catch (error: any) {
    console.error("❌ Fehler beim Phoenix Runde Crawling:", error);
    return {
      message: "Fehler beim Phoenix Runde Crawling",
      status: 500,
    };
  }
}
