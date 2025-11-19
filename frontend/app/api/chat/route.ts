export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { DATABASE_SCHEMA } from "@/lib/db-schema";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey: googleApiKey });
const MODEL = process.env.GOOGLE_AI_MODEL;

/**
 * Generiert eine SQL-Abfrage aus der Nutzerfrage
 */
async function generateSQLQuery(userQuestion: string): Promise<string | null> {
  const sqlPrompt = `Du bist ein SQL-Experte. Generiere eine PostgreSQL-Abfrage basierend auf der Nutzerfrage.
      ${DATABASE_SCHEMA}

      WICHTIGE REGELN:
      - Verwende nur SELECT-Abfragen (keine INSERT, UPDATE, DELETE)
      - Nutze nur die oben genannten Tabellen und Spalten
      - Verwende deutsche Datumswerte im Format 'YYYY-MM-DD'
      - Bei Datumsvergleichen nutze episode_date
      - Für Joins zwischen Tabellen nutze show_name und episode_date
      - Bei Aggregationen (COUNT, SUM, etc.) nutze GROUP BY
      - KEIN Semikolon am Ende der Abfrage
      - Antworte NUR mit der SQL-Abfrage, keine Erklärungen
      - Wenn die Frage nicht mit SQL beantwortbar ist, antworte mit "NO_SQL"
    `;

  if (!MODEL) {
    throw new Error("Modell ist nicht definiert");
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${sqlPrompt}\n\nNutzerfrage: ${userQuestion}`,
      config: {
        temperature: 0.1,
        maxOutputTokens: 300,
      },
    });

    const sqlQuery = response.text?.trim() || "";

    // Bereinige die SQL-Abfrage
    let cleanedSQL = sqlQuery
      .replace(/```sql/g, "")
      .replace(/```/g, "")
      .replace(/;\s*$/g, "") // Entferne Semikolon am Ende
      .trim();

    // Prüfe ob SQL generiert wurde
    if (
      cleanedSQL.toUpperCase().includes("NO_SQL") ||
      !cleanedSQL.toLowerCase().startsWith("select")
    ) {
      return null;
    }
    return cleanedSQL;
  } catch (error) {
    console.error("❌ Fehler bei SQL-Generierung:", error);
    // Rethrow 429 errors so they can be handled by the caller
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 429
    ) {
      throw error;
    }
    return null;
  }
}

/**
 * Führt eine SQL-Abfrage sicher gegen Supabase aus
 */
async function executeSQLQuery(sqlQuery: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc("execute_sql", {
      query: sqlQuery,
    });

    if (error) {
      console.error("❌ Supabase SQL Fehler:", error);
      return null;
    }
    return data;
  } catch (error) {
    console.error("❌ Fehler beim Ausführen der SQL-Abfrage:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!googleApiKey) {
      console.error("❌ GOOGLE_GENAI_API_KEY fehlt in .env");
      return NextResponse.json(
        { error: "API-Konfigurationsfehler: Google AI API Key fehlt" },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Ungültiges Nachrichtenformat" },
        { status: 400 }
      );
    }

    // Versuche SQL-Abfrage aus der letzten Nutzernachricht zu generieren
    const lastUserMessage = messages
      .filter((m: Message) => m.role === "user")
      .pop();

    let sqlQueryResult = "";
    let rateLimitError = false;

    if (lastUserMessage) {
      try {
        const sqlQuery = await generateSQLQuery(lastUserMessage.content);

        if (sqlQuery) {
          const queryData = await executeSQLQuery(sqlQuery);

          if (queryData) {
            sqlQueryResult = `\n\nAKTUELLE DATENBANK-ABFRAGE:
            SQL: ${sqlQuery}
            Ergebnis: ${JSON.stringify(queryData, null, 2)}

            Nutze diese Daten für deine Antwort.`;
          }
        }
      } catch (sqlError) {
        // Check if it's a rate limit error (429)
        if (
          sqlError &&
          typeof sqlError === "object" &&
          "status" in sqlError &&
          sqlError.status === 429
        ) {
          rateLimitError = true;
        }
      }
    }

    // If rate limit error occurred during SQL generation, return error immediately
    if (rateLimitError) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const errorData = `data: ${JSON.stringify({
            error:
              "Die KI-Kapazität ist aktuell ausgeschöpft. Bitte versuchen Sie es in einigen Minuten erneut.",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Aktuelles Datum für den Kontext
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

    // System Prompt mit Datenbank-Kontext
    const systemPrompt = `Du bist ein hilfreicher KI-Assistent für den "Polittalk-Watcher", eine Plattform zur Analyse deutscher politischer Talkshows.

      WICHTIGER KONTEXT:
      - Heutiges Datum: ${formattedDate}
      - Aktuelles Jahr: ${currentYear}
      - Aktueller Monat: ${currentMonth}

      Du hast Zugriff auf aktuelle Statistiken und Daten über folgende Sendungen:
      - Markus Lanz (ZDF)
      - Maybrit Illner (ZDF)
      - Caren Miosga (Das Erste)
      - Maischberger (Das Erste)
      - Hart aber Fair (Das Erste)
      - Phoenix Runde (Phoenix)
      - Phoenix Persönlich (Phoenix)
      - Pinar Atalay (NTV)
      - Blome & Pfeffer (NTV)
      ${sqlQueryResult}

      WICHTIG:
      - Dies ist eine fortlaufende Konversation - beziehe dich auf vorherige Nachrichten im Chat-Verlauf
      - Antworte direkt auf die aktuelle Frage ohne unnötige Begrüßungen wie "Hallo!" bei jeder Antwort
      - Nur bei der ersten Nachricht einer neuen Konversation solltest du mit einer Begrüßung beginnen
      - Beantworte Fragen basierend auf den obigen aktuellen Daten
      - Bei Fragen zu Statistiken, nutze die konkreten Zahlen aus den Daten
      - Wenn SQL-Abfrageergebnisse vorhanden sind, priorisiere diese für deine Antwort
      - Wenn Daten nicht verfügbar sind, sage das ehrlich
      - Antworte präzise, informativ und freundlich auf Deutsch
      - Formatiere deine Antworten mit Markdown
      - Themen außerhalb politischer Talkshows solltest du höflich ablehnen
      - Daten sind von 2024 bis heute
      
      BEACHTE: Du bist Teil eines Systems, das deutsche politische Talkshows analysiert. Andere Fragen sind nicht relevant und sollten höflich abgelehnt werden.
`;

    // Baue Konversations-Verlauf auf
    let conversationHistory =
      systemPrompt + "\n\n---KONVERSATIONSVERLAUF---\n\n";

    // Füge alle bisherigen Nachrichten hinzu (außer system messages)
    const conversationMessages = messages.filter(
      (m: Message) => m.role !== "system"
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

    if (!MODEL) {
      throw new Error("Modell ist nicht definiert");
    }

    // Create ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use streaming for faster response
          const aiStream = await ai.models.generateContentStream({
            model: MODEL,
            contents: conversationHistory,
            config: {
              temperature: 0.7,
              maxOutputTokens: 500,
              systemInstruction:
                "Beantworte die Anfrage präzise und informativ auf Deutsch und mit Markdown.",
            },
          });

          // Stream the response to the client
          for await (const chunk of aiStream) {
            const content = chunk.text || "";
            if (content) {
              // Send each chunk as SSE
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Send done signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (aiError) {
          console.error("❌ Google AI API Fehler:", aiError);

          // Check if it's a rate limit error (429)
          let errorMessage = "KI-Service nicht erreichbar";
          if (
            aiError &&
            typeof aiError === "object" &&
            "status" in aiError &&
            aiError.status === 429
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
      { status: 500 }
    );
  }
}
