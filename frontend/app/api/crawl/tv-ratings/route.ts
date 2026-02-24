import { NextResponse } from "next/server";
import { crawlARDRatings, crawlZDFRatings } from "@/crawler/tv-ratings";

export async function POST() {
  const results: Record<string, { success: boolean; error?: string }> = {};

  // ARD
  try {
    await crawlARDRatings();
    results["ARD"] = { success: true };
  } catch (error) {
    console.error("Fehler beim ARD Crawlen:", error);
    results["ARD"] = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // ZDF
  try {
    await crawlZDFRatings();
    results["ZDF"] = { success: true };
  } catch (error) {
    console.error("Fehler beim ZDF Crawlen:", error);
    results["ZDF"] = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const allSuccess = Object.values(results).every((r) => r.success);

  return NextResponse.json(
    {
      message: allSuccess
        ? "TV Ratings Crawler erfolgreich abgeschlossen"
        : "TV Ratings Crawler mit Fehlern abgeschlossen",
      results,
    },
    { status: allSuccess ? 200 : 207 },
  );
}
