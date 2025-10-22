import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { getChatContext, formatContextForAI } from "@/lib/chat-context";

const MODEL = "swiss-ai/Apertus-70B-Instruct-2509";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.NEXT_PUBLIC_HF_ACCESS_TOKEN;
    if (!token) {
      console.error("❌ NEXT_PUBLIC_HF_ACCESS_TOKEN fehlt in .env");
      return NextResponse.json(
        { error: "API-Konfigurationsfehler" },
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
    const dbContext = await getChatContext();
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

    const chat = await hf.chatCompletion({
      model: MODEL,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: chatMessages as any,
      max_tokens: 500,
      temperature: 0.7,
      provider: "publicai",
    });

    const content = chat.choices?.[0]?.message?.content?.trim() ?? "";

    if (!content) {
      return NextResponse.json(
        { error: "Keine Antwort von der KI erhalten" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: content });
  } catch (error) {
    console.error("Chat API Fehler:", error);
    return NextResponse.json(
      { error: "Fehler bei der Verarbeitung der Anfrage" },
      { status: 500 }
    );
  }
}
