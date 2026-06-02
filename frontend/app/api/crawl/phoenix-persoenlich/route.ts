import CrawlPhoenixPersoenlich from "@/crawler/phoenix-persoenlich";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlPhoenixPersoenlich();
  return NextResponse.json(res);
}
