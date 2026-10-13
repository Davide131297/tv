// Hilfsfunktionen für die Threads API (Textlänge, Aufteilen, Veröffentlichen als Thread mit Antworten).
// Bewusst ohne Supabase-Abhängigkeit, damit die Logik testbar bleibt.

const THREADS_API_BASE = "https://graph.threads.net/v1.0";

/** Maximale Zeichenzahl eines Threads-Textposts laut API-Doku. */
export const THREADS_MAX_TEXT_LENGTH = 500;

const graphemeSegmenter = new Intl.Segmenter("de", { granularity: "grapheme" });
const EMOJI_REGEX = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/**
 * Zählt die Länge eines Textes so, wie die Threads API sie zählt:
 * pro Graphem ein Zeichen, Emojis zählen jedoch mit ihrer Anzahl an UTF-8 Bytes.
 */
export function getThreadsTextLength(text: string): number {
  let length = 0;
  for (const { segment } of graphemeSegmenter.segment(text)) {
    length += EMOJI_REGEX.test(segment)
      ? Buffer.byteLength(segment, "utf8")
      : 1;
  }
  return length;
}

// Bevorzugte Trennstellen: erst Absätze, dann Zeilen, dann Wörter.
const SEPARATORS = ["\n\n", "\n", " "];

function hardSplit(text: string, limit: number): string[] {
  const parts: string[] = [];
  let current = "";
  let currentLength = 0;

  for (const { segment } of graphemeSegmenter.segment(text)) {
    const segmentLength = getThreadsTextLength(segment);
    if (current && currentLength + segmentLength > limit) {
      parts.push(current);
      current = "";
      currentLength = 0;
    }
    current += segment;
    currentLength += segmentLength;
  }

  if (current) parts.push(current);
  return parts;
}

function splitBySeparators(text: string, limit: number, level = 0): string[] {
  if (getThreadsTextLength(text) <= limit) return [text];
  if (level >= SEPARATORS.length) return hardSplit(text, limit);

  const separator = SEPARATORS[level];
  const chunks: string[] = [];
  let current = "";

  for (const piece of text.split(separator)) {
    const candidate = current ? current + separator + piece : piece;
    if (getThreadsTextLength(candidate) <= limit) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (getThreadsTextLength(piece) <= limit) {
      current = piece;
    } else {
      const subChunks = splitBySeparators(piece, limit, level + 1);
      chunks.push(...subChunks.slice(0, -1));
      current = subChunks[subChunks.length - 1] ?? "";
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function formatCounter(index: number | string, total: number | string) {
  return `\n\n(${index}/${total})`;
}

/**
 * Teilt einen Text in Teile auf, die jeweils (inkl. Zähler "(1/3)") das
 * Threads-Limit einhalten. Getrennt wird bevorzugt an Absätzen, dann an
 * Zeilenumbrüchen, dann an Leerzeichen.
 */
export function splitTextForThreads(
  text: string,
  limit: number = THREADS_MAX_TEXT_LENGTH,
): string[] {
  const normalized = text.trim();
  if (getThreadsTextLength(normalized) <= limit) return [normalized];

  // Platz für den Zähler reservieren; falls mehr Teile entstehen als
  // die angenommene Stellenzahl erlaubt, mit größerer Reserve wiederholen.
  for (let digits = 1; ; digits++) {
    const maxCounter = "9".repeat(digits);
    const reserved = getThreadsTextLength(formatCounter(maxCounter, maxCounter));
    const chunks = splitBySeparators(normalized, limit - reserved)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);

    if (String(chunks.length).length <= digits) {
      return chunks.map(
        (chunk, i) => chunk + formatCounter(i + 1, chunks.length),
      );
    }
  }
}

export interface ThreadsApiErrorPayload {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class ThreadsPublishError extends Error {
  constructor(
    message: string,
    /** IDs der Posts, die vor dem Fehler bereits veröffentlicht wurden. */
    public readonly publishedIds: string[],
    public readonly apiError?: ThreadsApiErrorPayload,
  ) {
    super(message);
    this.name = "ThreadsPublishError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ThreadsResponse<T> = T & { error?: ThreadsApiErrorPayload };

async function threadsRequest<T>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<ThreadsResponse<T>> {
  const searchParams = new URLSearchParams({
    ...params,
    access_token: accessToken,
  });
  const url = `${THREADS_API_BASE}/${path}`;

  // Text im Body statt in der URL senden (lange Texte, Sonderzeichen)
  const res =
    method === "GET"
      ? await fetch(`${url}?${searchParams.toString()}`)
      : await fetch(url, { method: "POST", body: searchParams });

  return res.json();
}

interface ContainerOptions {
  text: string;
  replyToId?: string;
  topicTag?: string;
}

async function createTextContainer(
  userId: string,
  accessToken: string,
  { text, replyToId, topicTag }: ContainerOptions,
): Promise<ThreadsResponse<{ id?: string }>> {
  const params: Record<string, string> = { media_type: "TEXT", text };
  if (replyToId) params.reply_to_id = replyToId;
  if (topicTag) params.topic_tag = topicTag;

  return threadsRequest<{ id?: string }>(
    "POST",
    `${userId}/threads`,
    params,
    accessToken,
  );
}

/**
 * Wartet, bis der Container verarbeitet ist (Status FINISHED), bevor er
 * veröffentlicht wird – sonst schlägt v.a. das Antworten auf frische Posts fehl.
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  { intervalMs = 2000, maxAttempts = 15 } = {},
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(intervalMs);

    const json = await threadsRequest<{
      status?: string;
      error_message?: string;
    }>("GET", containerId, { fields: "status,error_message" }, accessToken);

    if (json.error) {
      throw new Error(`Container-Status Fehler: ${JSON.stringify(json.error)}`);
    }
    if (json.status === "FINISHED") return;
    if (json.status === "ERROR" || json.status === "EXPIRED") {
      throw new Error(
        `Container ${containerId} hat Status ${json.status}: ${json.error_message ?? "unbekannt"}`,
      );
    }
  }

  throw new Error(
    `Container ${containerId} wurde nicht rechtzeitig verarbeitet.`,
  );
}

export interface PublishThreadOptions {
  userId: string;
  accessToken: string;
  /** Bereits auf das Limit zugeschnittene Textteile (siehe splitTextForThreads). */
  chunks: string[];
  /** Topic-Tag für den ersten Post (ohne #). */
  topicTag?: string;
  /** Wartezeiten zwischen Wiederholungen beim Erstellen eines Antwort-Containers. */
  replyRetryDelaysMs?: number[];
  containerPollIntervalMs?: number;
}

/**
 * Veröffentlicht den ersten Teil als eigenständigen Post und alle weiteren
 * Teile als Antworten (Kommentare) darunter. Jede Antwort hängt am jeweils
 * vorherigen Teil, damit die Reihenfolge im Thread erhalten bleibt.
 *
 * Es wird nie auf eigenständige Posts ausgewichen: Schlägt eine Antwort fehl,
 * wird ein ThreadsPublishError mit den bereits veröffentlichten IDs geworfen.
 */
export async function publishThread({
  userId,
  accessToken,
  chunks,
  topicTag,
  replyRetryDelaysMs = [5000, 15000],
  containerPollIntervalMs = 2000,
}: PublishThreadOptions): Promise<string[]> {
  for (const [i, chunk] of chunks.entries()) {
    const length = getThreadsTextLength(chunk);
    if (length > THREADS_MAX_TEXT_LENGTH) {
      throw new ThreadsPublishError(
        `Teil ${i + 1} ist zu lang (${length}/${THREADS_MAX_TEXT_LENGTH} Zeichen).`,
        [],
      );
    }
  }

  const publishedIds: string[] = [];

  for (const [index, text] of chunks.entries()) {
    const part = `Teil ${index + 1}/${chunks.length}`;
    const replyToId = publishedIds[publishedIds.length - 1];
    const isReply = !!replyToId;

    // 1. Container erstellen (Antworten werden bei Fehlern wiederholt,
    //    da der Eltern-Post kurz nach dem Veröffentlichen evtl. noch nicht verfügbar ist)
    const retryDelays = isReply ? replyRetryDelaysMs : [];
    let container = await createTextContainer(userId, accessToken, {
      text,
      replyToId,
      topicTag: isReply ? undefined : topicTag,
    });
    for (const delay of retryDelays) {
      if (!container.error) break;
      console.warn(
        `Threads: Antwort-Container für ${part} fehlgeschlagen, neuer Versuch in ${delay} ms.`,
        container.error,
      );
      await sleep(delay);
      container = await createTextContainer(userId, accessToken, {
        text,
        replyToId,
      });
    }

    if (container.error || !container.id) {
      throw new ThreadsPublishError(
        `Threads Container Fehler (${part}${isReply ? `, Antwort auf ${replyToId}` : ""}): ${JSON.stringify(container.error ?? container)}`,
        publishedIds,
        container.error,
      );
    }

    // 2. Auf Verarbeitung warten
    try {
      await waitForContainer(container.id, accessToken, {
        intervalMs: containerPollIntervalMs,
      });
    } catch (e) {
      throw new ThreadsPublishError(
        `Threads Container nicht bereit (${part}): ${(e as Error).message}`,
        publishedIds,
      );
    }

    // 3. Veröffentlichen
    const published = await threadsRequest<{ id?: string }>(
      "POST",
      `${userId}/threads_publish`,
      { creation_id: container.id },
      accessToken,
    );

    if (published.error || !published.id) {
      throw new ThreadsPublishError(
        `Threads Publish Fehler (${part}): ${JSON.stringify(published.error ?? published)}`,
        publishedIds,
        published.error,
      );
    }

    publishedIds.push(published.id);
  }

  return publishedIds;
}
