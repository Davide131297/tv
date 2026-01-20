import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const firstname = searchParams.get("first_name");
  const lastname = searchParams.get("last_name");
  const year = searchParams.get("year");

  if (!firstname || !lastname) {
    return NextResponse.json(
      { error: "Missing firstname or lastname" },
      { status: 400 },
    );
  }

  try {
    // Schritt 1: Politische Auftritte abrufen
    let query = supabase
      .from("tv_show_politicians")
      .select("show_name, episode_date")
      .ilike("politician_name", `%${firstname}%`)
      .ilike("politician_name", `%${lastname}%`)
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Blome & Pfeffer")
      .order("episode_date", { ascending: false });

    if (year && year !== "all") {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte("episode_date", startDate).lte("episode_date", endDate);
    }

    const { data: appearances, error } = await query;

    // Schritt 1a: Prüfen ob Politiker überhaupt existiert (nur wenn Filter aktiv ist)
    // Wenn kein Filter aktiv ist, reicht die normale Abfrage
    if (year && year !== "all") {
      const { count } = await supabase
        .from("tv_show_politicians")
        .select("*", { count: "exact", head: true })
        .ilike("politician_name", `%${firstname}%`)
        .ilike("politician_name", `%${lastname}%`);

      if (count === 0) {
        return NextResponse.json(
          { error: "Politician not found" },
          { status: 404 },
        );
      }
    } else {
      // Kein Filter, also wenn leer -> wirklich nicht gefunden
      if (!appearances || appearances.length === 0) {
        return NextResponse.json(
          { error: "Politician not found" },
          { status: 404 },
        );
      }
    }

    const maxLimit = 20;
    const limitedAppearances = (appearances || []).slice(0, maxLimit);

    // Schritt 2: Für jede Sendung den Link abrufen
    const results = await Promise.all(
      limitedAppearances.map(async (row) => {
        const { data: linkData, error: linkError } = await supabase
          .from("show_links")
          .select("episode_url")
          .eq("show_name", row.show_name)
          .eq("episode_date", row.episode_date)
          .neq("show_name", "Phoenix Runde")
          .neq("show_name", "Phoenix Persönlich")
          .neq("show_name", "Pinar Atalay")
          .neq("show_name", "Blome & Pfeffer")
          .single();

        if (linkError && linkError.code !== "PGRST116")
          console.error(linkError);

        return {
          id: randomUUID(),
          show_name: row.show_name,
          episode_date: row.episode_date,
          episode_url: linkData?.episode_url,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (err) {
    console.error("[api/politician-details] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500 },
    );
  }
}
