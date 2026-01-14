/**
 * Embedding-Generierung mit Google Gemini
 * Verwendet text-embedding-004 für 768-dimensionale Vektoren
 */

import { GoogleGenAI } from "@google/genai";

const googleApiKey = process.env.GOOGLE_GENAI_API_KEY;
const ai = googleApiKey ? new GoogleGenAI({ apiKey: googleApiKey }) : null;

const EMBEDDING_MODEL = "text-embedding-004";

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  model: string;
}

/**
 * Generiert ein Embedding für einen Text
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  if (!ai) {
    console.error("❌ Google AI nicht initialisiert - API Key fehlt");
    return null;
  }

  try {
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    if (
      !result.embeddings ||
      result.embeddings.length === 0 ||
      !result.embeddings[0].values
    ) {
      console.error("❌ Kein Embedding in der Antwort");
      return null;
    }

    return result.embeddings[0].values;
  } catch (error) {
    console.error("❌ Fehler bei Embedding-Generierung:", error);
    return null;
  }
}

/**
 * Generiert Embeddings für mehrere Texte (Batch-Processing)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    if (embedding) {
      results.push({
        embedding,
        text,
        model: EMBEDDING_MODEL,
      });
    }
    // Kleine Pause um Rate Limits zu vermeiden
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Konvertiert ein Embedding-Array in das PostgreSQL-Format
 */
export function embeddingToPostgresArray(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
