const Database = require("better-sqlite3");
const path = require("path");

// Pfad zur Database
const dbPath = path.resolve(__dirname, "../../database/database.sqlite");
const db = new Database(dbPath);

function updateManfredWeber() {
  console.log("🔧 Korrigiere Manfred Weber Einträge...");

  // 1. Suche nach möglichen falsch zugeordneten Manfred Weber Einträgen
  // (falls er unter parteilos oder einer anderen Party gespeichert wurde)

  const searchStmt = db.prepare(`
    SELECT * FROM tv_show_politicians 
    WHERE politician_id IN (
      -- Hier könnten verschiedene IDs für Manfred Weber stehen
      28910,  -- Die korrekte ID
      -- Falls andere IDs gefunden werden, hier hinzufügen
      999999  -- Dummy-ID
    )
  `);

  const existingEntries = searchStmt.all();
  console.log(`📊 Gefundene Manfred Weber Einträge: ${existingEntries.length}`);

  if (existingEntries.length > 0) {
    // Aktualisiere bestehende Einträge auf CSU (party_id = 3)
    const updateStmt = db.prepare(`
      UPDATE tv_show_politicians 
      SET party_id = 3, updated_at = CURRENT_TIMESTAMP
      WHERE politician_id = 28910 AND party_id != 3
    `);

    const result = updateStmt.run();
    console.log(
      `✅ ${result.changes} Manfred Weber Einträge auf CSU aktualisiert`
    );
  } else {
    console.log("ℹ️  Keine bestehenden Manfred Weber Einträge gefunden");
  }

  // 2. Falls Manfred Weber in Zukunft gefunden wird, wird er durch
  //    die API-Override-Logik automatisch korrekt als CSU zugeordnet

  console.log("✅ Manfred Weber Korrektur abgeschlossen");
}

function checkManfredWeberStatus() {
  console.log("🔍 Prüfe Manfred Weber Status...");

  // Alle Einträge für ID 28910
  const stmt = db.prepare(
    "SELECT * FROM tv_show_politicians WHERE politician_id = 28910"
  );
  const entries = stmt.all();

  console.log(`📊 Manfred Weber Einträge in DB: ${entries.length}`);
  entries.forEach((entry, index) => {
    console.log(
      `  ${index + 1}. ${entry.episode_date} - Party ID: ${entry.party_id}`
    );
  });

  if (entries.length === 0) {
    console.log("ℹ️  Manfred Weber wurde noch nicht bei Markus Lanz erfasst");
    console.log("ℹ️  Die API-Override-Logik ist bereit für künftige Auftritte");
  }
}

// Hauptfunktion
function main() {
  console.log("🚀 Starte Manfred Weber Korrektur-Script");
  console.log("=====================================");

  try {
    checkManfredWeberStatus();
    updateManfredWeber();

    // Finale Prüfung
    console.log("\n🔍 Finale Überprüfung:");
    checkManfredWeberStatus();
  } catch (error) {
    console.error("❌ Fehler beim Korrigieren:", error);
  } finally {
    db.close();
    console.log("✅ Datenbank geschlossen");
  }
}

// Führe aus wenn direkt aufgerufen
if (require.main === module) {
  main();
}

module.exports = { updateManfredWeber, checkManfredWeberStatus };
