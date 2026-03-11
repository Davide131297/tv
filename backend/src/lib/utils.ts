import { VertexAI } from "@google-cloud/vertexai";
import { supabase } from "../supabase.js";
import dotenv from "dotenv";
import { AbgeordnetenwatchPolitician } from "../types/abgeordnetenwatch.js";
import axios from "axios";

dotenv.config();

// Google GenAI setup mit Vertex AI (Lazy Initialization)
let vertexAI: VertexAI | null = null;
const googleModel = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const projectId = "polittalk-watcher";

    vertexAI = new VertexAI({
      project: projectId,
      location: "europe-west1",
    });

    console.log(`✅ Vertex AI initialisiert (Project: ${projectId})`);
  }
  return vertexAI;
}

// Rate-Limiting für AI-Requests
let aiRequestCount = 0;
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 4000;
const MAX_RETRIES = 3;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const waitTime = REQUEST_DELAY_MS - timeSinceLastRequest;
    console.log(`   ⏱️ Warte ${waitTime}ms wegen Rate Limit...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  aiRequestCount++;
}

interface InsertShowLinkData {
  show_name: string;
  episode_url: string;
  episode_date: string;
}

interface InsertTvShowPoliticianData {
  tv_channel?: string;
  show_name: string;
  episode_date: string;
  politician_id: number;
  politician_name: string;
  party_id?: number;
  party_name?: string;
}

export interface GuestDetails {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
}

// Spezielle Override-Cases für bestimmte Politiker
export const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    politicianName: "Manfred Weber",
    party: 3, // CSU
    partyName: "CSU",
  },
  "Michael Kretschmer": {
    name: "Michael Kretschmer",
    isPolitician: true,
    politicianId: 79225,
    politicianName: "Michael Kretschmer",
    party: 2, // CDU
    partyName: "CDU",
  },
  "Philipp Türmer": {
    name: "Philipp Türmer",
    isPolitician: true,
    politicianId: 999001, // Custom ID for politician not in Abgeordnetenwatch
    politicianName: "Philipp Türmer",
    party: 1, // SPD
    partyName: "SPD",
  },
  "Jan van": {
    name: "Jan van Aken",
    isPolitician: true,
    politicianId: 78952,
    politicianName: "Jan van Aken",
    party: 8, // Die Linke
    partyName: "Die Linke",
  },
  "Wolfram Weimer": {
    name: "Wolfram Weimer",
    isPolitician: true,
    politicianId: 9998,
    politicianName: "Wolfram Weimer",
    party: 2,
    partyName: "CDU",
  },
  "Daniel Günther": {
    name: "Daniel Günther",
    isPolitician: true,
    politicianId: 130775,
    politicianName: "Daniel Günther",
    party: 2, // CDU
    partyName: "CDU",
  },
};

export const FETCH_HEADERS = {
  Authorization: `Bearer ${process.env.POLITICS_API_KEY}`,
};

export const POLITICAL_AREA = [
  { id: 1, label: "Energie, Klima und Versorgungssicherheit" },
  { id: 2, label: "Wirtschaft, Innovation und Wettbewerbsfähigkeit" },
  { id: 3, label: "Sicherheit, Verteidigung und Außenpolitik" },
  {
    id: 4,
    label: "Migration, Integration und gesellschaftlicher Zusammenhalt",
  },
  { id: 5, label: "Haushalt, öffentliche Finanzen und Sozialpolitik" },
  { id: 6, label: "Digitalisierung, Medien und Demokratie" },
  { id: 7, label: "Kultur, Identität und Erinnerungspolitik" },
];

// Hilfsfunktion zur Disambiguierung basierend auf Partei-Info
function disambiguateByRole(
  politicians: AbgeordnetenwatchPolitician[],
  role: string,
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
        (p) => p.party && p.party.label.toUpperCase().includes(party),
      );
      if (partyMatch) {
        console.log(`✅ Partei-Match gefunden: ${party}`);
        return partyMatch;
      }
    }
  }

  return null;
}

// Hilfsfunktion: Name in Vor- und Nachname aufteilen
function splitFirstLast(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ").trim() };
}

export async function getPoliticalArea(
  description: string,
): Promise<number[] | []> {
  // Prompt ähnlich wie in test-ai-connection.ts
  const prompt = `Text: ${description}
  Gib die Themengebiete wieder die in der Talkshow besprochen wurden. Die Vorhandenen Themenfelder sind vorgegeben. Gib die Antowrt als Array [id] zurück. Mögliche Themenfelder: 1. Energie, Klima und Versorgungssicherheit 2. Wirtschaft, Innovation und Wettbewerbsfähigkeit 3. Sicherheit, Verteidigung und Außenpolitik 4. Migration, Integration und gesellschaftlicher Zusammenhalt 5. Haushalt, öffentliche Finanzen und Sozialpolitik 6. Digitalisierung, Medien und Demokratie 7. Kultur, Identität und Erinnerungspolitik`;

  try {
    console.log("🤖 Erkenne Themen der Episode");

    let content = "";

    if (process.env.LokalLLM === "true") {
      console.log("🔌 Verwende lokales LLM (LM Studio)");
      const response = await axios.post(
        "http://127.0.0.1:1234/v1/chat/completions",
        {
          model: "local-model",
          messages: [
            {
              role: "system",
              content:
                "Du antwortest nur mit einem gültigen JSON Array von numbers (z.B. [1,2,...]). Keine zusätzlichen Zeichen.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        },
      );
      content = response.data.choices[0].message.content.trim();
    } else {
      const generativeModel = getVertexAI().getGenerativeModel({
        model: googleModel,
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: "Du antwortest nur mit einem gültigen JSON Array von numbers (z.B. [1,2,...]). Keine zusätzlichen Zeichen.",
            },
          ],
        },
      });

      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      content =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
        "";
    }

    try {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "number")
      ) {
        return parsed;
      }
    } catch {
      console.error("❌ AI-Antwort kein gültiges JSON-Array:", content);
      return [];
    }

    return [];
  } catch {
    console.error("❌ AI-Extraktion fehlgeschlagen");
    return [];
  }
}

interface MediathekQueryResultItem {
  timestamp?: number;
  url_subtitle?: string;
  title?: string;
  duration?: number;
  url_website?: string;
}

function toIsoDateFromUnixTimestamp(timestampSeconds: number): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(timestampSeconds * 1000));
}

function toTranscriptText(xmlText: string): string {
  return xmlText
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBestMediathekSubtitleMatch(
  episodeDate: string,
  mediathekQuery: string,
): Promise<MediathekQueryResultItem | null> {
  const query = {
    queries: [{ fields: ["title", "topic"], query: mediathekQuery }],
    offset: 0,
    size: 50,
    future: false,
    sortBy: "timestamp",
    sortOrder: "desc",
  };

  try {
    const response = await fetch(
      `https://mediathekviewweb.de/api/query?query=${encodeURIComponent(
        JSON.stringify(query),
      )}`,
    );

    if (!response.ok) {
      console.warn(`Mediathek API Fehler: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const results: MediathekQueryResultItem[] = data?.result?.results ?? [];

    const sameDateItems = results.filter((item) => {
      if (!item.timestamp) return false;
      return toIsoDateFromUnixTimestamp(item.timestamp) === episodeDate;
    });

    if (sameDateItems.length === 0) return null;

    const scored = sameDateItems
      .map((item) => {
        const hasSubtitle = !!item.url_subtitle;
        const durationScore = item.duration && item.duration > 1800 ? 1 : 0;
        const combinedText = `${item.title || ""} ${item.url_website || ""}`
          .toLowerCase()
          .trim();
        const isClip =
          combinedText.includes("clip") || combinedText.includes("ausschnitt");
        const isPreview =
          combinedText.includes("vorschau") || combinedText.includes("trailer");
        const isSignLanguage =
          combinedText.includes("gebärdensprache") ||
          combinedText.includes("gebaerdensprache") ||
          combinedText.includes("_dgs");

        const score =
          (hasSubtitle ? 1000 : 0) +
          durationScore * 50 -
          (isClip ? 80 : 0) -
          (isPreview ? 80 : 0) -
          (isSignLanguage ? 10 : 0);

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored[0]?.item ?? null;
  } catch (error) {
    console.warn("Fehler beim Mediathek API Call:", error);
    return null;
  }
}



// Hole das Datum der neuesten Episode für eine bestimmte Sendung (Supabase Version)
export async function getLatestEpisodeDate(
  showName: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("tv_show_politicians")
      .select("episode_date")
      .eq("show_name", showName)
      .order("episode_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.episode_date;
  } catch (error) {
    console.error("Fehler beim Abrufen des neuesten Datums:", error);
    return null;
  }
}

// Hole alle bereits gecrawlten Episode-Daten aus show_links
// Zuverlässiger als getLatestEpisodeDate, da show_links immer befüllt wird
// (unabhängig davon, ob die Episode Politiker enthält)
export async function getExistingEpisodeDates(
  showName: string,
): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from("show_links")
      .select("episode_date")
      .eq("show_name", showName);

    if (error || !data) {
      console.error("Fehler beim Abrufen der Episode-Daten:", error);
      return new Set();
    }

    return new Set(data.map((row) => row.episode_date));
  } catch (error) {
    console.error("Fehler beim Abrufen der Episode-Daten:", error);
    return new Set();
  }
}

// Füge mehrere Episode-URLs zur show_links Tabelle hinzu (Batch Insert)
export async function insertMultipleShowLinks(
  showName: string,
  episodes: Array<{
    episodeUrl: string;
    episodeDate: string;
  }>,
): Promise<number> {
  if (episodes.length === 0) return 0;

  let insertedCount = 0;

  // Batch insert für bessere Performance
  const dataToInsert = episodes.map((episode) => ({
    show_name: showName,
    episode_url: episode.episodeUrl,
    episode_date: episode.episodeDate,
  }));

  try {
    const { error } = await supabase.from("show_links").upsert(dataToInsert, {
      onConflict: "show_name,episode_date",
      ignoreDuplicates: true,
    });

    if (error) {
      console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

      // Fallback: Einzeln einfügen
      for (const episode of episodes) {
        const success = await insertShowLink({
          show_name: showName,
          episode_url: episode.episodeUrl,
          episode_date: episode.episodeDate,
        });

        if (success) {
          insertedCount++;
        }
      }
    } else {
      insertedCount = episodes.length;
    }
  } catch (error) {
    console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

    // Fallback: Einzeln einfügen
    for (const episode of episodes) {
      const success = await insertShowLink({
        show_name: showName,
        episode_url: episode.episodeUrl,
        episode_date: episode.episodeDate,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  return insertedCount;
}

// Füge Episode-URL zur show_links Tabelle hinzu (Supabase Version)
export async function insertShowLink(
  data: InsertShowLinkData,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("show_links").upsert(
      {
        show_name: data.show_name,
        episode_url: data.episode_url,
        episode_date: data.episode_date,
      },
      {
        onConflict: "show_name,episode_date",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      console.error("Fehler beim Einfügen der Episode-URL:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen der Episode-URL:", error);
    return false;
  }
}

// Füge mehrere Politiker zu einer Sendung hinzu (Supabase Version)
export async function insertMultipleTvShowPoliticians(
  tvChannel: string,
  showName: string,
  episodeDate: string,
  politicians: Array<{
    politicianId: number;
    politicianName: string;
    partyId?: number;
    partyName?: string;
  }>,
): Promise<number> {
  let insertedCount = 0;

  // Batch insert für bessere Performance
  const dataToInsert = politicians.map((politician) => ({
    tv_channel: tvChannel,
    show_name: showName,
    episode_date: episodeDate,
    politician_id: politician.politicianId,
    politician_name: politician.politicianName,
    party_id: politician.partyId || null,
    party_name: politician.partyName || null,
    updated_at: new Date().toISOString(),
    abgeordnetenwatch_url: politician.politicianName
      ? `https://www.abgeordnetenwatch.de/profile/${politician.politicianName
          .toLowerCase()
          .replace(/ä/g, "ae")
          .replace(/ö/g, "oe")
          .replace(/ü/g, "ue")
          .replace(/ß/g, "ss")
          .replace(/\s+/g, "-")}`
      : null,
  }));

  try {
    const { error } = await supabase
      .from("tv_show_politicians")
      .upsert(dataToInsert, {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Fehler beim Batch-Insert:", error);
      return 0;
    }

    insertedCount = politicians.length;
  } catch (error) {
    console.error("Fehler beim Batch-Insert:", error);

    // Fallback: Einzeln einfügen
    for (const politician of politicians) {
      const success = await insertTvShowPolitician({
        show_name: showName,
        episode_date: episodeDate,
        politician_id: politician.politicianId,
        politician_name: politician.politicianName,
        party_id: politician.partyId,
        party_name: politician.partyName,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  return insertedCount;
}

// Füge einen Politiker zu einer TV-Sendung hinzu (Supabase Version)
export async function insertTvShowPolitician(
  data: InsertTvShowPoliticianData,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tv_show_politicians").upsert(
      {
        show_name: data.show_name,
        episode_date: data.episode_date,
        politician_id: data.politician_id,
        politician_name: data.politician_name,
        party_id: data.party_id || null,
        party_name: data.party_name || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      },
    );

    if (error) {
      console.error("Fehler beim Einfügen:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen:", error);
    return false;
  }
}

// Politiker-Prüfung mit Abgeordnetenwatch API
export async function checkPolitician(
  name: string,
  role?: string,
  retries = 3,
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
    first,
  )}&last_name=${encodeURIComponent(last)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(url);
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
          `🔍 Disambiguierung für ${name}: ${politicians.length} Treffer gefunden, Rolle: "${role}"`,
        );

        const selectedPolitician = disambiguateByRole(politicians, role);
        if (selectedPolitician) {
          console.log(
            `✅ Politiker ausgewählt: ${selectedPolitician.label} (${selectedPolitician.party?.label})`,
          );

          // Korrektur: Bayernpartei → CSU
          let correctedPartyName = selectedPolitician.party?.label;
          if (correctedPartyName === "Bayernpartei") {
            console.log(
              `🔧 Korrigiere Bayernpartei → CSU für ${selectedPolitician.label}`,
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
        `⚠️  Keine eindeutige Zuordnung für ${name}, verwende ersten Treffer`,
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
        error,
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

// Hilfsfunktion um Override-Prüfung zu zentralisieren
export function checkPoliticianOverride(name: string): GuestDetails | null {
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`,
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}

// Hilfsfunktion: AI-Extraktion der Gäste aus dem Teasertext (Google GenAI)
export async function extractGuestsWithAI(
  description: string,
  retryCount = 0,
): Promise<string[]> {
  // Nach 150 Requests direkt zum Fallback wechseln
  if (aiRequestCount >= 150) {
    console.log("⚠️  AI Rate Limit erreicht");
    return [];
  }

  await waitForRateLimit();

  const prompt = `Text: ${description}
Gib mir die Namen der Gäste im Text ausschließlich als JSON Array mit Strings zurück. Keine Erklärungen, kein Codeblock, nichts davor oder danach.`;

  try {
    console.log(
      `🤖 Extrahiere Gäste mit AI (Request ${aiRequestCount}/150)...`,
    );

    let content = "";

    if (process.env.LokalLLM === "true") {
      console.log("🔌 Verwende lokales LLM (LM Studio)");
      const response = await axios.post(
        "http://127.0.0.1:1234/v1/chat/completions",
        {
          model: "local-model",
          messages: [
            {
              role: "system",
              content:
                'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON Array von Strings (z.B. ["Name1","Name2",...]). Keine zusätzlichen Zeichen.',
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        },
      );
      content = response.data.choices[0].message.content;
    } else {
      const generativeModel = getVertexAI().getGenerativeModel({
        model: googleModel,
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: 'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON Array von Strings (z.B. ["Name1","Name2",...]). Keine zusätzlichen Zeichen.',
            },
          ],
        },
      });

      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      content =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (
          Array.isArray(parsed) &&
          parsed.every((x) => typeof x === "string")
        ) {
          console.log(`   ✅ AI extrahierte ${parsed.length} Gäste:`, parsed);
          return parsed;
        }
      } catch {
        // ignorieren
      }
    }

    console.log("⚠️  AI-Extraktion unerwartetes Format");
    return [];
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error(
      `❌ AI-Extraktion fehlgeschlagen (Versuch ${
        retryCount + 1
      }/${MAX_RETRIES}): ${errorMessage}`,
    );

    // Retry bei bestimmten Fehlern
    if (
      retryCount < MAX_RETRIES - 1 &&
      (errorMessage.includes("rate") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("503") ||
        errorMessage.includes("502"))
    ) {
      const backoffDelay = Math.pow(2, retryCount) * 2000;
      console.log(`   🔄 Retry in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return extractGuestsWithAI(description, retryCount + 1);
    }

    return [];
  }
}

// Hilfsfunktion zum Speichern der politischen Themenbereiche
export async function insertEpisodePoliticalAreas(
  showName: string,
  episodeDate: string,
  politicalAreaIds: number[],
): Promise<number> {
  if (!politicalAreaIds.length) return 0;

  try {
    const insertData = politicalAreaIds.map((areaId) => ({
      show_name: showName,
      episode_date: episodeDate,
      political_area_id: areaId,
    }));

    const { error } = await supabase
      .from("tv_show_episode_political_areas")
      .upsert(insertData, {
        onConflict: "show_name,episode_date,political_area_id",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(
        "Fehler beim Speichern der politischen Themenbereiche:",
        error,
      );
      return 0;
    }

    return insertData.length;
  } catch (error) {
    console.error(
      "Fehler beim Speichern der politischen Themenbereiche:",
      error,
    );
    return 0;
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
      /([A-ZÄÖÜ][a-zäöü\-]+\s+[A-ZÄÖÜ][a-zäöü\-]+(?:\s+[a-zäöü\-]+)*)/,
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
