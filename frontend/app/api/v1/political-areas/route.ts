import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Types
interface PoliticalAreaStats {
  area_id: number;
  area_label: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showName = searchParams.get("show");
    const year = searchParams.get("year");
    const tv_channel = searchParams.get("tv_channel");

    // Base query to join political areas with episode data (include episode_date for monthly timeline)
    let query = supabase.from("tv_show_episode_political_areas").select(`
        political_area_id,
        episode_date,
        political_area(
          id,
          label
        )
      `);

    // Filter by show if specified
    if (showName && showName !== "all") {
      query = query.eq("show_name", showName);
    } else {
      query = query
        .neq("show_name", "Pinar Atalay")
        .neq("show_name", "Phoenix Runde")
        .neq("show_name", "Phoenix Persönlich")
        .neq("show_name", "Pinar Atalay")
        .neq("show_name", "Blome & Pfeffer");
    }

    // Only apply year filtering when a year param is provided and not equal to "all"
    if (year && year !== "all") {
      query = query
        .gte("episode_date", `${year}-01-01`)
        .lte("episode_date", `${year}-12-31`);
    }

    if (tv_channel) {
      query = query.eq("tv_channel", tv_channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Group and count political areas (summary)
    const areaCount = data.reduce(
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: Record<number, { label: string; count: number }>, row: any) => {
        const areaId = row.political_area_id;
        const areaLabel = row.political_area?.label || "Unbekannt";

        if (!acc[areaId]) {
          acc[areaId] = {
            label: areaLabel,
            count: 0,
          };
        }
        acc[areaId].count++;
        return acc;
      },
      {},
    );

    // Convert to array and sort by count
    const results: PoliticalAreaStats[] = Object.entries(areaCount)
      .map(([areaId, data]) => ({
        area_id: parseInt(areaId),
        area_label: data.label,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    // Return both a summary and the raw rows so the frontend can compute monthly timelines
    return NextResponse.json({
      success: true,
      data: results,
      rows: data, // raw rows include episode_date and political_area
      total: results.reduce((sum, item) => sum + item.count, 0),
      metadata: {
        show_filter: showName || "all",
        areas_count: results.length,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
