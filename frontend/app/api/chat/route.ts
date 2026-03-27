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

const SHOW_NAMES = [
  "Markus Lanz",
  "Maybrit Illner",
  "Caren Miosga",
  "Maischberger",
  "Hart aber Fair",
  "Phoenix Runde",
  "Phoenix Persönlich",
  "Pinar Atalay",
  "Blome & Pfeffer",
] as const;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type DocumentRow = {
  content: string;
  metadata: {
    type?: string;
    show?: string;
    date?: string;
    latest_date?: string;
    guest_count?: number;
    year?: number;
    party?: string;
    politician?: string;
    topic?: string;
    count?: number;
    total?: number;
  } | null;
};

type ChatIntent =
  | "latest_guest"
  | "show_guest_ranking"
  | "politician_show_count"
  | "politician_ranking"
  | "party_ranking"
  | "topic_lookup"
  | "general";

type RetrievalPlan = {
  intent: ChatIntent;
  showName: string | null;
  year: number | null;
  docTypes: string[];
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findReferencedShow(message: string): string | null {
  const normalizedMessage = normalizeText(message);

  for (const show of SHOW_NAMES) {
    if (normalizedMessage.includes(normalizeText(show))) {
      return show;
    }
  }

  return null;
}

function extractYear(message: string): number | null {
  const yearMatch = message.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;

  return Number(yearMatch[1]);
}

function classifyIntent(message: string): ChatIntent {
  const normalizedMessage = normalizeText(message);

  if (isLatestGuestQuestion(message)) {
    return "latest_guest";
  }

  if (
    normalizedMessage.includes("am haufigsten bei") ||
    normalizedMessage.includes("am häufigsten bei") ||
    normalizedMessage.includes("top-gaste") ||
    normalizedMessage.includes("top gäste")
  ) {
    return "show_guest_ranking";
  }

  if (
    normalizedMessage.includes("wie oft war") &&
    (normalizedMessage.includes("bei ") || normalizedMessage.includes("in "))
  ) {
    return "politician_show_count";
  }

  if (
    normalizedMessage.includes("welche partei") ||
    normalizedMessage.includes("partei") ||
    normalizedMessage.includes("parteien-ranking")
  ) {
    return "party_ranking";
  }

  if (
    normalizedMessage.includes("wer war am haufigsten") ||
    normalizedMessage.includes("wer war am häufigsten") ||
    normalizedMessage.includes("top-politiker") ||
    normalizedMessage.includes("politiker-ranking")
  ) {
    return "politician_ranking";
  }

  if (
    normalizedMessage.includes("thema") ||
    normalizedMessage.includes("themen") ||
    normalizedMessage.includes("besprochen") ||
    normalizedMessage.includes("behandelt")
  ) {
    return "topic_lookup";
  }

  return "general";
}

function buildRetrievalPlan(message: string): RetrievalPlan {
  const intent = classifyIntent(message);
  const showName = findReferencedShow(message);
  const year = extractYear(message);

  switch (intent) {
    case "latest_guest":
      return {
        intent,
        showName,
        year,
        docTypes: ["show_latest_summary", "episode_detail"],
      };
    case "show_guest_ranking":
      return {
        intent,
        showName,
        year,
        docTypes: ["show_top_guests", "politician_show_stats", "episode_detail"],
      };
    case "politician_show_count":
      return {
        intent,
        showName,
        year,
        docTypes: ["politician_show_stats", "show_top_guests", "episode_detail"],
      };
    case "politician_ranking":
      return {
        intent,
        showName,
        year,
        docTypes: ["politician_ranking", "yearly_politician_ranking", "yearly_politician_stats"],
      };
    case "party_ranking":
      return {
        intent,
        showName,
        year,
        docTypes: ["party_ranking", "party_stats", "yearly_party_ranking", "yearly_party_stats"],
      };
    case "topic_lookup":
      return {
        intent,
        showName,
        year,
        docTypes: [
          "episode_topics",
          "topic_stats",
          "topic_show_ranking",
          "topic_year_ranking",
          "topic_year_show_stats",
        ],
      };
    default:
      return {
        intent,
        showName,
        year,
        docTypes: [],
      };
  }
}

function tokenizeForRetrieval(message: string): string[] {
  const stopWords = new Set([
    "wer",
    "war",
    "ist",
    "sind",
    "die",
    "der",
    "das",
    "den",
    "dem",
    "ein",
    "eine",
    "und",
    "oder",
    "bei",
    "in",
    "am",
    "im",
    "vom",
    "von",
    "zu",
    "mit",
    "wie",
    "oft",
    "letzte",
    "letzten",
    "zuletzt",
    "sendung",
    "talkshow",
    "talkshows",
    "gast",
    "gaste",
    "gaste?",
    "politiker",
  ]);

  return normalizeText(message)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function scoreDocument(
  query: string,
  plan: RetrievalPlan,
  document: DocumentRow,
): number {
  const normalizedContent = normalizeText(document.content);
  const queryTokens = tokenizeForRetrieval(query);
  let score = 0;

  for (const token of queryTokens) {
    if (normalizedContent.includes(token)) {
      score += 3;
    }
    if (normalizeText(JSON.stringify(document.metadata ?? {})).includes(token)) {
      score += 2;
    }
  }

  if (
    plan.showName &&
    document.metadata?.show &&
    document.metadata.show === plan.showName
  ) {
    score += 8;
  }

  if (
    plan.year &&
    (document.metadata?.year === plan.year ||
      document.metadata?.date?.startsWith(String(plan.year)) ||
      document.metadata?.latest_date?.startsWith(String(plan.year)) ||
      document.content.includes(String(plan.year)))
  ) {
    score += 6;
  }

  if (
    plan.docTypes.length > 0 &&
    document.metadata?.type &&
    plan.docTypes.includes(document.metadata.type)
  ) {
    score += 10;
  }

  const sortableDate = document.metadata?.latest_date ?? document.metadata?.date;
  if (sortableDate) {
    score += new Date(sortableDate).getTime() / 1_000_000_000_000;
  }

  return score;
}

async function fetchStructuredDocuments(
  query: string,
  plan: RetrievalPlan,
  limit = 6,
): Promise<DocumentRow[]> {
  let builder = supabase.from("documents").select("content, metadata");

  if (plan.showName) {
    builder = builder.contains("metadata", { show: plan.showName });
  }

  const { data, error } = await builder.limit(plan.showName ? 500 : 2000);

  if (error) {
    console.error("❌ Fehler beim Laden strukturierter Dokumente:", error);
    return [];
  }

  const rows = ((data ?? []) as DocumentRow[]).filter((row) => {
    const type = row.metadata?.type;

    if (plan.docTypes.length > 0 && (!type || !plan.docTypes.includes(type))) {
      return false;
    }

    if (
      plan.year &&
      row.metadata?.year !== plan.year &&
      !row.metadata?.date?.startsWith(String(plan.year)) &&
      !row.metadata?.latest_date?.startsWith(String(plan.year)) &&
      !row.content.includes(String(plan.year))
    ) {
      return false;
    }

    return true;
  });

  return rows
    .map((row) => ({
      row,
      score: scoreDocument(query, plan, row),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row }) => row);
}

function isLatestGuestQuestion(message: string): boolean {
  const normalizedMessage = normalizeText(message);

  return [
    "wer war zuletzt bei",
    "wer war zuletzt in",
    "wer war in der letzten sendung",
    "wer war zuletzt zu gast",
    "wer war zuletzt gast",
    "letzter gast",
    "letzte gaste",
    "letzte gäste",
  ].some((pattern) => normalizedMessage.includes(pattern));
}

function extractLatestGuestsFromContent(content: string): string | null {
  const summaryMatch = content.match(
    /am\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+\(Gäste\s*\/\s*Politiker:\s*([^)]+(?:\)[^;]*)?)\)/i,
  );
  if (summaryMatch) {
    return `${summaryMatch[2]} am ${summaryMatch[1]}`;
  }

  const episodeMatch = content.match(
    /Am\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+waren.*?:\s*(.+)\.$/i,
  );
  if (episodeMatch) {
    return `${episodeMatch[2]} am ${episodeMatch[1]}`;
  }

  return null;
}

async function getLatestShowAnswer(showName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("content, metadata")
    .contains("metadata", { show: showName });

  if (error) {
    console.error("❌ Fehler beim Laden des Show-Dokuments:", error);
    return null;
  }

  const rows = (data ?? []) as DocumentRow[];
  const preferredDoc =
    rows.find((row) => row.metadata?.type === "show_latest_summary") ??
    rows
      .filter((row) => row.metadata?.type === "episode_detail")
      .sort((a, b) => {
        const left = a.metadata?.date ?? "";
        const right = b.metadata?.date ?? "";
        return right.localeCompare(left);
      })[0];

  if (!preferredDoc) {
    return null;
  }

  const latestGuests = extractLatestGuestsFromContent(preferredDoc.content);
  const latestDate =
    preferredDoc.metadata?.latest_date ?? preferredDoc.metadata?.date;

  if (latestGuests && latestDate) {
    return `Zuletzt war${latestGuests.includes(",") ? "en" : ""} bei ${showName} ${latestGuests}. Das stammt aus der zuletzt erfassten Sendung vom ${new Date(latestDate).toLocaleDateString("de-DE")}.`;
  }

  if (latestGuests) {
    return `Zuletzt war${latestGuests.includes(",") ? "en" : ""} bei ${showName} ${latestGuests}.`;
  }

  return preferredDoc.content;
}

function createSseResponse(message: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content: message })}\n\n`),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
  query: string,
  queryEmbedding: number[],
  plan: RetrievalPlan,
  matchThreshold = 0.35,
  matchCount = 5,
): Promise<string> {
  try {
    const structuredDocs = await fetchStructuredDocuments(query, plan, matchCount);
    if (structuredDocs.length > 0) {
      const structuredContext = structuredDocs.map(
        (doc) =>
          `- [Typ: ${doc.metadata?.type ?? "unbekannt"} | Sendung: ${doc.metadata?.show ?? "n/a"} | Datum/Jahr: ${doc.metadata?.latest_date ?? doc.metadata?.date ?? doc.metadata?.year ?? "n/a"}] ${doc.content}`,
      );

      return `\n\nRELEVANTE WISSENSBASIS (STRUKTURIERTES RETRIEVAL):\n${structuredContext.join("\n")}`;
    }

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
      (doc: { content: string; similarity: number; metadata?: DocumentRow["metadata"] }) =>
        `- [Typ: ${doc.metadata?.type ?? "unbekannt"} | Sendung: ${doc.metadata?.show ?? "n/a"}] ${doc.content} (Ähnlichkeit: ${(doc.similarity * 100).toFixed(0)}%)`,
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
    const retrievalPlan = lastUserMessage
      ? buildRetrievalPlan(lastUserMessage.content)
      : buildRetrievalPlan("");

    if (lastUserMessage) {
      const referencedShow = findReferencedShow(lastUserMessage.content);
      if (referencedShow && isLatestGuestQuestion(lastUserMessage.content)) {
        const directAnswer = await getLatestShowAnswer(referencedShow);
        if (directAnswer) {
          return createSseResponse(directAnswer);
        }
      }
    }

    let ragContext = "";
    let rateLimitError = false;

    if (lastUserMessage) {
      // RAG-Embedding immer ausführen (Supabase, kein Gemini)
      const embeddingResult = await generateEmbedding(lastUserMessage.content);
      if (embeddingResult !== null) {
        ragContext = await searchRelevantDocuments(
          lastUserMessage.content,
          embeddingResult,
          retrievalPlan,
          retrievalPlan.intent === "general" ? 0.35 : 0.45,
          retrievalPlan.intent === "general" ? 5 : 6,
        );
      } else {
        const structuredFallback = await fetchStructuredDocuments(
          lastUserMessage.content,
          retrievalPlan,
          6,
        );
        if (structuredFallback.length > 0) {
          ragContext = `\n\nRELEVANTE WISSENSBASIS (STRUKTURIERTES RETRIEVAL):\n${structuredFallback
            .map(
              (doc) =>
                `- [Typ: ${doc.metadata?.type ?? "unbekannt"} | Sendung: ${doc.metadata?.show ?? "n/a"} | Datum/Jahr: ${doc.metadata?.latest_date ?? doc.metadata?.date ?? doc.metadata?.year ?? "n/a"}] ${doc.content}`,
            )
            .join("\n")}`;
        }
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
      - Erkannte Nutzerintention: ${retrievalPlan.intent}
      - Erkannte Sendung: ${retrievalPlan.showName ?? "keine"}
      - Erkannter Jahresfilter: ${retrievalPlan.year ?? "keiner"}

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
      - Nutze zuerst die strukturiert gelieferten Treffer. Wenn mehrere Treffer vorliegen, beantworte nur das, was zur erkannten Nutzerintention passt.
      - Wenn RAG-Wissensbasis vorhanden ist, nutze diese als primäre Informationsquelle
      - Wenn die Frage nach Gästen in einer konkreten Sendung fragt, antworte mit den Gästen oder Politikern aus den Daten und NICHT mit dem Moderator der Sendung
      - Vermische keine Dokumenttypen. Rankings beantworten keine Frage nach einer letzten Sendung, und Episoden-Details beantworten kein Gesamtranking.
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
