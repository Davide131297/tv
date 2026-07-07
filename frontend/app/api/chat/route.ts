export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseServer as supabase } from "@/lib/supabase-server";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const USE_LOCAL_LLM = process.env.LokalLLM === "true";
const LOCAL_LLM_URL = "http://127.0.0.1:1234";

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey: googleApiKey });
const MODEL = process.env.GOOGLE_AI_MODEL;

const SHOW_NAMES = [
  "Markus Lanz",
  "Maybrit Illner",
  "Caren Miosga",
  "Maischberger",
  "Hart aber fair",
  "Phoenix Runde",
  "Phoenix Persönlich",
  "Pinar Atalay",
  "Blome & Pfeffer",
] as const;

// Sendungen, die das Dashboard (lib/politics-data.ts) aus allen Statistiken/Rankings
// ausschließt. Der Chatbot muss dieselbe Regel anwenden, sonst weichen seine Zahlen
// von der UI ab.
const EXCLUDED_SHOWS = [
  "Phoenix Runde",
  "Phoenix Persönlich",
  "Pinar Atalay",
  "Blome & Pfeffer",
] as const;

const DB_SCHEMA_DESCRIPTION = `
Dir stehen folgende Tabellen zur Verfügung (Postgres, Schema "public"). Du darfst NUR diese Tabellen lesen:

1. tv_show_politicians — ein Datensatz pro Gast-Auftritt
   - show_name (text): einer von ${SHOW_NAMES.map((s) => `"${s}"`).join(", ")}
   - episode_date (date)
   - politician_name (text)
   - party_name (text, kann NULL sein): z.B. "CDU", "SPD", "BÜNDNIS 90/DIE GRÜNEN", "FDP", "Die Linke", "CSU", "AfD", "BSW", "FREIE WÄHLER", "Die PARTEI", "Volt", "parteilos"
   - tv_channel (enum): "Das Erste", "ZDF", "RTL", "NTV", "Phoenix", "WELT", "Pro 7"
   - abgeordnetenwatch_url (text, kann NULL sein)

2. tv_show_episode_political_areas — verknüpft Episoden mit Themen (mehrere Zeilen pro Episode möglich)
   - show_name (text)
   - episode_date (date)
   - political_area_id (int) → Fremdschlüssel auf political_area.id
   - tv_channel (enum, siehe oben)

3. political_area — Themenkatalog
   - id (int)
   - label (text): 1="Energie, Klima und Versorgungssicherheit", 2="Wirtschaft, Innovation und Wettbewerbsfähigkeit", 3="Sicherheit, Verteidigung und Außenpolitik", 4="Migration, Integration und gesellschaftlicher Zusammenhalt", 5="Haushalt, öffentliche Finanzen und Sozialpolitik", 6="Digitalisierung, Medien und Demokratie", 7="Kultur, Identität und Erinnerungspolitik"

4. show_links — Episoden-URLs
   - show_name (text), episode_url (text), episode_date (date)

5. tv_ratings — TV-Quoten
   - show_name (text), episode_date (date), market_share (numeric), viewers_millions (numeric)

6. episode_factchecks — Faktenchecks zu Episoden (bisher wenig Daten)
   - show_name (text), episode_date (date), core_statements (jsonb), fact_checks (jsonb), raw_analysis (text)

Regeln für die SQL-Generierung:
- Schreibe genau EIN SELECT- oder WITH-Statement, keine anderen Tabellen, kein Semikolon außer optional am Ende.
- Nutze KEINE anderen Tabellen als die oben genannten.
- Nutze sinnvolle GROUP BY / ORDER BY / LIMIT je nach Frage (z.B. Rankings mit ORDER BY count(*) DESC).
- Für Themen-Fragen: JOIN tv_show_episode_political_areas mit political_area über political_area_id.
- WICHTIG: Bei Statistiken/Rankings/Zählungen über mehrere oder alle Sendungen hinweg (z.B. "welche Partei am häufigsten", "Top-Politiker gesamt") MUSS die Query show_name NOT IN (${EXCLUDED_SHOWS.map((s) => `'${s}'`).join(", ")}) filtern — diese Sendungen werden im Dashboard aus allen Gesamt-Statistiken ausgeschlossen. Nur wenn der Nutzer explizit nach einer dieser Sendungen fragt (z.B. "wer war bei ${EXCLUDED_SHOWS[0]}"), beziehe sie für DIESE Sendung mit ein.
- Gib IMMER nur die SQL-Query zurück, in einem \`\`\`sql-Codeblock, ohne Erklärung davor oder danach.
`;

type StructuredRow = Record<string, unknown>;

function extractSqlFromResponse(text: string): string | null {
  const fenced = text.match(/```sql\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  if (!candidate) return null;
  if (!/^(select|with)\s/i.test(candidate)) return null;
  return candidate;
}

async function generateSql(
  question: string,
  currentDateInfo: string,
  priorError?: string,
): Promise<string | null> {
  const prompt = `${DB_SCHEMA_DESCRIPTION}

${currentDateInfo}

Nutzerfrage: "${question}"
${priorError ? `\nDeine vorherige Query war ungültig: ${priorError}\nKorrigiere die Query.` : ""}`;

  try {
    let content: string;
    if (USE_LOCAL_LLM) {
      const response = await fetch(`${LOCAL_LLM_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "Du generierst ausschließlich eine einzelne SQL-Query als Antwort, in einem ```sql-Codeblock.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 400,
        }),
      });
      if (!response.ok) throw new Error(`LM Studio Fehler: ${response.status}`);
      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? "";
    } else {
      if (!MODEL) throw new Error("Modell ist nicht definiert");
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.1,
          systemInstruction:
            "Du generierst ausschließlich eine einzelne SQL-Query als Antwort, in einem ```sql-Codeblock.",
        },
      });
      content = response.text ?? "";
    }

    return extractSqlFromResponse(content);
  } catch (error) {
    console.error("❌ Fehler bei SQL-Generierung:", error);
    return null;
  }
}

async function runChatbotQuery(
  sql: string,
): Promise<{ rows: StructuredRow[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc("execute_chatbot_query", {
    query: sql,
  });

  if (error) {
    return { rows: null, error: error.message };
  }

  return { rows: (data as StructuredRow[]) ?? [], error: null };
}

/**
 * Übersetzt die Nutzerfrage in SQL, führt sie read-only aus (mit einem
 * Selbstkorrektur-Versuch bei Fehlern) und liefert das Ergebnis als Kontext
 * für die abschließende Antwortgenerierung.
 */
async function fetchQueryContext(
  question: string,
  currentDateInfo: string,
): Promise<string> {
  let sql = await generateSql(question, currentDateInfo);
  if (!sql) {
    return "";
  }

  let { rows, error } = await runChatbotQuery(sql);

  if (error) {
    console.error("❌ SQL-Ausführungsfehler (Versuch 1):", error, sql);
    const retrySql = await generateSql(question, currentDateInfo, error);
    if (retrySql) {
      sql = retrySql;
      const retryResult = await runChatbotQuery(retrySql);
      rows = retryResult.rows;
      error = retryResult.error;
    }
  }

  if (error || rows === null) {
    console.error("❌ SQL-Ausführungsfehler (Versuch 2):", error, sql);
    return "";
  }

  return `\n\nDATENBANK-ABFRAGE:\n\`\`\`sql\n${sql}\n\`\`\`\n\nERGEBNIS (max. 200 Zeilen):\n${JSON.stringify(rows).slice(0, 8000)}`;
}

/**
 * Streamt eine Antwort vom lokalen LM Studio (OpenAI-kompatibel)
 */
async function streamLocalLLM(
  systemPrompt: string,
  conversationMessages: Message[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<void> {
  const openAiMessages = [
    { role: "system", content: systemPrompt },
    ...conversationMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const response = await fetch(`${LOCAL_LLM_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: openAiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`LM Studio Fehler: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
          );
        }
      } catch {
        // Unvollständige Chunks ignorieren
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!USE_LOCAL_LLM && !googleApiKey) {
      console.error("❌ GOOGLE_GENAI_API_KEY fehlt in .env");
      return NextResponse.json(
        { error: "API-Konfigurationsfehler: Google AI API Key fehlt" },
        { status: 500 },
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Ungültiges Nachrichtenformat" },
        { status: 400 },
      );
    }

    const lastUserMessage = messages
      .filter((m: Message) => m.role === "user")
      .pop();

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleDateString("de-DE", {
      month: "long",
    });
    const formattedDate = currentDate.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const currentDateInfo = `Heutiges Datum: ${formattedDate} (Jahr ${currentYear}, Monat ${currentMonth}).`;

    let queryContext = "";
    if (lastUserMessage) {
      queryContext = await fetchQueryContext(
        lastUserMessage.content,
        currentDateInfo,
      );
    }

    const systemPrompt = `Du bist ein hilfreicher KI-Assistent für den "Polittalk-Watcher", eine Plattform zur Analyse deutscher politischer Talkshows.

      WICHTIGER KONTEXT:
      - ${currentDateInfo}
      ${queryContext}
      - Beantworte die Frage AUSSCHLIESSLICH auf Basis des obigen Datenbank-Abfrageergebnisses.
      - Wenn kein Ergebnis vorhanden ist oder die Abfrage leer war, sage ehrlich, dass dazu keine Daten vorliegen.
      - Erwähne die SQL-Query oder technische Details NICHT in deiner Antwort an den Nutzer.
      - Erwähne NICHT, welche Sendungen aus der Auswertung ausgeschlossen wurden oder nach welcher Methodik gefiltert wurde (z.B. keine Sätze wie "Ausschluss von Formaten wie ..."). Gib einfach das Ergebnis an, ohne die Filterlogik zu erklären.
      - Antworte präzise, informativ und freundlich auf Deutsch.
      - Formatiere deine Antworten mit Markdown. Stelle tabellarische Daten IMMER als Markdown-Tabelle dar (z.B. | Spalte 1 | Spalte 2 | ...).
      - Themen außerhalb politischer Talkshows solltest du höflich ablehnen.
      - Daten sind von 2024 bis heute.
      - FÜGE KEINE AUTOMATISCHE QUELLENANGABE ODER SIGNATUR AM ENDE DEINER NACHRICHTEN HINZU (z.B. "(Quelle: ...)").

      BEACHTE: Du bist Teil eines Systems, das deutsche politische Talkshows analysiert. Andere Fragen sind nicht relevant und sollten höflich abgelehnt werden.
`;

    let conversationHistory =
      systemPrompt + "\n\n---KONVERSATIONSVERLAUF---\n\n";

    const conversationMessages = messages.filter(
      (m: Message) => m.role !== "system",
    );
    for (const msg of conversationMessages) {
      if (msg.role === "user") {
        conversationHistory += `USER: ${msg.content}\n\n`;
      } else if (msg.role === "assistant") {
        conversationHistory += `ASSISTANT: ${msg.content}\n\n`;
      }
    }

    conversationHistory +=
      "---ENDE KONVERSATIONSVERLAUF---\n\nBitte antworte auf die letzte USER-Nachricht unter Berücksichtigung des gesamten Konversationsverlaufs.";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (USE_LOCAL_LLM) {
            console.log("🤖 Nutze lokales LLM (LM Studio)");
            await streamLocalLLM(
              systemPrompt,
              conversationMessages,
              controller,
              encoder,
            );
          } else {
            if (!MODEL) throw new Error("Modell ist nicht definiert");

            const aiStream = await ai.models.generateContentStream({
              model: MODEL,
              contents: conversationHistory,
              config: {
                temperature: 0.7,
                maxOutputTokens: 500,
                systemInstruction:
                  "Beantworte die Anfrage präzise und informativ auf Deutsch und mit Markdown. Tabellen immer als Markdown-Tabelle.",
              },
            });

            for await (const chunk of aiStream) {
              const content = chunk.text || "";
              if (content) {
                const data = `data: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (aiError) {
          console.error("❌ LLM Fehler:", aiError);

          let errorMessage = "KI-Service nicht erreichbar";
          if (
            aiError &&
            typeof aiError === "object" &&
            "status" in aiError &&
            (aiError as { status: number }).status === 429
          ) {
            errorMessage =
              "Die KI-Kapazität ist aktuell ausgeschöpft. Bitte versuchen Sie es in einigen Minuten erneut.";
          }

          const errorData = `data: ${JSON.stringify({
            error: errorMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Chat API Fehler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("Error Details:", errorMessage);

    return NextResponse.json(
      {
        error: "Fehler bei der Verarbeitung der Anfrage",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
