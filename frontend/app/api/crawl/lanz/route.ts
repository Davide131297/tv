import CrawlLanz from "@/crawler/lanz";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlLanz();
  return NextResponse.json(res);
}
