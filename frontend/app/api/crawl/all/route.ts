import CrawlLanz from "@/crawler/lanz";
import { NextResponse } from "next/server";
import { crawlNewMaybritIllnerEpisodes } from "@/crawler/illner";
import { crawlNewMaischbergerEpisodes } from "@/crawler/maischberger";
import { crawlIncrementalCarenMiosgaEpisodes } from "@/crawler/miosga";
import crawlHartAberFair from "@/crawler/haf";
import CrawlPinarAtalay from "@/crawler/pinar-atalay";
import CrawlPhoenixRunde from "@/crawler/phoenix-runde";

export async function POST() {
  console.info("Starting sequential crawling process...");

  try {
    console.info("1/7 - Starting Markus Lanz crawler...");
    await CrawlLanz();
    console.info("✅ Markus Lanz crawler completed");

    console.info("2/7 - Starting Maybrit Illner crawler...");
    await crawlNewMaybritIllnerEpisodes();
    console.info("✅ Maybrit Illner crawler completed");

    console.info("3/7 - Starting Maischberger crawler...");
    await crawlNewMaischbergerEpisodes();
    console.info("✅ Maischberger crawler completed");

    console.info("4/7 - Starting Caren Miosga crawler...");
    await crawlIncrementalCarenMiosgaEpisodes();
    console.info("✅ Caren Miosga crawler completed");

    console.info("5/7 - Starting Hart aber Fair crawler...");
    await crawlHartAberFair();
    console.info("✅ Hart aber Fair crawler completed");

    console.info("6/7 - Starting Pinar Atalay crawler...");
    await CrawlPinarAtalay();
    console.info("✅ Pinar Atalay crawler completed");

    console.info("7/7 - Starting Phoenix Runde crawler...");
    await CrawlPhoenixRunde();
    console.info("✅ Phoenix Runde crawler completed");

    console.info("🎉 All crawlers completed successfully!");
    return NextResponse.json({
      success: true,
      message: "All crawlers finished successfully",
      completedCrawlers: [
        "Markus Lanz",
        "Maybrit Illner",
        "Maischberger",
        "Caren Miosga",
        "Hart aber Fair",
        "Pinar Atalay",
        "Phoenix Runde",
      ],
    });
  } catch (error) {
    console.error({ error }, "❌ Error during crawling process");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete all crawlers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
