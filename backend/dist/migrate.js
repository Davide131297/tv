"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTableExists = exports.createTvShowPoliticiansTable = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
// Database path - zeige auf die database.sqlite im database/ Verzeichnis
const dbPath = path_1.default.resolve(__dirname, "../../database/database.sqlite");
const db = new better_sqlite3_1.default(dbPath);
// Erstelle Tabelle für TV-Sendungen mit politischen Gästen
function createTvShowPoliticiansTable() {
    console.log("Erstelle Tabelle 'tv_show_politicians'...");
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS tv_show_politicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_name TEXT NOT NULL,
      episode_date DATE NOT NULL,
      politician_id TEXT NOT NULL,
      party_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- UNIQUE constraint: Ein Politiker kann nur einmal pro Sendung/Datum erscheinen
      UNIQUE(show_name, episode_date, politician_id)
    )
  `;
    db.exec(createTableSQL);
    // Index für bessere Performance bei Abfragen
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
    console.log("Tabelle 'tv_show_politicians' erfolgreich erstellt!");
}
exports.createTvShowPoliticiansTable = createTvShowPoliticiansTable;
// Funktion zum Prüfen ob die Tabelle existiert
function checkTableExists() {
    const result = db
        .prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='tv_show_politicians'
  `)
        .get();
    return !!result;
}
exports.checkTableExists = checkTableExists;
// Migration ausführen
function runMigration() {
    console.log("=== TV Sendungen Datenbank Migration ===");
    if (checkTableExists()) {
        console.log("Tabelle 'tv_show_politicians' existiert bereits.");
    }
    else {
        createTvShowPoliticiansTable();
    }
    // Zeige Tabellen-Info
    const tableInfo = db.prepare("PRAGMA table_info(tv_show_politicians)").all();
    console.log("Tabellen-Schema:");
    console.table(tableInfo);
    db.close();
    console.log("Migration abgeschlossen.");
}
// Führe Migration aus wenn direkt aufgerufen
if (require.main === module) {
    runMigration();
}
