import CrawlLanz from "@/crawler/lanz";
import { NextResponse } from "next/server";
import { crawlNewMaybritIllnerEpisodes } from "@/crawler/illner";
import { crawlNewMaischbergerEpisodes } from "@/crawler/maischberger";
import { crawlIncrementalCarenMiosgaEpisodes } from "@/crawler/miosga";
import crawlHartAberFair from "@/crawler/haf";
import CrawlPinarAtalay from "@/crawler/pinar-atalay";
import CrawlPhoenixRunde from "@/crawler/phoenix-runde";
import CrawlBlomePfeffer from "@/crawler/blome-pfeffer";

export async function POST() {
  console.info("Starting sequential crawling process...");

  const results: Record<string, { success: boolean; error?: string }> = {};

  // Helper to run a crawler safely
  const runCrawler = async (name: string, crawlerFn: () => Promise<any>) => {
    try {
      console.info(`Starting ${name} crawler...`);
      await crawlerFn();
      console.info(`✅ ${name} crawler completed`);
      results[name] = { success: true };
    } catch (error) {
      console.error(`❌ ${name} crawler failed:`, error);
      results[name] = { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  };

  // 2. Run crawlers sequentially (to avoid resource exhaustion)
  await runCrawler("Markus Lanz", CrawlLanz);
  await runCrawler("Maybrit Illner", crawlNewMaybritIllnerEpisodes);
  await runCrawler("Maischberger", crawlNewMaischbergerEpisodes);
  await runCrawler("Caren Miosga", crawlIncrementalCarenMiosgaEpisodes);
  await runCrawler("Hart aber Fair", crawlHartAberFair);
  await runCrawler("Pinar Atalay", CrawlPinarAtalay);
  await runCrawler("Phoenix Runde", CrawlPhoenixRunde);
  await runCrawler("Blome & Pfeffer", CrawlBlomePfeffer);

  const successCount = Object.values(results).filter(r => r.success).length;
  const failureCount = Object.values(results).filter(r => !r.success).length;

  console.info(`🎉 Crawling finished. Success: ${successCount}, Failures: ${failureCount}`);

  // 3. Return summary response
  return NextResponse.json({
    success: failureCount === 0,
    message: `Crawling finished with ${successCount} successes and ${failureCount} failures`,
    results,
  }, { status: 200 });
}
