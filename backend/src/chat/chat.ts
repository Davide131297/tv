import { Request, Response } from "express";
import { InferenceClient } from "@huggingface/inference";
import { getChatContext, formatContextForAI } from "./chat-context.js";

const MODEL = "swiss-ai/Apertus-70B-Instruct-2509";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Express Handler für Chat-Anfragen
 */
export async function handleChatRequest(req: Request, res: Response) {
  try {
    // Verwende HF_ACCESS_TOKEN aus .env
    const token = process.env.HF_ACCESS_TOKEN;
    if (!token) {
      console.error("❌ HF_ACCESS_TOKEN fehlt in .env");
      return res.status(500).json({
        error: "API-Konfigurationsfehler: HuggingFace Token fehlt",
      });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Ungültiges Nachrichtenformat",
      });
    }

    const hf = new InferenceClient(token);

    // Lade aktuelle Daten aus der Datenbank
    let dbContext;
    try {
      dbContext = await getChatContext();
    } catch (dbError) {
      console.error("❌ Fehler beim Laden des Chat-Kontexts:", dbError);
      return res.status(500).json({
        error: "Datenbank-Fehler beim Laden des Kontexts",
      });
    }
    const contextString = formatContextForAI(dbContext);

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
    const systemMessage: Message = {
      role: "system",
      content: `Du bist ein hilfreicher KI-Assistent für den "Polittalk-Watcher", eine Plattform zur Analyse deutscher politischer Talkshows.

        WICHTIGER KONTEXT:
        - Heutiges Datum: ${formattedDate}
        - Aktuelles Jahr: ${currentYear}
        - Aktueller Monat: ${currentMonth}
        
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
      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Use streaming for faster response
      const stream = await hf.chatCompletionStream({
        model: MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: chatMessages as any,
        max_tokens: 500,
        temperature: 0.7,
        provider: "publicai",
      });

      // Stream the response to the client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          // Send each chunk as SSE
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Send done signal
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (aiError) {
      console.error("❌ HuggingFace API Fehler:", aiError);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "KI-Service nicht erreichbar",
        });
      }
    }
  } catch (error) {
    console.error("❌ Chat API Fehler:", error);
    // Detaillierte Fehlermeldung für Debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";
    console.error("Error Details:", errorMessage);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Fehler bei der Verarbeitung der Anfrage",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  }
}
