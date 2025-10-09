import { NextRequest, NextResponse } from "next/server";
import {
  crawlAllCarenMiosgaEpisodes,
  crawlIncrementalCarenMiosgaEpisodes,
} from "@/crawler/miosga";

export async function POST(request: NextRequest) {
  let runType: "incremental" | "full" = "incremental";

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch {
    console.log("⚠️ No valid JSON body found, using default 'incremental'");
  }

  console.log(`\n\n=== Caren Miosga Crawler gestartet (${runType}) ===`);
  try {
    switch (runType) {
      case "incremental":
        await crawlIncrementalCarenMiosgaEpisodes();
        break;
      case "full":
        await crawlAllCarenMiosgaEpisodes();
        break;
      default:
        await crawlIncrementalCarenMiosgaEpisodes();
        break;
    }
    return NextResponse.json({
      message: `Caren Miosga Crawl erfolgreich abgeschlossen (${runType})`,
      status: 200,
    });
  } catch (error) {
    console.error("Fehler im Caren Miosga Crawl:", error);
    return NextResponse.json({
      message: "Crawl fehlgeschlagen",
      status: 500,
    });
  }
}
