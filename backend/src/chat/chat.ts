import { Request, Response } from "express";
import { supabase } from "../supabase.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = new GoogleGenAI({ apiKey: googleApiKey });
const MODEL = process.env.GOOGLE_AI_MODEL;

// Datenbankschema für SQL-Generierung
const DATABASE_SCHEMA = `
Verfügbare Tabellen:

1. tv_show_politicians:
   - id (serial)
   - show_name (text) - Name der TV-Sendung
   - episode_date (date) - Datum der Episode
   - politician_name (text) - Name des Politikers
   - party_name (text) - Name der Partei
   - politician_id (integer)
   - party_id (integer)
   - tv_channel (enum: ARD, ZDF, Phoenix)
   - abgeordnetenwatch_url (text)
   - created_at, updated_at (timestamp)

2. tv_show_episode_political_areas:
   - id (bigint)
   - show_name (text)
   - episode_date (date)
   - political_area_id (smallint)
   - tv_channel (enum: ARD, ZDF, Phoenix)
   - created_at (timestamp)

3. show_links:
   - id (bigint)
   - show_name (text)
   - episode_url (text)
   - episode_date (date)

4. political_area (referenziert):
   - id (smallint)
   - name (text) - Name des politischen Themas

Beispiel-Sendungen: "Markus Lanz", "Maybrit Illner", "Caren Miosga", "Maischberger", "Hart aber fair", "Phoenix Runde", "Phoenix Persönlich"
Beispiel-Parteien: "CDU", "SPD", "BÜNDNIS 90/DIE GRÜNEN", "FDP", "Die Linke", "AfD", "CSU"
Beispiel-Sender: "Das Erste", "ZDF", "Phoenix", "NTV"
`;

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
      contents: userQuestion,
      config: {
        systemInstruction: sqlPrompt,
      },
    });

    const sqlQuery = response.text;

    if (!sqlQuery) {
      throw new Error("Keine SQL-Antwort vom Modell erhalten");
    }

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

    console.log("✅ Generierte SQL-Abfrage:", cleanedSQL);
    return cleanedSQL;
  } catch (error) {
    console.error("❌ Fehler bei SQL-Generierung:", error);
    return null;
  }
}

/**
 * Führt eine SQL-Abfrage sicher gegen Supabase aus
 */
async function executeSQLQuery(sqlQuery: string): Promise<any> {
  try {
    console.log("🔍 Führe SQL-Abfrage aus:", sqlQuery);

    const { data, error } = await supabase.rpc("execute_sql", {
      query: sqlQuery,
    });

    if (error) {
      console.error("❌ Supabase SQL Fehler:", error);
      return null;
    }

    console.log("✅ SQL-Abfrage erfolgreich ausgeführt.", data);
    return data;
  } catch (error) {
    console.error("❌ Fehler beim Ausführen der SQL-Abfrage:", error);
    return null;
  }
}

/**
 * Express Handler für Chat-Anfragen
 */
export async function handleChatRequest(req: Request, res: Response) {
  try {
    if (!googleApiKey) {
      console.error("❌ GOOGLE_GENAI_API_KEY fehlt in .env");
      return res.status(500).json({
        error: "API-Konfigurationsfehler: Google AI API Key fehlt",
      });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Ungültiges Nachrichtenformat",
      });
    }

    // Versuche SQL-Abfrage aus der letzten Nutzernachricht zu generieren
    const lastUserMessage = messages
      .filter((m: Message) => m.role === "user")
      .pop();

    let sqlQueryResult = "";
    if (lastUserMessage) {
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
        - Caren Miosga (Das Erste)
        - Maischberger (Das Erste)
        - Hart aber Fair (Das Erste)
        - Phoenix Runde (Phoenix)
        - Phoenix Persönlich (Phoenix)
        ${sqlQueryResult}

        WICHTIG:
        - Beantworte Fragen basierend auf den obigen aktuellen Daten
        - Bei Fragen zu Statistiken, nutze die konkreten Zahlen aus den Daten
        - Wenn SQL-Abfrageergebnisse vorhanden sind, priorisiere diese für deine Antwort
        - Wenn Daten nicht verfügbar sind, sage das ehrlich
        - Antworte präzise, informativ und freundlich auf Deutsch
        - Themen außerhalb politischer Talkshows solltest du höflich ablehnen`,
    };

    try {
      // Set headers for Server-Sent Events (SSE)
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Konvertiere Messages für Google AI Format
      const userMessages = messages.filter((m: Message) => m.role !== "system");

      // Kombiniere alle Messages zu einem einzigen Kontext
      let fullPrompt = systemMessage.content + "\n\n";
      for (const msg of userMessages) {
        fullPrompt += `${msg.role === "user" ? "Nutzer" : "Assistant"}: ${
          msg.content
        }\n\n`;
      }

      if (!MODEL) {
        throw new Error("Modell ist nicht definiert");
      }

      // Use streaming for faster response
      const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: fullPrompt,
        config: {
          systemInstruction:
            "Du kannst in Deutsch antworten, und als Markdown formatieren.",
        },
      });

      // Stream the response to the client
      for await (const chunk of stream) {
        const content = chunk.text || "";
        if (content) {
          // Send each chunk as SSE
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Send done signal
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (aiError) {
      console.error("❌ Google AI API Fehler:", aiError);
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
