/**
 * Script zum Generieren von Embeddings für alle Daten
 * Führt dieses Script aus, nachdem die Materialized Views erstellt wurden
 */

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const googleApiKey = process.env.GOOGLE_GENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: googleApiKey });

const EMBEDDING_MODEL = "text-embedding-004";
const BATCH_SIZE = 50; // Verarbeite 50 Zeilen auf einmal
const DELAY_MS = 200; // Pause zwischen Batches um Rate Limits zu vermeiden

/**
 * Generiert ein Embedding für einen Text
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    if (
      !result.embeddings ||
      result.embeddings.length === 0 ||
      !result.embeddings[0].values
    ) {
      return null;
    }

    return result.embeddings[0].values;
  } catch (error) {
    console.error("❌ Fehler bei Embedding-Generierung:", error);
    return null;
  }
}

/**
 * Generiert Embeddings für tv_show_politicians
 */
async function generateAppearanceEmbeddings() {
  console.log("\n🔄 Generiere Embeddings für tv_show_politicians...\n");

  // Hole alle Zeilen ohne Embedding
  const { data: appearances, error } = await supabase
    .from("tv_show_politicians")
    .select(
      "id, show_name, episode_date, politician_name, party_name, tv_channel"
    )
    .is("embedding", null)
    .limit(1000); // Limitiere für erste Tests

  if (error) {
    console.error("❌ Fehler beim Laden der Daten:", error);
    return;
  }

  if (!appearances || appearances.length === 0) {
    console.log("✅ Alle Auftritte haben bereits Embeddings!");
    return;
  }

  console.log(`📊 ${appearances.length} Auftritte ohne Embeddings gefunden`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < appearances.length; i += BATCH_SIZE) {
    const batch = appearances.slice(i, i + BATCH_SIZE);

    for (const appearance of batch) {
      // Erstelle Text-Beschreibung
      const description = `${appearance.politician_name || "Unbekannt"} (${
        appearance.party_name || "Parteilos"
      }) war am ${appearance.episode_date} bei ${appearance.show_name} (${
        appearance.tv_channel
      })`;

      // Generiere Embedding
      const embedding = await generateEmbedding(description);

      if (embedding) {
        // Speichere in Datenbank
        const { error: updateError } = await supabase
          .from("tv_show_politicians")
          .update({ embedding })
          .eq("id", appearance.id);

        if (updateError) {
          console.error(
            `❌ Fehler beim Update von ID ${appearance.id}:`,
            updateError
          );
          failed++;
        } else {
          processed++;
          if (processed % 10 === 0) {
            console.log(`✅ ${processed}/${appearances.length} verarbeitet...`);
          }
        }
      } else {
        failed++;
      }

      // Kleine Pause
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Pause zwischen Batches
    if (i + BATCH_SIZE < appearances.length) {
      console.log(`⏸️  Pause ${DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(
    `\n✅ Fertig! ${processed} erfolgreich, ${failed} fehlgeschlagen\n`
  );
}

/**
 * Generiert Embeddings für party_statistics
 */
async function generatePartyStatsEmbeddings() {
  console.log("\n🔄 Generiere Embeddings für party_statistics...\n");

  const { data: stats, error } = await supabase
    .from("party_statistics")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("❌ Fehler beim Laden der Partei-Statistiken:", error);
    return;
  }

  if (!stats || stats.length === 0) {
    console.log("✅ Alle Partei-Statistiken haben bereits Embeddings!");
    return;
  }

  console.log(`📊 ${stats.length} Partei-Statistiken ohne Embeddings gefunden`);

  let processed = 0;

  for (const stat of stats) {
    const embedding = await generateEmbedding(stat.description);

    if (embedding) {
      const { error: updateError } = await supabase
        .from("party_statistics")
        .update({ embedding })
        .eq("party_name", stat.party_name);

      if (updateError) {
        console.error(
          `❌ Fehler beim Update von ${stat.party_name}:`,
          updateError
        );
      } else {
        processed++;
        console.log(`✅ ${stat.party_name}: ${processed}/${stats.length}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Fertig! ${processed} Partei-Statistiken verarbeitet\n`);
}

/**
 * Generiert Embeddings für politician_statistics
 */
async function generatePoliticianStatsEmbeddings() {
  console.log("\n🔄 Generiere Embeddings für politician_statistics...\n");

  const { data: stats, error } = await supabase
    .from("politician_statistics")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("❌ Fehler beim Laden der Politiker-Statistiken:", error);
    return;
  }

  if (!stats || stats.length === 0) {
    console.log("✅ Alle Politiker-Statistiken haben bereits Embeddings!");
    return;
  }

  console.log(
    `📊 ${stats.length} Politiker-Statistiken ohne Embeddings gefunden`
  );

  let processed = 0;

  for (const stat of stats) {
    const embedding = await generateEmbedding(stat.description);

    if (embedding) {
      const { error: updateError } = await supabase
        .from("politician_statistics")
        .update({ embedding })
        .eq("politician_name", stat.politician_name)
        .eq("party_name", stat.party_name);

      if (updateError) {
        console.error(
          `❌ Fehler beim Update von ${stat.politician_name}:`,
          updateError
        );
      } else {
        processed++;
        if (processed % 10 === 0) {
          console.log(`✅ ${processed}/${stats.length} verarbeitet...`);
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Fertig! ${processed} Politiker-Statistiken verarbeitet\n`);
}

/**
 * Hauptfunktion
 */
async function main() {
  console.log("🚀 Starte Embedding-Generierung...\n");
  console.log("⚠️  Dies kann je nach Datenmenge 20-30 Minuten dauern!\n");

  try {
    // 1. Generiere Embeddings für Partei-Statistiken (schnell)
    await generatePartyStatsEmbeddings();

    // 2. Generiere Embeddings für Politiker-Statistiken (mittel)
    await generatePoliticianStatsEmbeddings();

    // 3. Generiere Embeddings für einzelne Auftritte (langsam)
    await generateAppearanceEmbeddings();

    console.log("\n🎉 Alle Embeddings erfolgreich generiert!\n");
  } catch (error) {
    console.error("\n❌ Fehler beim Generieren der Embeddings:", error);
    process.exit(1);
  }
}

// Script ausführen
main();
