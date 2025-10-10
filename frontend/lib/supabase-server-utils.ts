import { supabase } from "./supabase";

type GuestDetails = {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string;
  party?: number;
  partyName?: string;
};

interface InsertTvShowPoliticianData {
  show_name: string;
  episode_date: string;
  politician_id: number;
  politician_name: string;
  party_id?: number;
  party_name?: string;
}

interface InsertShowLinkData {
  show_name: string;
  episode_url: string;
  episode_date: string;
}

// Spezielle Override-Cases für bestimmte Politiker
export const POLITICIAN_OVERRIDES: Record<string, GuestDetails> = {
  "Manfred Weber": {
    name: "Manfred Weber",
    isPolitician: true,
    politicianId: 28910,
    politicianName: "Manfred Weber",
    party: 3, // CSU
    partyName: "CSU",
  },
  "Michael Kretschmer": {
    name: "Michael Kretschmer",
    isPolitician: true,
    politicianId: 79225,
    politicianName: "Michael Kretschmer",
    party: 2, // CDU
    partyName: "CDU",
  },
  "Philipp Türmer": {
    name: "Philipp Türmer",
    isPolitician: true,
    politicianId: 999001, // Custom ID for politician not in Abgeordnetenwatch
    politicianName: "Philipp Türmer",
    party: 1, // SPD
    partyName: "SPD",
  },
  "Jan van": {
    name: "Jan van Aken",
    isPolitician: true,
    politicianId: 78952,
    politicianName: "Jan van Aken",
    party: 8, // Die Linke
    partyName: "Die Linke",
  },
  "Wolfram Weimer": {
    name: "Wolfram Weimer",
    isPolitician: true,
    politicianId: 9998,
    politicianName: "Wolfram Weimer",
    party: 2,
    partyName: "CDU",
  },
};

// Füge einen Politiker zu einer TV-Sendung hinzu (Supabase Version)
export async function insertTvShowPolitician(
  data: InsertTvShowPoliticianData
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tv_show_politicians").upsert(
      {
        show_name: data.show_name,
        episode_date: data.episode_date,
        politician_id: data.politician_id,
        politician_name: data.politician_name,
        party_id: data.party_id || null,
        party_name: data.party_name || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Fehler beim Einfügen:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen:", error);
    return false;
  }
}

// Hilfsfunktion um Override-Prüfung zu zentralisieren
export function checkPoliticianOverride(name: string): GuestDetails | null {
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}

// Diese Funktion ist für Supabase nicht notwendig, da die Tabelle bereits existiert
// Wird für Kompatibilität beibehalten aber macht nichts
export function initTvShowPoliticiansTable() {
  console.log(
    "Supabase: Tabelle wird remote verwaltet - keine lokale Initialisierung nötig"
  );
}

// Füge mehrere Politiker zu einer Sendung hinzu (Supabase Version)
export async function insertMultipleTvShowPoliticians(
  showName: string,
  episodeDate: string,
  politicians: Array<{
    politicianId: number;
    politicianName: string;
    partyId?: number;
    partyName?: string;
  }>
): Promise<number> {
  let insertedCount = 0;

  // Batch insert für bessere Performance
  const dataToInsert = politicians.map((politician) => ({
    show_name: showName,
    episode_date: episodeDate,
    politician_id: politician.politicianId,
    politician_name: politician.politicianName,
    party_id: politician.partyId || null,
    party_name: politician.partyName || null,
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error } = await supabase
      .from("tv_show_politicians")
      .upsert(dataToInsert, {
        onConflict: "show_name,episode_date,politician_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Fehler beim Batch-Insert:", error);
      return 0;
    }

    insertedCount = politicians.length;
  } catch (error) {
    console.error("Fehler beim Batch-Insert:", error);

    // Fallback: Einzeln einfügen
    for (const politician of politicians) {
      const success = await insertTvShowPolitician({
        show_name: showName,
        episode_date: episodeDate,
        politician_id: politician.politicianId,
        politician_name: politician.politicianName,
        party_id: politician.partyId,
        party_name: politician.partyName,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  return insertedCount;
}

// Hole das Datum der neuesten Episode für eine bestimmte Sendung (Supabase Version)
export async function getLatestEpisodeDate(
  showName: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("tv_show_politicians")
      .select("episode_date")
      .eq("show_name", showName)
      .order("episode_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.episode_date;
  } catch (error) {
    console.error("Fehler beim Abrufen des neuesten Datums:", error);
    return null;
  }
}

// Füge Episode-URL zur show_links Tabelle hinzu (Supabase Version)
export async function insertShowLink(
  data: InsertShowLinkData
): Promise<boolean> {
  try {
    // Prüfe ob der Eintrag bereits existiert
    const { data: existing } = await supabase
      .from("show_links")
      .select("id")
      .eq("show_name", data.show_name)
      .eq("episode_date", data.episode_date)
      .single();

    // Falls bereits vorhanden, überspringe
    if (existing) {
      return true;
    }

    const { error } = await supabase.from("show_links").insert({
      show_name: data.show_name,
      episode_url: data.episode_url,
      episode_date: data.episode_date,
    });

    if (error) {
      console.error("Fehler beim Einfügen der Episode-URL:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Fehler beim Einfügen der Episode-URL:", error);
    return false;
  }
}

// Füge mehrere Episode-URLs zur show_links Tabelle hinzu (Batch Insert)
export async function insertMultipleShowLinks(
  showName: string,
  episodes: Array<{
    episodeUrl: string;
    episodeDate: string;
  }>
): Promise<number> {
  if (episodes.length === 0) return 0;

  let insertedCount = 0;

  // Prüfe welche Episoden bereits existieren
  const existingEpisodes = new Set<string>();

  try {
    const { data: existing } = await supabase
      .from("show_links")
      .select("episode_date")
      .eq("show_name", showName)
      .in(
        "episode_date",
        episodes.map((e) => e.episodeDate)
      );

    if (existing) {
      existing.forEach((row) => existingEpisodes.add(row.episode_date));
    }
  } catch (error) {
    console.error("Fehler beim Prüfen bestehender Episode-URLs:", error);
  }

  // Filtere neue Episoden heraus
  const newEpisodes = episodes.filter(
    (episode) => !existingEpisodes.has(episode.episodeDate)
  );

  if (newEpisodes.length === 0) {
    console.log("Alle Episode-URLs bereits vorhanden");
    return episodes.length; // Zähle als "eingefügt" da bereits vorhanden
  }

  // Batch insert für neue Episoden
  const dataToInsert = newEpisodes.map((episode) => ({
    show_name: showName,
    episode_url: episode.episodeUrl,
    episode_date: episode.episodeDate,
  }));

  try {
    const { error } = await supabase.from("show_links").insert(dataToInsert);

    if (error) {
      console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

      // Fallback: Einzeln einfügen
      for (const episode of newEpisodes) {
        const success = await insertShowLink({
          show_name: showName,
          episode_url: episode.episodeUrl,
          episode_date: episode.episodeDate,
        });

        if (success) {
          insertedCount++;
        }
      }
    } else {
      insertedCount = newEpisodes.length;
    }
  } catch (error) {
    console.error("Fehler beim Batch-Insert der Episode-URLs:", error);

    // Fallback: Einzeln einfügen
    for (const episode of newEpisodes) {
      const success = await insertShowLink({
        show_name: showName,
        episode_url: episode.episodeUrl,
        episode_date: episode.episodeDate,
      });

      if (success) {
        insertedCount++;
      }
    }
  }

  // Zähle bereits existierende als "eingefügt"
  return insertedCount + existingEpisodes.size;
}
