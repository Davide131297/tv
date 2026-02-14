import db from "./db";

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
  "Kevin Kühnert": {
    name: "Kevin Kühnert",
    isPolitician: false,
    politicianId: null,
  },
};

// Füge einen Politiker zu einer TV-Sendung hinzu
export function insertTvShowPolitician(
  data: InsertTvShowPoliticianData,
): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tv_show_politicians 
    (show_name, episode_date, politician_id, politician_name, party_id, party_name, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  try {
    const result = stmt.run(
      data.show_name,
      data.episode_date,
      data.politician_id,
      data.politician_name,
      data.party_id || null,
      data.party_name || null,
    );

    return result.changes > 0;
  } catch (error) {
    console.error("Fehler beim Einfügen:", error);
    return false;
  }
}

// Hilfsfunktion um Override-Prüfung zu zentralisieren
export function checkPoliticianOverride(name: string): GuestDetails | null {
  if (POLITICIAN_OVERRIDES[name]) {
    console.log(
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`,
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}

// Füge mehrere Politiker zu einer Sendung hinzu
export function insertMultipleTvShowPoliticians(
  showName: string,
  episodeDate: string,
  politicians: Array<{
    politicianId: number;
    politicianName: string;
    partyId?: number;
    partyName?: string;
  }>,
): number {
  let insertedCount = 0;

  for (const politician of politicians) {
    const success = insertTvShowPolitician({
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

  return insertedCount;
}

// Hole das Datum der neuesten Episode für eine bestimmte Sendung
export function getLatestEpisodeDate(showName: string): string | null {
  const stmt = db.prepare(`
    SELECT episode_date
    FROM tv_show_politicians 
    WHERE show_name = ?
    ORDER BY episode_date DESC
    LIMIT 1
  `);

  const result = stmt.get(showName) as { episode_date: string } | undefined;

  if (!result) {
    return null;
  }

  // Episoden werden bereits im yyyy-mm-dd Format gespeichert
  return result.episode_date;
}
