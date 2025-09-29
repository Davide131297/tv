import { NextRequest, NextResponse } from "next/server";
import {
  crawlAllCarenMiosgaEpisodes,
  crawlIncrementalCarenMiosgaEpisodes,
} from "@/crawler/miosga";

export async function POST(request: NextRequest) {
  let runType: "incremental" | "full" = "incremental"; // Default fallback

  try {
    const body = await request.json();
    runType = body.runType || "incremental";
  } catch (error) {
    console.log(
      "Fehler beim Parsen des Request Body - verwende Default 'incremental':",
      error
    );
  }

  console.log(`\n\n=== Caren Miosga Crawler gestartet (${runType}) ===`);
  try {
    switch (runType) {
      case "incremental":
        await crawlIncrementalCarenMiosgaEpisodes();
      case "full":
        await crawlAllCarenMiosgaEpisodes();
        break;
      default:
        await crawlIncrementalCarenMiosgaEpisodes();
    }
    return NextResponse.json({
      message: "Caren Miosga Crawl erfolgreich abgeschlossen",
      status: 200,
    });
  } catch (error) {
    console.error("Fehler im Caren Miosga Crawl:", error);
    return NextResponse.json({ message: "Crawl fehlgeschlagen", status: 500 });
  }
}
