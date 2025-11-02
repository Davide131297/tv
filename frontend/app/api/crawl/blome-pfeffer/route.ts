import CrawlBlomePfeffer from "@/crawler/blome-pfeffer";
import { NextResponse } from "next/server";

export async function POST() {
  const res = await CrawlBlomePfeffer();
  return NextResponse.json(res);
}
