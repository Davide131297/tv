import db from "./db.js";
// Erstelle die Tabelle falls sie nicht existiert
export function initTvShowPoliticiansTable() {
    console.log("Initialisiere Tabelle 'tv_show_politicians' (falls nicht vorhanden)...");
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
    }
    catch (e) {
        // Spalte existiert bereits
    }
    try {
        db.exec("ALTER TABLE tv_show_politicians ADD COLUMN party_id INTEGER");
        console.log("✅ Spalte 'party_id' hinzugefügt");
    }
    catch (e) {
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
// Füge einen Politiker zu einer TV-Sendung hinzu
export function insertTvShowPolitician(data) {
    const stmt = db.prepare(`
    INSERT OR IGNORE INTO tv_show_politicians 
    (show_name, episode_date, politician_id, politician_name, party_id, party_name, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
    try {
        const result = stmt.run(data.show_name, data.episode_date, data.politician_id, data.politician_name, data.party_id || null, data.party_name || null);
        return result.changes > 0;
    }
    catch (error) {
        console.error("Fehler beim Einfügen:", error);
        return false;
    }
}
// Füge mehrere Politiker zu einer Sendung hinzu
export function insertMultipleTvShowPoliticians(showName, episodeDate, politicians) {
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
export function getLatestEpisodeDate(showName) {
    const stmt = db.prepare(`
    SELECT episode_date
    FROM tv_show_politicians 
    WHERE show_name = ?
    ORDER BY episode_date DESC
    LIMIT 1
  `);
    const result = stmt.get(showName);
    if (!result) {
        return null;
    }
    // Episoden werden bereits im yyyy-mm-dd Format gespeichert
    return result.episode_date;
}
// Hole alle Politiker für eine bestimmte Sendung/Datum
export function getTvShowPoliticiansByDate(showName, episodeDate) {
    const stmt = db.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE show_name = ? AND episode_date = ?
    ORDER BY politician_id
  `);
    return stmt.all(showName, episodeDate);
}
// Hole alle Sendungen für einen bestimmten Politiker
export function getShowsByPolitician(politicianId) {
    const stmt = db.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE politician_id = ?
    ORDER BY episode_date DESC
  `);
    return stmt.all(politicianId);
}
// Statistiken: Anzahl Auftritte pro Partei (ohne externe API-Calls benötigt!)
export function getPoliticianStatsByParty() {
    const stmt = db.prepare(`
    SELECT party_id, party_name, COUNT(*) as count
    FROM tv_show_politicians 
    WHERE party_id IS NOT NULL AND party_name IS NOT NULL
    GROUP BY party_id, party_name
    ORDER BY count DESC
  `);
    return stmt.all();
}
// Statistiken: Anzahl Auftritte pro Sendung
export function getPoliticianStatsByShow() {
    const stmt = db.prepare(`
    SELECT show_name, COUNT(*) as count
    FROM tv_show_politicians 
    GROUP BY show_name
    ORDER BY count DESC
  `);
    return stmt.all();
}
// Prüfe ob Tabelle existiert
export function checkTvShowPoliticiansTableExists() {
    const result = db
        .prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='tv_show_politicians'
  `)
        .get();
    return !!result;
}
// Leere die komplette Tabelle für Neucrawl
export function clearAllTvShowData() {
    console.log("🗑️ Lösche alle TV-Show-Daten...");
    const stmt = db.prepare("DELETE FROM tv_show_politicians");
    const result = stmt.run();
    console.log(`✅ ${result.changes} Einträge gelöscht`);
}
// Lösche nur Markus Lanz-Einträge
export function clearLanzData() {
    console.log("🗑️ Lösche Markus Lanz Daten...");
    const stmt = db.prepare("DELETE FROM tv_show_politicians WHERE show_name = ?");
    const result = stmt.run("Markus Lanz");
    console.log(`✅ ${result.changes} Lanz-Einträge gelöscht`);
}
// Lösche nur Maybrit Illner-Einträge
export function clearIllnerData() {
    console.log("🗑️ Lösche Maybrit Illner Daten...");
    const stmt = db.prepare("DELETE FROM tv_show_politicians WHERE show_name = ?");
    const result = stmt.run("Maybrit Illner");
    console.log(`✅ ${result.changes} Illner-Einträge gelöscht`);
}
