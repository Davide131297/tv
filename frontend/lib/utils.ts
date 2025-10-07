import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { InferenceClient } from "@huggingface/inference";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FETCH_HEADERS = {
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_POLITICS_API_KEY}`,
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

export async function getPoliticalArea(
  description: string
): Promise<number[] | []> {
  const token = process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN;
  const MODEL = "aisingapore/Gemma-SEA-LION-v4-27B-IT";
  if (!token) {
    console.error("❌ HF_ACCESS_TOKEN fehlt in .env");
    return [];
  }

  const hf = new InferenceClient(token);

  // Prompt ähnlich wie in test-ai-connection.ts
  const prompt = `Text: ${description}
  Gib die Themengebiete wieder die in der Talkshow besprochen wurden. Die Vorhandenen Themenfelder sind vorgegeben. Gib die Antowrt als Array [id] zurück. Mögliche Themenfelder: 1. Energie, Klima und Versorgungssicherheit 2. Wirtschaft, Innovation und Wettbewerbsfähigkeit 3. Sicherheit, Verteidigung und Außenpolitik 4. Migration, Integration und gesellschaftlicher Zusammenhalt 5. Haushalt, öffentliche Finanzen und Sozialpolitik 6. Digitalisierung, Medien und Demokratie 7. Kultur, Identität und Erinnerungspolitik`;

  try {
    console.log("🤖 Erkenne Themen der Episode");

    const chat = await hf.chatCompletion({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Du antwortest nur mit einem gültigen JSON Array von numbers (z.B. [1,2,...]). Keine zusätzlichen Zeichen.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
      provider: "publicai",
    });

    const content = chat.choices?.[0]?.message?.content?.trim() ?? "";

    try {
      const parsed = JSON.parse(content);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "number")
      ) {
        console.log("🤖 Erkannte Themen:", parsed);
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
