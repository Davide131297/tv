import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Fetch data with pagination
    const {
      data: entries,
      error,
      count,
    } = await supabase
      .from("tv_show_politicians")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("episode_date", { ascending: false })
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Blome & Pfeffer");

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Fehler beim Laden der Daten" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: entries || [],
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Interner Server-Fehler" },
      { status: 500 }
    );
  }
}
