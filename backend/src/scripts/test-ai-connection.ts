import "dotenv/config";
import { InferenceClient } from "@huggingface/inference";

const MODEL = "swiss-ai/Apertus-8B-Instruct-2509";
// Neuer Prompt mit Instruktion nur ein JSON Array der Namen zurückzugeben
const PROMPT = `Text: Zu Gast: Alexander Schweitzer (SPD), Karl-Theodor zu Guttenberg (CSU), Gregor Gysi (Die Linke), Christian Rach (Spitzenkoch und Moderator), Iris Sayram (ARD-Hauptstadtstudio) und Ansgar Graw (The European).&nbsp;|&nbsp;
Gib mir die Namen der Gäste im Text ausschließlich als JSON Array mit Strings zurück. Keine Erklärungen, kein Codeblock, nichts davor oder danach.`;

async function main() {
  const token = process.env.HF_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "HF_ACCESS_TOKEN fehlt (.env anlegen: HF_ACCESS_TOKEN=hf_xxx)"
    );
    process.exit(1);
  }

  const hf = new InferenceClient(token);

  console.log("Starte chatCompletion (publicai)...");
  try {
    const chat = await hf.chatCompletion({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'Du extrahierst ausschließlich Personennamen und antwortest nur mit einem gültigen JSON Array von Strings (z.B. ["Name1","Name2",...]). Keine zusätzlichen Zeichen.',
        },
        { role: "user", content: PROMPT },
      ],
      max_tokens: 150,
      temperature: 0.0,
      provider: "publicai",
    });

    const content =
      chat.choices?.[0]?.message?.content?.trim() ??
      JSON.stringify(chat, null, 2);

    // Versuch das erste JSON-Array zu parsen
    let result: string[] | null = null;
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (
          Array.isArray(parsed) &&
          parsed.every((x) => typeof x === "string")
        ) {
          result = parsed;
        }
      } catch {
        // ignorieren, fallback unten
      }
    }

    if (result) {
      console.log(result);
    } else {
      console.log("Roh-Ausgabe (unerwartetes Format):", content);
    }
  } catch (e: any) {
    console.error("chatCompletion fehlgeschlagen:", e?.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
