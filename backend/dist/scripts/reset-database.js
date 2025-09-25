#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTvShowPoliticiansTable = void 0;
const db_1 = __importDefault(require("../db"));
/**
 * Script zum Zurücksetzen der TV-Show-Politiker Tabelle
 * Löscht alle Daten und erstellt die Tabelle neu
 */
function resetTvShowPoliticiansTable() {
    console.log("🗑️  Starte Database Reset...");
    try {
        // Prüfe ob Tabelle existiert
        const tableExists = db_1.default
            .prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='tv_show_politicians'
      `)
            .get();
        if (tableExists) {
            console.log("📊 Aktuelle Tabellen-Statistiken:");
            // Zeige aktuelle Daten an
            const stats = db_1.default
                .prepare(`
          SELECT 
            COUNT(*) as total_entries,
            COUNT(DISTINCT show_name) as shows,
            COUNT(DISTINCT episode_date) as episodes,
            COUNT(DISTINCT politician_id) as unique_politicians,
            MIN(episode_date) as first_episode,
            MAX(episode_date) as last_episode
          FROM tv_show_politicians
        `)
                .get();
            console.log(`   📈 Einträge gesamt: ${stats.total_entries}`);
            console.log(`   📺 Shows: ${stats.shows}`);
            console.log(`   📅 Episoden: ${stats.episodes}`);
            console.log(`   👥 Eindeutige Politiker: ${stats.unique_politicians}`);
            console.log(`   🗓️  Zeitraum: ${stats.first_episode} bis ${stats.last_episode}`);
            // Lösche die Tabelle
            console.log("\n🗑️  Lösche Tabelle 'tv_show_politicians'...");
            db_1.default.exec("DROP TABLE IF EXISTS tv_show_politicians");
            console.log("✅ Tabelle gelöscht");
        }
        else {
            console.log("📋 Tabelle 'tv_show_politicians' existiert noch nicht");
        }
        // Erstelle die Tabelle neu
        console.log("\n🏗️  Erstelle neue Tabelle 'tv_show_politicians'...");
        const createTableSQL = `
      CREATE TABLE tv_show_politicians (
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
        // Erstelle Indices für bessere Performance
        console.log("🔍 Erstelle Indices...");
        db_1.default.exec(`
      CREATE INDEX idx_tv_show_politicians_show_date 
      ON tv_show_politicians(show_name, episode_date)
    `);
        db_1.default.exec(`
      CREATE INDEX idx_tv_show_politicians_politician 
      ON tv_show_politicians(politician_id)
    `);
        db_1.default.exec(`
      CREATE INDEX idx_tv_show_politicians_party 
      ON tv_show_politicians(party_id)
    `);
        console.log("✅ Tabelle und Indices erfolgreich erstellt!");
        // Bestätige leere Tabelle
        const newStats = db_1.default
            .prepare("SELECT COUNT(*) as count FROM tv_show_politicians")
            .get();
        console.log(`\n🎉 Database Reset abgeschlossen!`);
        console.log(`📊 Neue Tabelle hat ${newStats.count} Einträge (sollte 0 sein)`);
        console.log(`🚀 Bereit für vollständigen Crawl!`);
    }
    catch (error) {
        console.error("❌ Fehler beim Database Reset:", error);
        process.exit(1);
    }
}
exports.resetTvShowPoliticiansTable = resetTvShowPoliticiansTable;
// CLI Support
if (require.main === module) {
    resetTvShowPoliticiansTable();
}
