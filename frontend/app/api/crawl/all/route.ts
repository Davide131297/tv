import CrawlLanz from "@/crawler/lanz";
import { NextResponse } from "next/server";
import { crawlNewMaybritIllnerEpisodes } from "@/crawler/illner";
import { crawlNewMaischbergerEpisodes } from "@/crawler/maischberger";
import { crawlIncrementalCarenMiosgaEpisodes } from "@/crawler/miosga";
import crawlHartAberFair from "@/crawler/haf";

export async function POST() {
  await Promise.all([
    CrawlLanz(),
    crawlNewMaybritIllnerEpisodes(),
    crawlNewMaischbergerEpisodes(),
    crawlIncrementalCarenMiosgaEpisodes(),
    crawlHartAberFair(),
  ]);
  return NextResponse.json("Finished all crawlers");
}
