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
    politicianId: null, // Beispiel-ID, anpassen wenn bekannt
    politicianName: "Philipp Türmer",
    party: 1, // SPD
    partyName: "SPD",
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
