import { GoogleGenAI } from "@google/genai";

// Rate-Limiting für AI-Requests
let aiRequestCount = 0;
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 4000;
const MAX_RETRIES = 3;
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || "" });
const googleModel = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";

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

export async function extractGuestsWithAI(
  description: string,
  retryCount = 0
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
      `🤖 Extrahiere Gäste mit AI (Request ${aiRequestCount}/150)...`
    );

    const response = await ai.models.generateContent({
      model: googleModel,
      contents: prompt,
      config: {
        systemInstruction:
          'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON Array von Strings (z.B. ["Name1","Name2",...]). Keine zusätzlichen Zeichen.',
      },
    });

    const content = response.text ?? "";

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
      }/${MAX_RETRIES}): ${errorMessage}`
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

export async function getPoliticalArea(
  description: string
): Promise<number[] | []> {
  // Prompt ähnlich wie in test-ai-connection.ts
  const prompt = `Text: ${description}
  Gib die Themengebiete wieder die in der Talkshow besprochen wurden. Die Vorhandenen Themenfelder sind vorgegeben. Gib die Antowrt als Array [id] zurück. Mögliche Themenfelder: 1. Energie, Klima und Versorgungssicherheit 2. Wirtschaft, Innovation und Wettbewerbsfähigkeit 3. Sicherheit, Verteidigung und Außenpolitik 4. Migration, Integration und gesellschaftlicher Zusammenhalt 5. Haushalt, öffentliche Finanzen und Sozialpolitik 6. Digitalisierung, Medien und Demokratie 7. Kultur, Identität und Erinnerungspolitik`;

  try {
    console.log("🤖 Erkenne Themen der Episode");

    const response = await ai.models.generateContent({
      model: googleModel,
      contents: prompt,
      config: {
        systemInstruction:
          "Du antwortest nur mit einem gültigen JSON Array von numbers (z.B. [1,2,...]). Keine zusätzlichen Zeichen.",
      },
    });

    const content = response.text?.trim() ?? "";

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
