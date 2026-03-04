import { supabase } from "./supabase";

export interface FactCheckSource {
  url: string;
  title: string;
}

export interface FactCheckEntry {
  speaker: string;
  statement: string;
  verdict: string;
  explanation: string;
  sources?: FactCheckSource[];
  // Legacy fields (old format)
  aussage?: string;
  bewertung?:
    | "zutreffend"
    | "teilweise zutreffend"
    | "unbelegt"
    | "eher falsch";
  begruendung?: string;
  wissensstand_hinweis?: string;
  quellen?: string[];
}

export interface CoreStatement {
  speaker: string;
  statement: string;
}

export interface Factcheck {
  id: number;
  show_name: string;
  episode_date: string;
  // New format: array of objects with speaker + statement
  // Old format: array of strings
  core_statements: CoreStatement[] | string[];
  fact_checks: FactCheckEntry[];
  raw_analysis?: string;
  created_at: string;
  episode_url?: string;
}

export async function getFactchecks(params: {
  show?: string;
  limit?: number;
}): Promise<Factcheck[]> {
  let query = supabase
    .from("episode_factchecks")
    .select(
      "id, show_name, episode_date, core_statements, fact_checks, created_at",
    )
    .order("episode_date", { ascending: false })
    .limit(params.limit ?? 50);

  if (params.show && params.show !== "all") {
    query = query.eq("show_name", params.show);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Fehler beim Laden der Faktchecks:", error);
    return [];
  }

  const factchecks = (data ?? []) as Factcheck[];

  if (factchecks.length === 0) {
    return factchecks;
  }

  // Hole Episoden-URLs aus der show_links Tabelle
  const shows = Array.from(new Set(factchecks.map((fc) => fc.show_name)));
  const dates = Array.from(new Set(factchecks.map((fc) => fc.episode_date)));

  const { data: linksData, error: linksError } = await supabase
    .from("show_links")
    .select("show_name, episode_date, episode_url")
    .in("show_name", shows)
    .in("episode_date", dates);

  if (!linksError && linksData) {
    const linkMap = new Map();
    linksData.forEach((link) => {
      linkMap.set(`${link.show_name}-${link.episode_date}`, link.episode_url);
    });

    factchecks.forEach((fc) => {
      const url = linkMap.get(`${fc.show_name}-${fc.episode_date}`);
      if (url) {
        fc.episode_url = url;
      }
    });
  }

  return factchecks;
}
