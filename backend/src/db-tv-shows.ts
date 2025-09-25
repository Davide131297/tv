import db from "./db";

// Types für die TV-Show-Politiker Tabelle
interface TvShowPolitician {
  id?: number;
  show_name: string;
  episode_date: string; // YYYY-MM-DD Format
  politician_id: number;
  party_id?: number;
}

interface InsertTvShowPoliticianData {
  show_name: string;
  episode_date: string;
  politician_id: number;
  party_id?: number;
}

// Erstelle die Tabelle falls sie nicht existiert
export function initTvShowPoliticiansTable() {
  console.log("Initialisiere Tabelle 'tv_show_politicians'...");

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tv_show_politicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_name TEXT NOT NULL,
      episode_date DATE NOT NULL,
      politician_id INTEGER NOT NULL,
      party_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- UNIQUE constraint: Ein Politiker kann nur einmal pro Sendung/Datum erscheinen
      UNIQUE(show_name, episode_date, politician_id)
    )
  `;

  db.exec(createTableSQL);

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

// Füge einen Politiker zu einer TV-Sendung hinzu
export function insertTvShowPolitician(
  data: InsertTvShowPoliticianData
): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO tv_show_politicians 
    (show_name, episode_date, politician_id, party_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  try {
    const result = stmt.run(
      data.show_name,
      data.episode_date,
      data.politician_id,
      data.party_id || null
    );

    return result.changes > 0;
  } catch (error) {
    console.error("Fehler beim Einfügen:", error);
    return false;
  }
}

// Füge mehrere Politiker zu einer Sendung hinzu
export function insertMultipleTvShowPoliticians(
  showName: string,
  episodeDate: string,
  politicians: Array<{ politicianId: number; partyId?: number }>
): number {
  let insertedCount = 0;

  for (const politician of politicians) {
    const success = insertTvShowPolitician({
      show_name: showName,
      episode_date: episodeDate,
      politician_id: politician.politicianId,
      party_id: politician.partyId,
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
    SELECT MAX(episode_date) as latest_date 
    FROM tv_show_politicians 
    WHERE show_name = ?
  `);

  const result = stmt.get(showName) as
    | { latest_date: string | null }
    | undefined;
  return result?.latest_date || null;
}

// Hole alle Politiker für eine bestimmte Sendung/Datum
export function getTvShowPoliticiansByDate(
  showName: string,
  episodeDate: string
): TvShowPolitician[] {
  const stmt = db.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE show_name = ? AND episode_date = ?
    ORDER BY politician_id
  `);

  return stmt.all(showName, episodeDate) as TvShowPolitician[];
}

// Hole alle Sendungen für einen bestimmten Politiker
export function getShowsByPolitician(politicianId: number): TvShowPolitician[] {
  const stmt = db.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE politician_id = ?
    ORDER BY episode_date DESC
  `);

  return stmt.all(politicianId) as TvShowPolitician[];
}

// Statistiken: Anzahl Auftritte pro Partei
export function getPoliticianStatsByParty(): Array<{
  party_id: number;
  count: number;
}> {
  const stmt = db.prepare(`
    SELECT party_id, COUNT(*) as count
    FROM tv_show_politicians 
    WHERE party_id IS NOT NULL
    GROUP BY party_id
    ORDER BY count DESC
  `);

  return stmt.all() as Array<{ party_id: number; count: number }>;
}

// Statistiken: Anzahl Auftritte pro Sendung
export function getPoliticianStatsByShow(): Array<{
  show_name: string;
  count: number;
}> {
  const stmt = db.prepare(`
    SELECT show_name, COUNT(*) as count
    FROM tv_show_politicians 
    GROUP BY show_name
    ORDER BY count DESC
  `);

  return stmt.all() as Array<{ show_name: string; count: number }>;
}

// Prüfe ob Tabelle existiert
export function checkTvShowPoliticiansTableExists(): boolean {
  const result = db
    .prepare(
      `
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='tv_show_politicians'
  `
    )
    .get();

  return !!result;
}
