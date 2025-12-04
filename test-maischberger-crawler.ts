// Test-Datei für den neuen Maischberger ARD Mediathek Crawler

import {
  crawlNewMaischbergerEpisodes,
  crawlMaischberger2025,
} from "./frontend/crawler/maischberger";

async function testCrawler() {
  console.log("🧪 Starte Test des Maischberger Crawlers...");
  console.log("=".repeat(60));

  try {
    console.log("\n📝 Test 1: Inkrementeller Crawl (nur neue Episoden)");
    console.log("-".repeat(60));
    await crawlNewMaischbergerEpisodes();

    console.log("\n✅ Test 1 erfolgreich abgeschlossen!");
  } catch (error) {
    console.error("❌ Test fehlgeschlagen:", error);
    process.exit(1);
  }
}

// Führe Test aus
testCrawler()
  .then(() => {
    console.log("\n🎉 Alle Tests abgeschlossen!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unerwarteter Fehler:", error);
    process.exit(1);
  });
