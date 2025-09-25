"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTvShowPoliticiansTableExists = exports.getPoliticianStatsByShow = exports.getPoliticianStatsByParty = exports.getShowsByPolitician = exports.getTvShowPoliticiansByDate = exports.getLatestEpisodeDate = exports.insertMultipleTvShowPoliticians = exports.insertTvShowPolitician = exports.initTvShowPoliticiansTable = void 0;
const db_1 = __importDefault(require("./db"));
// Erstelle die Tabelle falls sie nicht existiert
function initTvShowPoliticiansTable() {
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
    db_1.default.exec(createTableSQL);
    // Indices für bessere Performance
    db_1.default.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_show_date 
    ON tv_show_politicians(show_name, episode_date)
  `);
    db_1.default.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_politician 
    ON tv_show_politicians(politician_id)
  `);
    db_1.default.exec(`
    CREATE INDEX IF NOT EXISTS idx_tv_show_politicians_party 
    ON tv_show_politicians(party_id)
  `);
    console.log("Tabelle 'tv_show_politicians' erfolgreich initialisiert!");
}
exports.initTvShowPoliticiansTable = initTvShowPoliticiansTable;
// Füge einen Politiker zu einer TV-Sendung hinzu
function insertTvShowPolitician(data) {
    const stmt = db_1.default.prepare(`
    INSERT OR IGNORE INTO tv_show_politicians 
    (show_name, episode_date, politician_id, party_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
    try {
        const result = stmt.run(data.show_name, data.episode_date, data.politician_id, data.party_id || null);
        return result.changes > 0;
    }
    catch (error) {
        console.error("Fehler beim Einfügen:", error);
        return false;
    }
}
exports.insertTvShowPolitician = insertTvShowPolitician;
// Füge mehrere Politiker zu einer Sendung hinzu
function insertMultipleTvShowPoliticians(showName, episodeDate, politicians) {
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
exports.insertMultipleTvShowPoliticians = insertMultipleTvShowPoliticians;
// Hole das Datum der neuesten Episode für eine bestimmte Sendung
function getLatestEpisodeDate(showName) {
    const stmt = db_1.default.prepare(`
    SELECT MAX(episode_date) as latest_date 
    FROM tv_show_politicians 
    WHERE show_name = ?
  `);
    const result = stmt.get(showName);
    return (result === null || result === void 0 ? void 0 : result.latest_date) || null;
}
exports.getLatestEpisodeDate = getLatestEpisodeDate;
// Hole alle Politiker für eine bestimmte Sendung/Datum
function getTvShowPoliticiansByDate(showName, episodeDate) {
    const stmt = db_1.default.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE show_name = ? AND episode_date = ?
    ORDER BY politician_id
  `);
    return stmt.all(showName, episodeDate);
}
exports.getTvShowPoliticiansByDate = getTvShowPoliticiansByDate;
// Hole alle Sendungen für einen bestimmten Politiker
function getShowsByPolitician(politicianId) {
    const stmt = db_1.default.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE politician_id = ?
    ORDER BY episode_date DESC
  `);
    return stmt.all(politicianId);
}
exports.getShowsByPolitician = getShowsByPolitician;
// Statistiken: Anzahl Auftritte pro Partei
function getPoliticianStatsByParty() {
    const stmt = db_1.default.prepare(`
    SELECT party_id, COUNT(*) as count
    FROM tv_show_politicians 
    WHERE party_id IS NOT NULL
    GROUP BY party_id
    ORDER BY count DESC
  `);
    return stmt.all();
}
exports.getPoliticianStatsByParty = getPoliticianStatsByParty;
// Statistiken: Anzahl Auftritte pro Sendung
function getPoliticianStatsByShow() {
    const stmt = db_1.default.prepare(`
    SELECT show_name, COUNT(*) as count
    FROM tv_show_politicians 
    GROUP BY show_name
    ORDER BY count DESC
  `);
    return stmt.all();
}
exports.getPoliticianStatsByShow = getPoliticianStatsByShow;
// Prüfe ob Tabelle existiert
function checkTvShowPoliticiansTableExists() {
    const result = db_1.default
        .prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='tv_show_politicians'
  `)
        .get();
    return !!result;
}
exports.checkTvShowPoliticiansTableExists = checkTvShowPoliticiansTableExists;
