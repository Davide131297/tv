export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const USE_LOCAL_LLM = process.env.LokalLLM === "true";
const LOCAL_LLM_URL = "http://127.0.0.1:1234";

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey: googleApiKey });
const MODEL = process.env.GOOGLE_AI_MODEL;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Streamt eine Antwort vom lokalen LM Studio (OpenAI-kompatibel)
 */
async function streamLocalLLM(
  systemPrompt: string,
  conversationMessages: Message[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<void> {
  // OpenAI-Format: system + bisherige Nachrichten
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

/**
 * Generiert ein Embedding für den gegebenen Text via Supabase Edge Function (gte-small, 384 dims)
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      console.error(
        "❌ Embedding-Fehler:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const { embedding } = await response.json();
    return embedding ?? null;
  } catch (error) {
    console.error("❌ Fehler bei Embedding-Generierung:", error);
    return null;
  }
}

/**
 * Sucht relevante Dokumente via Vektorähnlichkeit (RAG)
 */
async function searchRelevantDocuments(
  queryEmbedding: number[],
  matchThreshold = 0.35,
  matchCount = 5,
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error("❌ match_documents Fehler:", error);
      return "";
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ RAG: Keine relevanten Dokumente gefunden");
      return "";
    }

    const contextParts = data.map(
      (doc: { content: string; similarity: number }) =>
        `- ${doc.content} (Ähnlichkeit: ${(doc.similarity * 100).toFixed(0)}%)`,
    );

    return `\n\nRELEVANTE WISSENSBASIS (RAG):\n${contextParts.join("\n")}`;
  } catch (error) {
    console.error("❌ Fehler bei Dokumentensuche:", error);
    return "";
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

    // Letzte Nutzernachricht
    const lastUserMessage = messages
      .filter((m: Message) => m.role === "user")
      .pop();

    let ragContext = "";
    let rateLimitError = false;

    if (lastUserMessage) {
      // RAG-Embedding immer ausführen (Supabase, kein Gemini)
      const embeddingResult = await generateEmbedding(lastUserMessage.content);
      if (embeddingResult !== null) {
        ragContext = await searchRelevantDocuments(embeddingResult);
      }
    }

    // Bei Rate-Limit-Fehler sofort abbrechen
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

    // System Prompt mit RAG + SQL Kontext
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
      ${ragContext}
      - Wenn RAG-Wissensbasis vorhanden ist, nutze diese als primäre Informationsquelle
      - Wenn Daten nicht verfügbar sind, sage das ehrlich
      - Antworte präzise, informativ und freundlich auf Deutsch
      - Formatiere deine Antworten mit Markdown. Stelle tabellarische Daten IMMER als Markdown-Tabelle dar (z.B. | Spalte 1 | Spalte 2 | ...).
      - Themen außerhalb politischer Talkshows solltest du höflich ablehnen
      - Daten sind von 2024 bis heute
      - FÜGE KEINE AUTOMATISCHE QUELLENANGABE ODER SIGNATUR AM ENDE DEINER NACHRICHTEN HINZU (z.B. "(Quelle: ...)").
      
      BEACHTE: Du bist Teil eines Systems, das deutsche politische Talkshows analysiert. Andere Fragen sind nicht relevant und sollten höflich abgelehnt werden.
`;

    // Baue Konversations-Verlauf auf
    let conversationHistory =
      systemPrompt + "\n\n---KONVERSATIONSVERLAUF---\n\n";

    // Füge alle bisherigen Nachrichten hinzu (außer system messages)
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

    // Create ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (USE_LOCAL_LLM) {
            // --- LM Studio (lokal) ---
            console.log("🤖 Nutze lokales LLM (LM Studio)");
            await streamLocalLLM(
              systemPrompt,
              conversationMessages,
              controller,
              encoder,
            );
          } else {
            // --- Google Gemini ---
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
