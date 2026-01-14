/**
 * Script zum Aktualisieren der Statistik-Tabellen
 * Führe dies aus, wenn neue Daten hinzugefügt wurden
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Aktualisiert die Statistik-Tabellen
 */
async function refreshStats() {
  console.log("🔄 Aktualisiere Statistik-Tabellen...\n");

  try {
    // Refresh party_statistics
    console.log("📊 Aktualisiere party_statistics...");
    const { error: partyError } = await supabase.rpc("exec", {
      sql: `
        INSERT INTO party_statistics (
          party_name, total_appearances, unique_politicians, 
          shows_appeared_on, first_appearance, last_appearance, description
        )
        SELECT 
          party_name,
          COUNT(*) as total_appearances,
          COUNT(DISTINCT politician_name) as unique_politicians,
          COUNT(DISTINCT show_name) as shows_appeared_on,
          MIN(episode_date) as first_appearance,
          MAX(episode_date) as last_appearance,
          party_name || ' hatte ' || COUNT(*) || ' Auftritte mit ' || 
          COUNT(DISTINCT politician_name) || ' verschiedenen Politikern in ' ||
          COUNT(DISTINCT show_name) || ' Sendungen' as description
        FROM tv_show_politicians
        WHERE party_name IS NOT NULL
        GROUP BY party_name
        ON CONFLICT (party_name) DO UPDATE SET
          total_appearances = EXCLUDED.total_appearances,
          unique_politicians = EXCLUDED.unique_politicians,
          shows_appeared_on = EXCLUDED.shows_appeared_on,
          first_appearance = EXCLUDED.first_appearance,
          last_appearance = EXCLUDED.last_appearance,
          description = EXCLUDED.description,
          embedding = NULL,
          updated_at = NOW();
      `,
    });

    if (partyError) {
      console.error("❌ Fehler bei party_statistics:", partyError);
    } else {
      console.log("✅ party_statistics aktualisiert");
    }

    // Ähnlich für politician_statistics
    console.log("📊 Aktualisiere politician_statistics...");
    const { error: politicianError } = await supabase.rpc("exec", {
      sql: `
        INSERT INTO politician_statistics (
          politician_name, party_name, total_appearances, 
          shows_appeared_on, first_appearance, last_appearance, description
        )
        SELECT 
          politician_name,
          party_name,
          COUNT(*) as total_appearances,
          COUNT(DISTINCT show_name) as shows_appeared_on,
          MIN(episode_date) as first_appearance,
          MAX(episode_date) as last_appearance,
          politician_name || ' (' || COALESCE(party_name, 'Parteilos') || ') hatte ' || 
          COUNT(*) || ' Auftritte in ' || COUNT(DISTINCT show_name) || ' Sendungen' as description
        FROM tv_show_politicians
        WHERE politician_name IS NOT NULL
        GROUP BY politician_name, party_name
        ON CONFLICT (politician_name, party_name) DO UPDATE SET
          total_appearances = EXCLUDED.total_appearances,
          shows_appeared_on = EXCLUDED.shows_appeared_on,
          first_appearance = EXCLUDED.first_appearance,
          last_appearance = EXCLUDED.last_appearance,
          description = EXCLUDED.description,
          embedding = NULL,
          updated_at = NOW();
      `,
    });

    if (politicianError) {
      console.error("❌ Fehler bei politician_statistics:", politicianError);
    } else {
      console.log("✅ politician_statistics aktualisiert");
    }

    console.log("\n🎉 Alle Tabellen erfolgreich aktualisiert!\n");
    console.log(
      "⚠️  Vergiss nicht, die Embeddings für neue/geänderte Zeilen zu generieren:\n"
    );
    console.log("   npm run generate-embeddings\n");
  } catch (error) {
    console.error("\n❌ Fehler beim Aktualisieren der Tabellen:", error);
    process.exit(1);
  }
}

// Script ausführen
refreshStats();
