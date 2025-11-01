import CrawlPhoenixPersönlich from "@/crawler/phoenix-persönlich";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlPhoenixPersönlich();
  return NextResponse.json(res);
}
