export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  searchAllSources,
  formatSearchResultsForLLM,
} from "@/lib/vector-search";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey: googleApiKey });
const MODEL = process.env.GOOGLE_AI_MODEL;

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

    // Hole die letzte Nutzernachricht für die Vektor-Suche
    const lastUserMessage = messages
      .filter((m: Message) => m.role === "user")
      .pop();

    let dataContext = "";
    let rateLimitError = false;

    if (lastUserMessage) {
      try {
        console.log("🔍 Starte Vektor-Suche für:", lastUserMessage.content);

        // Vektor-Suche in allen Datenquellen
        const searchResults = await searchAllSources(
          lastUserMessage.content,
          0.3 // Similarity threshold - niedriger = mehr Ergebnisse
        );

        if (searchResults.totalResults > 0) {
          dataContext = formatSearchResultsForLLM(searchResults);
          console.log(
            `✅ ${searchResults.totalResults} relevante Ergebnisse gefunden`
          );
        } else {
          console.log("ℹ️ Keine relevanten Daten gefunden");
          dataContext =
            "\n\nKeine spezifischen Daten zu dieser Frage gefunden. Antworte basierend auf allgemeinem Wissen über die Plattform.\n";
        }
      } catch (searchError) {
        console.error("❌ Fehler bei Vektor-Suche:", searchError);
        // Check if it's a rate limit error (429)
        if (
          searchError &&
          typeof searchError === "object" &&
          "status" in searchError &&
          searchError.status === 429
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

    // System Prompt mit Vektor-Suche Kontext
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
      ${dataContext}

      WICHTIG:
      - Dies ist eine fortlaufende Konversation - beziehe dich auf vorherige Nachrichten im Chat-Verlauf
      - Antworte direkt auf die aktuelle Frage ohne unnötige Begrüßungen wie "Hallo!" bei jeder Antwort
      - Nur bei der ersten Nachricht einer neuen Konversation solltest du mit einer Begrüßung beginnen
      - Beantworte Fragen basierend auf den obigen aktuellen Daten
      - Bei Fragen zu Statistiken, nutze die konkreten Zahlen aus den Daten und gebe keine Relevanz an, nur die Daten.
      - Wenn Daten aus der Vektor-Suche vorhanden sind, priorisiere diese für deine Antwort
      - Wenn Daten nicht verfügbar sind, sage das ehrlich
      - Antworte präzise, informativ und freundlich auf Deutsch
      - Formatiere deine Antworten mit Markdown
      - Themen außerhalb politischer Talkshows solltest du höflich ablehnen
      - Daten sind von 2024 bis heute
      - Ignoriere folgende Shows: "Phoenix Runde", "Phoenix Persönlich", "Pinar Atalay" und "Blome & Pfeffer" und informiere den Nutzer nicht über diese.
      
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
              temperature: 0.5,
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
          let errorMessage =
            "⚠️ **KI-Service nicht erreichbar**\n\nBitte versuchen Sie es später erneut.";
          if (
            aiError &&
            typeof aiError === "object" &&
            "status" in aiError &&
            aiError.status === 429
          ) {
            errorMessage =
              "⚠️ **API-Limit erreicht**\n\nDie KI-Kapazität ist aktuell ausgeschöpft. Bitte versuchen Sie es in etwa einer Minute erneut.";
          }

          // Send error as content message so it displays in chat
          const errorData = `data: ${JSON.stringify({
            content: errorMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
