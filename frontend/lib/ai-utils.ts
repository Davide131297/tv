import { GoogleGenAI } from "@google/genai";

// ==================== LLM CONFIGURATION ====================
const USE_LOCAL_LLM = process.env.LokalLLM === "true";
const LM_STUDIO_URL = "http://127.0.0.1:1234";

// Rate-Limiting für AI-Requests
let aiRequestCount = 0;
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 4000;
const MAX_RETRIES = 3;
const ai = USE_LOCAL_LLM
  ? null
  : new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || "" });
const googleModel = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";

if (USE_LOCAL_LLM) {
  console.log("🏠 Verwende lokales LLM (LM Studio) unter", LM_STUDIO_URL);
} else {
  console.log("☁️  Verwende Google Gemini:", googleModel);
}

/**
 * Unified LLM call – routes to LM Studio or Google Gemini based on LokalLLM env.
 */
async function callLLM(
  prompt: string,
  systemInstruction: string,
): Promise<string> {
  if (USE_LOCAL_LLM) {
    // LM Studio – OpenAI-compatible /v1/chat/completions
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LM Studio error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } else {
    // Google Gemini
    const response = await ai!.models.generateContent({
      model: googleModel,
      contents: prompt,
      config: { systemInstruction },
    });
    return response.text?.trim() ?? "";
  }
}

async function waitForRateLimit(): Promise<void> {
  if (USE_LOCAL_LLM) {
    aiRequestCount++;
    return;
  }

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

    const content = await callLLM(
      prompt,
      'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON Array von Strings (z.B. ["Name1","Name2",...]). Keine zusätzlichen Zeichen.',
    );

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

// ==================== BATCH FUNCTIONS ====================

export interface BatchEpisodeInput {
  index: number;
  description: string;
}

const BATCH_SIZE = 15; // Max episodes per batch to stay within token limits

/**
 * Batch version of getPoliticalArea: processes multiple episode descriptions in a single AI request.
 * Returns a Map from episode index to political area IDs.
 */
export async function getBatchPoliticalAreas(
  episodes: BatchEpisodeInput[],
): Promise<Map<number, number[]>> {
  const resultMap = new Map<number, number[]>();

  if (episodes.length === 0) return resultMap;

  // Process in chunks to stay within token limits
  for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
    const chunk = episodes.slice(i, i + BATCH_SIZE);
    const chunkResults = await _getBatchPoliticalAreasChunk(chunk);
    for (const [key, value] of chunkResults) {
      resultMap.set(key, value);
    }
  }

  return resultMap;
}

async function _getBatchPoliticalAreasChunk(
  episodes: BatchEpisodeInput[],
  retryCount = 0,
): Promise<Map<number, number[]>> {
  const resultMap = new Map<number, number[]>();

  // Build the batch prompt
  const episodeTexts = episodes
    .map((ep) => `[Episode ${ep.index}]: ${ep.description}`)
    .join("\n\n");

  const prompt = `Hier sind mehrere Episodenbeschreibungen von Talkshows. Gib für JEDE Episode die Themengebiete als JSON-Objekt zurück, wobei der Key die Episode-Nummer ist und der Value ein Array von Themen-IDs.

Mögliche Themenfelder:
1. Energie, Klima und Versorgungssicherheit
2. Wirtschaft, Innovation und Wettbewerbsfähigkeit
3. Sicherheit, Verteidigung und Außenpolitik
4. Migration, Integration und gesellschaftlicher Zusammenhalt
5. Haushalt, öffentliche Finanzen und Sozialpolitik
6. Digitalisierung, Medien und Demokratie
7. Kultur, Identität und Erinnerungspolitik

${episodeTexts}`;

  try {
    await waitForRateLimit();
    console.log(
      `🤖 Batch-Themenanalyse für ${episodes.length} Episoden (Request ${aiRequestCount}/150)...`,
    );

    const content = await callLLM(
      prompt,
      'Du antwortest nur mit einem gültigen JSON-Objekt. Keys sind die Episode-Nummern als Strings, Values sind Arrays von Zahlen (z.B. {"0":[1,3],"1":[2,5]}). Keine zusätzlichen Zeichen.',
    );

    // Parse the JSON object
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (typeof parsed === "object" && parsed !== null) {
          for (const [key, value] of Object.entries(parsed)) {
            const idx = parseInt(key);
            if (
              !isNaN(idx) &&
              Array.isArray(value) &&
              (value as unknown[]).every((x) => typeof x === "number")
            ) {
              resultMap.set(idx, value as number[]);
            }
          }
          console.log(
            `   ✅ Batch-Themenanalyse: ${resultMap.size}/${episodes.length} Episoden zugeordnet`,
          );
          return resultMap;
        }
      } catch {
        // Parse failed, fall through to fallback
      }
    }

    console.log("⚠️  Batch-Themenanalyse: unerwartetes Format, nutze Fallback");
    return _fallbackPoliticalAreas(episodes);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error(
      `❌ Batch-Themenanalyse fehlgeschlagen (Versuch ${
        retryCount + 1
      }/${MAX_RETRIES}): ${errorMessage}`,
    );

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
      return _getBatchPoliticalAreasChunk(episodes, retryCount + 1);
    }

    return _fallbackPoliticalAreas(episodes);
  }
}

async function _fallbackPoliticalAreas(
  episodes: BatchEpisodeInput[],
): Promise<Map<number, number[]>> {
  console.log(
    `🔄 Fallback: Einzelne getPoliticalArea-Aufrufe für ${episodes.length} Episoden`,
  );
  const resultMap = new Map<number, number[]>();
  for (const ep of episodes) {
    const result = await getPoliticalArea(ep.description);
    if (result.length > 0) {
      resultMap.set(ep.index, result);
    }
  }
  return resultMap;
}

/**
 * Batch version of extractGuestsWithAI: processes multiple episode descriptions in a single AI request.
 * Returns a Map from episode index to guest name arrays.
 */
export async function extractBatchGuestsWithAI(
  episodes: BatchEpisodeInput[],
): Promise<Map<number, string[]>> {
  const resultMap = new Map<number, string[]>();

  if (episodes.length === 0) return resultMap;

  // Process in chunks
  for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
    const chunk = episodes.slice(i, i + BATCH_SIZE);
    const chunkResults = await _extractBatchGuestsChunk(chunk);
    for (const [key, value] of chunkResults) {
      resultMap.set(key, value);
    }
  }

  return resultMap;
}

async function _extractBatchGuestsChunk(
  episodes: BatchEpisodeInput[],
  retryCount = 0,
): Promise<Map<number, string[]>> {
  const resultMap = new Map<number, string[]>();

  if (aiRequestCount >= 150) {
    console.log("⚠️  AI Rate Limit erreicht");
    return resultMap;
  }

  const episodeTexts = episodes
    .map((ep) => `[Episode ${ep.index}]: ${ep.description}`)
    .join("\n\n");

  const prompt = `Hier sind mehrere Texte von Talkshow-Episoden. Extrahiere für JEDE Episode die Namen der Gäste und gib das Ergebnis als JSON-Objekt zurück, wobei der Key die Episode-Nummer ist und der Value ein Array von Personennamen-Strings.

${episodeTexts}`;

  try {
    await waitForRateLimit();
    console.log(
      `🤖 Batch-Gästeextraktion für ${episodes.length} Episoden (Request ${aiRequestCount}/150)...`,
    );

    const content = await callLLM(
      prompt,
      'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON-Objekt. Keys sind die Episode-Nummern als Strings, Values sind Arrays von Strings (z.B. {"0":["Name1","Name2"],"1":["Name3"]}). Keine zusätzlichen Zeichen.',
    );

    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (typeof parsed === "object" && parsed !== null) {
          for (const [key, value] of Object.entries(parsed)) {
            const idx = parseInt(key);
            if (
              !isNaN(idx) &&
              Array.isArray(value) &&
              (value as unknown[]).every((x) => typeof x === "string")
            ) {
              resultMap.set(idx, value as string[]);
            }
          }
          console.log(
            `   ✅ Batch-Gästeextraktion: ${resultMap.size}/${episodes.length} Episoden zugeordnet`,
          );
          return resultMap;
        }
      } catch {
        // Parse failed, fall through to fallback
      }
    }

    console.log(
      "⚠️  Batch-Gästeextraktion: unerwartetes Format, nutze Fallback",
    );
    return _fallbackGuestsExtraction(episodes);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error(
      `❌ Batch-Gästeextraktion fehlgeschlagen (Versuch ${
        retryCount + 1
      }/${MAX_RETRIES}): ${errorMessage}`,
    );

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
      return _extractBatchGuestsChunk(episodes, retryCount + 1);
    }

    return _fallbackGuestsExtraction(episodes);
  }
}

async function _fallbackGuestsExtraction(
  episodes: BatchEpisodeInput[],
): Promise<Map<number, string[]>> {
  console.log(
    `🔄 Fallback: Einzelne extractGuestsWithAI-Aufrufe für ${episodes.length} Episoden`,
  );
  const resultMap = new Map<number, string[]>();
  for (const ep of episodes) {
    const result = await extractGuestsWithAI(ep.description);
    if (result.length > 0) {
      resultMap.set(ep.index, result);
    }
  }
  return resultMap;
}

// ==================== SINGLE FUNCTIONS (kept as fallback) ====================

export async function getPoliticalArea(
  description: string,
): Promise<number[] | []> {
  // Prompt ähnlich wie in test-ai-connection.ts
  const prompt = `Text: ${description}
  Gib die Themengebiete wieder die in der Talkshow besprochen wurden. Die Vorhandenen Themenfelder sind vorgegeben. Gib die Antowrt als Array [id] zurück. Mögliche Themenfelder: 1. Energie, Klima und Versorgungssicherheit 2. Wirtschaft, Innovation und Wettbewerbsfähigkeit 3. Sicherheit, Verteidigung und Außenpolitik 4. Migration, Integration und gesellschaftlicher Zusammenhalt 5. Haushalt, öffentliche Finanzen und Sozialpolitik 6. Digitalisierung, Medien und Demokratie 7. Kultur, Identität und Erinnerungspolitik`;

  try {
    console.log("🤖 Erkenne Themen der Episode");

    const content = await callLLM(
      prompt,
      "Du antwortest nur mit einem gültigen JSON Array von numbers (z.B. [1,2,...]). Keine zusätzlichen Zeichen.",
    );

    try {
      const parsed = JSON.parse(content);
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
