import { fetchZdfSeasonEpisodes, fetchZdfEpisodeHtml, parseZdfEpisodeHtml } from "../lib/zdf-api.js";

async function dryRunShow(name: string, canonical: string, showKey: "lanz" | "illner") {
  console.log(`\n========================================`);
  console.log(`DRY-RUN: Fetching latest episodes for ${name}...`);
  console.log(`========================================`);

  try {
    // 1) Fetch latest season episodes
    const seasonResult = await fetchZdfSeasonEpisodes(canonical, 0);
    console.log(`Show: ${name} (${canonical})`);
    console.log(`Season: ${seasonResult.seasonTitle}`);
    console.log(`Total episodes in season: ${seasonResult.countEpisodes}`);
    console.log(`Fetched ${seasonResult.episodes.length} episodes on page 1.`);

    // 2) Process top 3 most recent episodes
    const episodesToProcess = seasonResult.episodes.slice(0, 3);
    console.log(`\nProcessing top ${episodesToProcess.length} most recent episodes (without database storage):`);

    for (const ep of episodesToProcess) {
      const date = ep.editorialDate ? ep.editorialDate.substring(0, 10) : "unknown date";
      console.log(`\n🎬 Episode: ${ep.title} (${date})`);
      console.log(`🔗 URL: ${ep.sharingUrl}`);

      try {
        // Fetch HTML
        const html = await fetchZdfEpisodeHtml(ep.sharingUrl);

        // Parse HTML
        const parsed = parseZdfEpisodeHtml(showKey, html);

        console.log(`📝 Description: ${parsed.description || ep.description || "None"}`);
        console.log(`👥 Guests Extracted (${parsed.guests.length}):`);
        if (parsed.guests.length > 0) {
          parsed.guests.forEach((g, idx) => {
            console.log(`  ${idx + 1}. Name: "${g.name}" | Role: "${g.role || "None"}"`);
          });
        } else {
          console.log("  No guests found.");
        }
      } catch (err: any) {
        console.error(`❌ Failed to process episode ${ep.sharingUrl}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error(`❌ Failed to fetch season episodes for ${name}:`, err.message);
  }
}

async function main() {
  console.log("🚀 Starting ZDF Crawler Dry-Run (No Database Storage)...");
  const start = Date.now();

  await dryRunShow("Markus Lanz", "markus-lanz-114", "lanz");
  await dryRunShow("Maybrit Illner", "maybrit-illner-128", "illner");

  const duration = (Date.now() - start) / 1000;
  console.log(`\n🎉 Dry-run completed in ${duration.toFixed(2)}s.`);
}

main().catch(console.error);
