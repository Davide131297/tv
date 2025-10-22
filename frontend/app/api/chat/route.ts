import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { getChatContext, formatContextForAI } from "@/lib/chat-context";

const MODEL = "swiss-ai/Apertus-70B-Instruct-2509";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// Enable Edge Runtime for faster responses and better streaming support
export const runtime = "edge";
export const maxDuration = 30; // 30 seconds max (works on Hobby plan with Edge)

export async function POST(req: NextRequest) {
  try {
    // Use HF_ACCESS_TOKEN (without NEXT_PUBLIC prefix) for server-side API routes
    const token = process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN;
    if (!token) {
      console.error("❌ HF_ACCESS_TOKEN fehlt in .env");
      return NextResponse.json(
        { error: "API-Konfigurationsfehler: HuggingFace Token fehlt" },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Ungültige Nachrichtenformat" },
        { status: 400 }
      );
    }

    const hf = new InferenceClient(token);

    // Lade aktuelle Daten aus der Datenbank
    let dbContext;
    try {
      dbContext = await getChatContext();
    } catch (dbError) {
      console.error("❌ Fehler beim Laden des Chat-Kontexts:", dbError);
      return NextResponse.json(
        { error: "Datenbank-Fehler beim Laden des Kontexts" },
        { status: 500 }
      );
    }
    const contextString = formatContextForAI(dbContext);

    // System Prompt mit Datenbank-Kontext
    const systemMessage: Message = {
      role: "system",
      content: `Du bist ein hilfreicher KI-Assistent für den "Polittalk-Watcher", eine Plattform zur Analyse deutscher politischer Talkshows.

        Du hast Zugriff auf aktuelle Statistiken und Daten über folgende Sendungen:
        - Markus Lanz (ZDF)
        - Maybrit Illner (ZDF)
        - Caren Miosga (ARD)
        - Maischberger (ARD)
        - Hart aber Fair (ARD)
        - Phoenix Runde (Phoenix)

        ${contextString}

        WICHTIG:
        - Beantworte Fragen basierend auf den obigen aktuellen Daten
        - Bei Fragen zu Statistiken, nutze die konkreten Zahlen aus den Daten
        - Wenn Daten nicht verfügbar sind, sage das ehrlich
        - Antworte präzise, informativ und freundlich auf Deutsch
        - Themen außerhalb politischer Talkshows solltest du höflich ablehnen`,
    };

    const chatMessages = [systemMessage, ...messages];

    try {
      // Use streaming for faster response and to avoid timeouts
      const stream = await hf.chatCompletionStream({
        model: MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: chatMessages as any,
        max_tokens: 500,
        temperature: 0.7,
        provider: "publicai",
      });

      // Create a ReadableStream to send data to the client
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                // Send each chunk as JSON
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            }
            // Send done signal
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("❌ Streaming error:", error);
            controller.error(error);
          }
        },
      });

      // Return streaming response
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (aiError) {
      console.error("❌ HuggingFace API Fehler:", aiError);
      return NextResponse.json(
        { error: "KI-Service nicht erreichbar" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Chat API Fehler:", error);
    // Detaillierte Fehlermeldung für Debugging
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
