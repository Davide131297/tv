#!/usr/bin/env node

// Clear Maybrit Illner database and run full crawl
import { clearIllnerData, initTvShowPoliticiansTable } from "../db-tv-shows.js";

async function main() {
  console.log("🚀 Starte kompletten Maybrit Illner Neucrawl...");
  console.log(
    "⚠️  WARNUNG: Alle bestehenden Maybrit Illner Daten werden gelöscht!"
  );

  // Warte 3 Sekunden für Abbruch
  console.log("⏳ Warte 3 Sekunden... (Strg+C zum Abbrechen)");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // 1. Initialisiere Tabelle (falls noch nicht geschehen)
    console.log("\n📊 Stelle sicher dass Datenbank initialisiert ist...");
    initTvShowPoliticiansTable();

    // 2. Lösche nur Illner-Daten
    console.log("\n🗑️ Lösche bestehende Maybrit Illner Daten...");
    clearIllnerData();

    // 3. Starte den Illner-Crawler im Full-Modus
    console.log("\n🔥 Starte Maybrit Illner Crawler im FULL-Modus...");
    console.log(
      "📅 Das erfasst alle verfügbaren Episoden mit denormalisierten Namen!"
    );

    // Importiere und starte den Illner-Crawler
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    console.log("🎯 Führe aus: node dist/crawler/illner.js full");

    const { stdout, stderr } = await execAsync(
      "node dist/crawler/illner.js full",
      {
        cwd: process.cwd(),
        timeout: 45 * 60 * 1000, // 45 Minuten Timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB Buffer für Output
      }
    );

    if (stdout) {
      console.log("\n📋 Crawler Output:");
      console.log(stdout);
    }
    if (stderr) {
      console.error("\n⚠️ Stderr:", stderr);
    }

    console.log("\n✅ Maybrit Illner Full Crawl abgeschlossen!");
    console.log("📊 Überprüfe die Datenbank um die Ergebnisse zu sehen:");
    console.log(
      "   SELECT COUNT(*) FROM tv_show_politicians WHERE show_name = 'Maybrit Illner';"
    );
  } catch (error) {
    console.error("❌ Fehler beim Crawlen:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as any).code === "ETIMEDOUT"
    ) {
      console.error("🕐 Der Crawl-Prozess hat das Zeitlimit überschritten");
    }
    process.exit(1);
  }
}

main().catch(console.error);
