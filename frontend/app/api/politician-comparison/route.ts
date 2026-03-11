import { NextRequest, NextResponse } from "next/server";
import { getPoliticianComparisonStats } from "@/lib/politics-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const p1 = searchParams.get("p1");
  const p2 = searchParams.get("p2");
  const year = searchParams.get("year");

  if (!p1 || !p2) {
    return NextResponse.json(
      { error: "Missing politician parameters" },
      { status: 400 },
    );
  }

  try {
    const data = await getPoliticianComparisonStats(p1, p2, year);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/politician-comparison] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison stats" },
      { status: 500 },
    );
  }
}
