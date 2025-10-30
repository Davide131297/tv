import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing politician ID" },
      { status: 400 }
    );
  }

  try {
    // Schritt 1: Politische Auftritte abrufen
    const { data: appearances, error } = await supabase
      .from("tv_show_politicians")
      .select("show_name, episode_date")
      .eq("politician_id", id);

    if (error) throw error;

    // Schritt 2: Für jede Sendung den Link abrufen
    const results = await Promise.all(
      (appearances ?? []).map(async (row) => {
        const { data: linkData, error: linkError } = await supabase
          .from("show_links")
          .select("episode_url")
          .eq("show_name", row.show_name)
          .eq("episode_date", row.episode_date)
          .single();

        if (linkError && linkError.code !== "PGRST116")
          console.error(linkError);

        return {
          id: randomUUID(),
          show_name: row.show_name,
          episode_date: row.episode_date,
          episode_url: linkData?.episode_url,
        };
      })
    );

    console.log("results:", results);

    return NextResponse.json(results);
  } catch (err) {
    console.error("[api/politician-details] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500 }
    );
  }
}
