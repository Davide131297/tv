import CrawlPinarAtalay from "@/crawler/pinar-atalay";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlPinarAtalay();
  return NextResponse.json(res);
}
