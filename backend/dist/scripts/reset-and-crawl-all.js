#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAndCrawlAll = void 0;
const reset_database_1 = require("./reset-database");
const lanz_1 = require("../crawler/lanz");
/**
 * Komplettes Reset und Neu-Crawl Script
 * 1. Löscht alle Daten in der tv_show_politicians Tabelle
 * 2. Startet einen vollständigen historischen Crawl aller Episoden
 */
function resetAndCrawlAll() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🚀 Starte komplettes Reset und Neu-Crawl...");
        console.log(`📅 Gestartet: ${new Date().toISOString()}\n`);
        try {
            // Schritt 1: Database Reset
            console.log("=".repeat(60));
            console.log("SCHRITT 1: DATABASE RESET");
            console.log("=".repeat(60));
            (0, reset_database_1.resetTvShowPoliticiansTable)();
            console.log("\n⏰ Pause von 3 Sekunden vor dem Crawl...");
            yield new Promise(resolve => setTimeout(resolve, 3000));
            // Schritt 2: Vollständiger Crawl
            console.log("\n" + "=".repeat(60));
            console.log("SCHRITT 2: VOLLSTÄNDIGER CRAWL");
            console.log("=".repeat(60));
            yield (0, lanz_1.crawlAllMarkusLanzEpisodes)();
            // Schritt 3: Abschluss-Statistiken
            console.log("\n" + "=".repeat(60));
            console.log("ABSCHLUSS-STATISTIKEN");
            console.log("=".repeat(60));
            const db = require("../db").default;
            const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT show_name) as shows,
        COUNT(DISTINCT episode_date) as episodes,
        COUNT(DISTINCT politician_id) as unique_politicians,
        MIN(episode_date) as first_episode,
        MAX(episode_date) as last_episode
      FROM tv_show_politicians
    `).get();
            console.log(`📊 Finale Statistiken:`);
            console.log(`   📈 Einträge gesamt: ${stats.total_entries}`);
            console.log(`   📺 Shows: ${stats.shows}`);
            console.log(`   📅 Episoden: ${stats.episodes}`);
            console.log(`   👥 Eindeutige Politiker: ${stats.unique_politicians}`);
            console.log(`   🗓️  Zeitraum: ${stats.first_episode} bis ${stats.last_episode}`);
            // Top 5 Politiker nach Auftritten
            const topPoliticians = db.prepare(`
      SELECT politician_id, COUNT(*) as appearances
      FROM tv_show_politicians 
      GROUP BY politician_id 
      ORDER BY appearances DESC 
      LIMIT 5
    `).all();
            console.log(`\n🏆 Top 5 Politiker nach Auftritten:`);
            topPoliticians.forEach((p, i) => {
                console.log(`   ${i + 1}. Politiker ID ${p.politician_id}: ${p.appearances} Auftritte`);
            });
            // Auftritte nach Partei
            const partyStats = db.prepare(`
      SELECT party_id, COUNT(*) as appearances
      FROM tv_show_politicians 
      WHERE party_id IS NOT NULL
      GROUP BY party_id 
      ORDER BY appearances DESC
    `).all();
            console.log(`\n🏛️  Auftritte nach Partei-ID:`);
            partyStats.forEach((p) => {
                console.log(`   Partei ID ${p.party_id}: ${p.appearances} Auftritte`);
            });
            console.log(`\n🎉 RESET UND CRAWL ERFOLGREICH ABGESCHLOSSEN!`);
            console.log(`⏰ Beendet: ${new Date().toISOString()}`);
        }
        catch (error) {
            console.error("\n❌ FEHLER beim Reset und Crawl:", error);
            console.log(`⏰ Fehler aufgetreten: ${new Date().toISOString()}`);
            process.exit(1);
        }
    });
}
exports.resetAndCrawlAll = resetAndCrawlAll;
// CLI Support
if (require.main === module) {
    resetAndCrawlAll()
        .then(() => {
        console.log("\n✅ Script erfolgreich beendet");
        process.exit(0);
    })
        .catch((error) => {
        console.error("\n❌ Script Fehler:", error);
        process.exit(1);
    });
}
