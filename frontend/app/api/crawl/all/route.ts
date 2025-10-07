import CrawlLanz from "@/crawler/lanz";
import { NextResponse } from "next/server";
import { crawlAllMaybritIllnerEpisodes } from "@/crawler/illner";
import { crawlMaischberger2025 } from "@/crawler/maischberger";
import { crawlAllCarenMiosgaEpisodes } from "@/crawler/miosga";

export async function POST() {
  await Promise.all([
    CrawlLanz(),
    crawlAllMaybritIllnerEpisodes(),
    crawlMaischberger2025(),
    crawlAllCarenMiosgaEpisodes(),
  ]);
  return NextResponse.json("Finished all crawlers");
}
