import CrawlPhoenixRunde from "@/crawler/phoenix-runde";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlPhoenixRunde();
  return NextResponse.json(res);
}
