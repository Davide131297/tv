/**
 * Vektor-Suche in verschiedenen Datenquellen
 * Ersetzt die SQL-Generierung komplett
 */

import { supabase } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

// Typen für die verschiedenen Suchergebnisse
export interface PartyStats {
  party_name: string;
  total_appearances: number;
  unique_politicians: number;
  shows_appeared_on: number;
  description: string;
  similarity: number;
}

export interface PoliticianStats {
  politician_name: string;
  party_name: string;
  total_appearances: number;
  shows_appeared_on: number;
  description: string;
  similarity: number;
}

export interface Appearance {
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string;
  tv_channel: string;
  similarity: number;
}

export interface SearchResults {
  parties: PartyStats[];
  politicians: PoliticianStats[];
  appearances: Appearance[];
  totalResults: number;
}

/**
 * Sucht in Partei-Statistiken
 */
async function searchPartyStats(
  embedding: number[],
  threshold: number = 0.6,
  limit: number = 10
): Promise<PartyStats[]> {
  try {
    const { data, error } = await supabase.rpc("search_party_stats", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error("❌ Fehler bei Partei-Suche:", error);
      return [];
    }

    return (data || []) as PartyStats[];
  } catch (error) {
    console.error("❌ Exception bei Partei-Suche:", error);
    return [];
  }
}

/**
 * Sucht in Politiker-Statistiken
 */
async function searchPoliticianStats(
  embedding: number[],
  threshold: number = 0.6,
  limit: number = 10
): Promise<PoliticianStats[]> {
  try {
    const { data, error } = await supabase.rpc("search_politician_stats", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error("❌ Fehler bei Politiker-Suche:", error);
      return [];
    }

    return (data || []) as PoliticianStats[];
  } catch (error) {
    console.error("❌ Exception bei Politiker-Suche:", error);
    return [];
  }
}

/**
 * Sucht in einzelnen Auftritten
 */
async function searchAppearances(
  embedding: number[],
  threshold: number = 0.6,
  limit: number = 20
): Promise<Appearance[]> {
  try {
    const { data, error } = await supabase.rpc("search_appearances", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error("❌ Fehler bei Auftritte-Suche:", error);
      return [];
    }

    return (data || []) as Appearance[];
  } catch (error) {
    console.error("❌ Exception bei Auftritte-Suche:", error);
    return [];
  }
}

/**
 * Holt Top-Politiker für ein bestimmtes Jahr (ohne Vektor-Suche)
 * Wird verwendet wenn nach spezifischen Rankings gefragt wird
 */
async function getTopPoliticiansByYear(
  year: number,
  limit: number = 10
): Promise<PoliticianStats[]> {
  try {
    const { data, error } = await supabase.rpc("get_top_politicians_by_year", {
      target_year: year,
      result_limit: limit,
    });

    if (error) {
      console.error("❌ Fehler bei Jahr-spezifischer Politiker-Suche:", error);
      return [];
    }

    return (data || []) as PoliticianStats[];
  } catch (error) {
    console.error("❌ Exception bei Jahr-spezifischer Politiker-Suche:", error);
    return [];
  }
}

/**
 * Holt Top-Parteien für ein bestimmtes Jahr (ohne Vektor-Suche)
 */
async function getTopPartiesByYear(
  year: number,
  limit: number = 10
): Promise<PartyStats[]> {
  try {
    const { data, error } = await supabase.rpc("get_top_parties_by_year", {
      target_year: year,
      result_limit: limit,
    });

    if (error) {
      console.error("❌ Fehler bei Jahr-spezifischer Partei-Suche:", error);
      return [];
    }

    return (data || []) as PartyStats[];
  } catch (error) {
    console.error("❌ Exception bei Jahr-spezifischer Partei-Suche:", error);
    return [];
  }
}

/**
 * Hauptfunktion: Sucht in allen Datenquellen parallel
 */
export async function searchAllSources(
  userQuestion: string,
  threshold: number = 0.3 // Gesenkt von 0.6 auf 0.3 für bessere Ergebnisse
): Promise<SearchResults> {
  // 1. Embedding für die Frage generieren
  const embedding = await generateEmbedding(userQuestion);

  if (!embedding) {
    console.error("❌ Konnte kein Embedding generieren");
    return {
      parties: [],
      politicians: [],
      appearances: [],
      totalResults: 0,
    };
  }

  console.log("🔍 Starte Vektor-Suche in allen Quellen...");
  console.log(`📊 Embedding-Dimensionen: ${embedding.length}`);
  console.log(`🎯 Similarity Threshold: ${threshold}`);

  // Prüfe ob nach Jahr-spezifischen Rankings gefragt wird
  const questionLower = userQuestion.toLowerCase();
  const yearMatch = userQuestion.match(/202[456]/);
  const isRankingQuestion =
    questionLower.includes("top") ||
    questionLower.includes("meisten") ||
    questionLower.includes("häufigsten") ||
    questionLower.includes("ranking");
  const isPartyQuestion = questionLower.includes("partei");

  let politicians: PoliticianStats[] = [];
  let parties: PartyStats[] = [];

  if (yearMatch && isRankingQuestion) {
    const year = parseInt(yearMatch[0]);
    console.log(`📅 Jahr-spezifische Ranking-Anfrage erkannt: ${year}`);
    console.log(`❓ Frage: "${userQuestion}"`);

    if (isPartyQuestion) {
      // Partei-Ranking für spezifisches Jahr
      parties = await getTopPartiesByYear(year, 10);
      console.log(`✅ ${parties.length} Parteien für Jahr ${year} gefunden`);
      // Keine Politiker-Suche bei Partei-Fragen
      politicians = [];
    } else {
      // Politiker-Ranking für spezifisches Jahr
      politicians = await getTopPoliticiansByYear(year, 10);
      console.log(
        `✅ ${politicians.length} Politiker für Jahr ${year} gefunden`
      );
      // Auch Parteien für Kontext
      parties = await getTopPartiesByYear(year, 5);
    }
  } else {
    // Normale Vektor-Suche
    console.log("🔍 Verwende Vektor-Suche für Politiker und Parteien");
    [parties, politicians] = await Promise.all([
      searchPartyStats(embedding, threshold, 5),
      searchPoliticianStats(embedding, threshold, 10),
    ]);
  }

  // Auftritte immer über Vektor-Suche
  const appearances = await searchAppearances(embedding, threshold, 15);

  const totalResults = parties.length + politicians.length + appearances.length;

  console.log(
    `✅ Gefunden: ${parties.length} Parteien, ${politicians.length} Politiker, ${appearances.length} Auftritte`
  );

  return {
    parties,
    politicians,
    appearances,
    totalResults,
  };
}

/**
 * Formatiert die Suchergebnisse für den LLM-Kontext
 */
export function formatSearchResultsForLLM(
  results: SearchResults,
  skipAppearances: boolean = false
): string {
  if (results.totalResults === 0) {
    return "\n\nKeine relevanten Daten gefunden.\n";
  }

  let context = "\n\n=== GEFUNDENE DATEN AUS DER DATENBANK ===\n\n";

  // Partei-Statistiken
  if (results.parties.length > 0) {
    context += "📊 PARTEI-STATISTIKEN:\n";
    results.parties.forEach((party, idx) => {
      context += `${idx + 1}. ${party.party_name}:\n`;
      context += `   - Gesamt-Auftritte: ${party.total_appearances}\n`;
      context += `   - Verschiedene Politiker: ${party.unique_politicians}\n`;
      context += `   - Sendungen: ${party.shows_appeared_on}\n\n`;
    });
  }

  // Politiker-Statistiken
  if (results.politicians.length > 0) {
    context += "👤 POLITIKER-STATISTIKEN (SORTIERT NACH AUFTRITTEN):\n";
    results.politicians.forEach((pol, idx) => {
      context += `${idx + 1}. ${pol.politician_name} (${pol.party_name}): ${
        pol.total_appearances
      } Auftritte in ${pol.shows_appeared_on} Sendungen\n`;
    });
    context += "\n";
  }

  // Einzelne Auftritte - NUR wenn nicht skipAppearances
  if (!skipAppearances && results.appearances.length > 0) {
    context += "📺 EINZELNE AUFTRITTE (BEISPIELE):\n";
    results.appearances.slice(0, 10).forEach((app, idx) => {
      context += `${idx + 1}. ${app.politician_name} (${app.party_name}) bei "${
        app.show_name
      }" am ${app.episode_date}\n`;
    });
    if (results.appearances.length > 10) {
      context += `   ... und ${
        results.appearances.length - 10
      } weitere Auftritte\n\n`;
    }
  }

  context += "=== ENDE DER DATEN ===\n\n";
  context +=
    "WICHTIG: Beantworte die Frage NUR basierend auf den POLITIKER-STATISTIKEN oben. ";
  context +=
    "Die Zahlen dort sind die korrekten Gesamt-Auftritte. Ignoriere die einzelnen Auftritte.\n";

  return context;
}
