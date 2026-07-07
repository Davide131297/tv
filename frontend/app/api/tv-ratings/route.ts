import { NextResponse } from "next/server";
import { getTvRatingsDashboardData } from "@/lib/politics-data";

// Public, read-only endpoint that exposes the aggregated TV ratings dashboard
// data (summary, politician stats, party stats) for external clients such as the
// mobile app. Not covered by the API-key middleware (see proxy.ts matcher).
export async function GET() {
  try {
    const data = await getTvRatingsDashboardData();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          // allow short-lived CDN caching; refreshed weekly by the crawler
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("API Error (tv-ratings):", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
