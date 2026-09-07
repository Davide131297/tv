import dotenv from "dotenv";
dotenv.config();

// KI lokal per default aktivieren (falls nicht explizit via env anders gesetzt)
if (process.env.LokalLLM === undefined || process.env.LokalLLM === "") {
  process.env.LokalLLM = "true";
}

import axios from "axios";
import {
  checkPolitician,
  extractGuestsWithAI,
  getPoliticalArea,
} from "../lib/utils.js";
import {
  seemsLikePersonName,
  isModeratorOrHost,
} from "../lib/crawler-utils.js";
import { cleanAcademicTitles } from "../lib/zdf-api.js";

const SHOW_ID = 121511; // Phoenix Persönlich
const BASE_URL = "https://www.phoenix.de";

const PHOENIX_PERSOENLICH_MODERATORS = [
  "Inga Kühn",
  "Jörg Thadeusz",
  "Alfred Schier",
  "Michael Hirz",
  "Eva Lindenau",
  "Thomas Bade",
  "Gerd-Joachim von Fallois",
  "Theo Koll",
  "Anke Plättner",
  "Alexander Kähler",
];

function isPhoenixHost(name: string, dynamicModerator?: string): boolean {
  if (isModeratorOrHost(name, "Phoenix Persönlich")) return true;
  if (
    dynamicModerator &&
    name.toLowerCase().includes(dynamicModerator.toLowerCase())
  ) {
    return true;
  }
  return PHOENIX_PERSOENLICH_MODERATORS.some((mod) =>
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

async function main() {
  console.log("==========================================================");
  console.log(
    "⚡ Teste Phoenix Persönlich Crawler via NATIVE API (ohne Puppeteer)",
  );
  console.log(
    `🤖 Lokale KI aktiv (LokalLLM)? ${
      process.env.LokalLLM === "true"
        ? "JA (LM Studio auf Port 1234)"
        : "NEIN (Google Gemini API)"
    }`,
  );
  console.log("==========================================================\n");

  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const isAll = process.argv.includes("--all");
  const maxEpisodes = isAll
    ? 999
    : limitArg
      ? parseInt(limitArg.split("=")[1], 10)
      : 3;

  try {
    console.log(
      `🌐 Rufe Episodenliste via API ab: ${BASE_URL}/response/id/${SHOW_ID}`,
    );
    const t0 = Date.now();
    const listRes = await axiosClient.get<PhoenixListResponse>(
      `${BASE_URL}/response/id/${SHOW_ID}`,
    );

    const allEpisodes: PhoenixEpisodeItem[] = [
      ...(listRes.data.content?.items || []),
    ];
    let nextUrl = listRes.data.content?.next_url;

    // Optional weitere Seiten laden falls benötigt
    while (nextUrl && allEpisodes.length < maxEpisodes && isAll) {
      const pageRes = await axiosClient.get<PhoenixListResponse>(
        `${BASE_URL}${nextUrl}`,
      );
      const items = pageRes.data.content?.items || [];
      if (items.length === 0) break;
      allEpisodes.push(...items);
      nextUrl = pageRes.data.content?.next_url;
    }

    const durationList = Date.now() - t0;
    console.log(
      `⚡ API-Antwort in ${durationList}ms: ${allEpisodes.length} Episoden gefunden.\n`,
    );

    if (allEpisodes.length === 0) {
      console.log("❌ Keine Episoden gefunden.");
      return;
    }

    const episodesToProcess = allEpisodes.slice(0, maxEpisodes);
    console.log(
      `▶️ Verarbeite die neuesten ${episodesToProcess.length} Episoden (Testlauf ohne DB-Speicherung)\n` +
        `   (Tipp: Nutze --limit=N oder --all für mehr Episoden)\n`,
    );

    for (let i = 0; i < episodesToProcess.length; i++) {
      const ep = episodesToProcess[i];
      const date = ep.sendung?.sendezeit
        ? ep.sendung.sendezeit.substring(0, 10)
        : "unbekannt";
      const fullUrl = `${BASE_URL}${ep.link}`;

      console.log(`----------------------------------------------------------`);
      console.log(
        `🎬 [${i + 1}/${episodesToProcess.length}] Episode: "${ep.subtitel}" (${date})`,
      );
      console.log(`🔗 URL: ${fullUrl} (Artikel-ID: ${ep.artikel_id})`);

      try {
        // Detailseite als JSON laden
        const detailRes = await axiosClient.get<PhoenixEpisodeDetail>(
          `${BASE_URL}/response/id/${ep.artikel_id}`,
        );
        const detail = detailRes.data;

        // Moderator ermitteln falls im Vorspann angegeben (z. B. "Moderation: Theo Koll")
        let dynamicModerator: string | undefined;
        if (detail.vorspann) {
          const modMatch = detail.vorspann.match(/Moderation:\s*([^\n,]+)/i);
          if (modMatch) {
            dynamicModerator = modMatch[1].trim();
            console.log(`🎙️  Moderator: ${dynamicModerator}`);
          }
        }

        // Text aus Absätzen zusammenstellen
        const rawHtml =
          detail.absaetze?.map((a) => a.text || "").join(" ") || "";
        const cleanText = rawHtml
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        const textToExtract = cleanText || ep.subtitel;
        if (!cleanText) {
          console.log(
            "ℹ️ Kein Fließtext in API-Absätzen -> Verwende Episodentitel zur Gäste-Extraktion.",
          );
        } else {
          const previewText = cleanText.substring(0, 160);
          console.log(`📝 Textauszug: "${previewText}..."`);
        }

        console.log(`🤖 Extrahiere Gäste mit KI...`);
        const rawGuests = await extractGuestsWithAI(textToExtract);

        const guestNames: string[] = [];
        for (const rawName of rawGuests) {
          const name = cleanAcademicTitles(rawName);
          if (seemsLikePersonName(name) && !isPhoenixHost(name, dynamicModerator)) {
            if (!guestNames.includes(name)) {
              guestNames.push(name);
            }
          }
        }

        console.log(
          `👥 Extrahierte Gäste (${guestNames.length}): ${
            guestNames.join(", ") || "Keine Gäste gefunden"
          }`,
        );

        // Abgeordnetenwatch Prüfung
        const politiciansFound: string[] = [];
        const nonPoliticians: string[] = [];
        const combinedText = `${ep.subtitel} ${cleanText}`;

        for (const gName of guestNames) {
          const roleMatch = combinedText.match(
            new RegExp(
              `${gName}[^\\n]*?([A-ZÄÖÜ][^,\\n]*?)(?:,|\\n|$)`,
              "i",
            ),
          );
          const role = roleMatch ? roleMatch[1].trim() : undefined;

          const details = await checkPolitician(gName, role);
          await new Promise((resolve) => setTimeout(resolve, 300)); // Rate limit Schutz

          if (details.isPolitician && details.politicianId) {
            politiciansFound.push(
              `${details.politicianName || gName} (${
                details.partyName || "Partei unbekannt"
              }, ID: ${details.politicianId})`,
            );
          } else {
            nonPoliticians.push(gName);
          }
        }

        console.log(`\n🏛️  POLITIKER ERKANNT (${politiciansFound.length}):`);
        if (politiciansFound.length > 0) {
          politiciansFound.forEach((p) => console.log(`   ✅ ${p}`));
        } else {
          console.log(`   (Keine Politiker erkannt)`);
        }

        if (nonPoliticians.length > 0) {
          console.log(
            `👤 Andere Gäste (keine Politiker): ${nonPoliticians.join(", ")}`,
          );
        }

        // Themenanalyse via KI
        try {
          const politicalAreas = await getPoliticalArea(
            ep.subtitel + " " + cleanText,
          );
          if (politicalAreas && politicalAreas.length > 0) {
            console.log(
              `🏷️  Erkannte Themenfeld-IDs: [${politicalAreas.join(", ")}]`,
            );
          }
        } catch (e: any) {
          console.log(`⚠️ Fehler bei Themenanalyse: ${e.message}`);
        }

        console.log("");
      } catch (epError: any) {
        console.error(
          `❌ Fehler bei Episode "${ep.subtitel}":`,
          epError.message,
        );
      }
    }
  } catch (error: any) {
    console.error(
      "❌ Fehler beim Phoenix Persönlich API-Testlauf:",
      error.message,
    );
    if (
      error.message &&
      (error.message.includes("1234") || error.code === "ECONNREFUSED")
    ) {
      console.log(
        "\n💡 Hinweis: Wenn LM Studio nicht läuft, starte die LM Studio App mit einem lokalen Server auf Port 1234 oder führe den Test mit 'LokalLLM=false' aus.",
      );
    }
  }
}

main();
