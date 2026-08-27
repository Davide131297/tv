import dotenv from "dotenv";
dotenv.config();

import { fetchZdfSeasonEpisodes, fetchZdfEpisodeHtml, parseZdfEpisodeHtml, cleanAcademicTitles } from "../lib/zdf-api.js";
import { seemsLikePersonName, isModeratorOrHost } from "../lib/crawler-utils.js";
import { checkPolitician, extractGuestsWithAI, getPoliticalArea } from "../lib/utils.js";

async function main() {
  console.log("==========================================================");
  console.log("🔍 Teste Sarah Tacke Crawler lokal (inkl. Politiker-Check)");
  console.log(`🤖 Lokale KI aktiv (LokalLLM)? ${process.env.LokalLLM === "true" ? "JA (LM Studio auf Port 1234)" : "NEIN (Google Gemini API)"}`);
  console.log("==========================================================\n");

  try {
    const season = await fetchZdfSeasonEpisodes("sarah-tacke-166", 0);
    console.log(`📺 Gefundene Episoden in Mediathek: ${season.episodes.length}\n`);

    for (const ep of season.episodes) {
      const date = ep.editorialDate ? ep.editorialDate.substring(0, 10) : "unbekannt";
      console.log(`----------------------------------------------------------`);
      console.log(`🎬 Episode: "${ep.title}" (${date})`);
      console.log(`🔗 URL: ${ep.sharingUrl}`);

      const html = await fetchZdfEpisodeHtml(ep.sharingUrl);
      const parsed = parseZdfEpisodeHtml("tacke", html);

      let guestNames = parsed.guests.map((g) => g.name);

      // Fallback auf KI falls keine HTML-Liste vorhanden ist
      if (guestNames.length === 0) {
        const textToExtract = ep.description || parsed.description || "";
        if (textToExtract) {
          console.log(`   ℹ️ Keine <li> Liste im HTML gefunden -> Rufe KI zur Gäste-Extraktion auf...`);
          const aiGuests = await extractGuestsWithAI(textToExtract);
          for (const rawName of aiGuests) {
            const name = cleanAcademicTitles(rawName);
            if (seemsLikePersonName(name) && !isModeratorOrHost(name, "Sarah Tacke")) {
              if (!guestNames.includes(name)) {
                guestNames.push(name);
              }
            }
          }
        }
      }

      console.log(`👥 Extrahierte Gäste (${guestNames.length}): ${guestNames.join(", ") || "Keine"}`);

      // Abgeordnetenwatch Prüfung
      const politiciansFound: string[] = [];
      const nonPoliticians: string[] = [];

      for (const gName of guestNames) {
        const matchedGuest = parsed.guests.find((g) => g.name === gName);
        const details = await checkPolitician(gName, matchedGuest?.role);
        await new Promise((resolve) => setTimeout(resolve, 250)); // Rate limit schutz

        if (details.isPolitician && details.politicianId) {
          politiciansFound.push(`${details.politicianName || gName} (${details.partyName || "Partei unbekannt"}, ID: ${details.politicianId})`);
        } else {
          nonPoliticians.push(gName);
        }
      }

      console.log(`\n🏛️  POLITIKER ERKANNT (${politiciansFound.length}):`);
      if (politiciansFound.length > 0) {
        politiciansFound.forEach((p) => console.log(`   ✅ ${p}`));
      } else {
        console.log(`   (Keine Politiker erkannt)`);
      }

      if (nonPoliticians.length > 0) {
        console.log(`👤 Andere Gäste (keine Politiker): ${nonPoliticians.join(", ")}`);
      }

      console.log("");
    }
  } catch (error: any) {
    console.error("❌ Fehler beim Testlauf:", error.message);
  }
}

main();
