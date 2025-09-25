#!/usr/bin/env node

// Clear Lanz database and recrawl with full archive crawler
import { clearLanzData, initTvShowPoliticiansTable } from "../db-tv-shows.js";
import { crawlAllMarkusLanzEpisodes } from "../crawler/lanz-full-archive.js";

async function main() {
  console.log(
    "🚀 Starte kompletten Markus Lanz Neucrawl mit Archive-Crawler..."
  );
  console.log(
    "⚠️  WARNUNG: Alle bestehenden Markus Lanz Daten werden gelöscht!"
  );

  // Warte 3 Sekunden für Abbruch
  console.log("⏳ Warte 3 Sekunden... (Strg+C zum Abbrechen)");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // 1. Initialisiere Tabelle (falls noch nicht geschehen)
    console.log("\n📊 Stelle sicher dass Datenbank initialisiert ist...");
    initTvShowPoliticiansTable();

    // 2. Lösche nur Lanz-Daten
    console.log("\n🗑️ Lösche bestehende Markus Lanz Daten...");
    clearLanzData();

    // 3. Crawle mit dem Archive-Crawler (der mehr Episoden findet)
    console.log("\n🔥 Starte Archive-Crawler für ALLE Markus Lanz Episoden...");
    console.log("📅 Das erfasst alle verfügbaren Episoden seit Januar 2025!");

    const results = await crawlAllMarkusLanzEpisodes();

    console.log("\n✅ Archive-Crawler abgeschlossen!");
    console.log(`📊 Verarbeitete Episoden: ${results.length}`);

    // Zeige Statistiken
    const episodesWithDates = results.filter((r) => r.date);
    if (episodesWithDates.length > 0) {
      console.log(
        `📅 Datumsbereich: ${
          episodesWithDates[episodesWithDates.length - 1]?.date
        } bis ${episodesWithDates[0]?.date}`
      );
    }

    const totalGuests = results.reduce((sum, r) => sum + r.guests.length, 0);
    const totalPoliticians = results.reduce(
      (sum, r) => sum + r.guestsDetailed.filter((g) => g.isPolitician).length,
      0
    );

    console.log(`👥 Gäste gesamt: ${totalGuests}`);
    console.log(`🏛️ Politiker gesamt: ${totalPoliticians}`);
  } catch (error) {
    console.error("❌ Fehler beim Crawlen:", error);
    process.exit(1);
  }
}

main().catch(console.error);
