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
};

// Füge einen Politiker zu einer TV-Sendung hinzu
export function insertTvShowPolitician(
  data: InsertTvShowPoliticianData
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
      data.party_name || null
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
      `✅ Override angewendet für ${name} -> ${POLITICIAN_OVERRIDES[name].partyName}`
    );
    return POLITICIAN_OVERRIDES[name];
  }
  return null;
}

// Erstelle die Tabelle falls sie nicht existiert
export function initTvShowPoliticiansTable() {
  console.log(
    "Initialisiere Tabelle 'tv_show_politicians' (falls nicht vorhanden)..."
  );

  // Erstelle Tabelle nur falls sie nicht existiert (KEINE Löschung!)
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tv_show_politicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_name TEXT NOT NULL,
      episode_date DATE NOT NULL,
      politician_id INTEGER NOT NULL,
      politician_name TEXT NOT NULL,
      party_id INTEGER,
      party_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- UNIQUE constraint: Ein Politiker kann nur einmal pro Sendung/Datum erscheinen
      UNIQUE(show_name, episode_date, politician_id)
    )
  `;

  db.exec(createTableSQL);

  // Migration: Füge fehlende Spalten hinzu falls sie nicht existieren
  try {
    db.exec("ALTER TABLE tv_show_politicians ADD COLUMN politician_id INTEGER");
    console.log("✅ Spalte 'politician_id' hinzugefügt");
  } catch {
    // Spalte existiert bereits
  }

  try {
    db.exec("ALTER TABLE tv_show_politicians ADD COLUMN party_id INTEGER");
    console.log("✅ Spalte 'party_id' hinzugefügt");
  } catch {
    // Spalte existiert bereits
  }

  // Indices für bessere Performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_show_date 
    ON tv_show_politicians(show_name, episode_date)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_politician 
    ON tv_show_politicians(politician_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_party 
    ON tv_show_politicians(party_id)
  `);

  console.log("Tabelle 'tv_show_politicians' erfolgreich initialisiert!");
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
  }>
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
