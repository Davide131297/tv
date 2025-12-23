import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface MonthlyPartyStats {
  month: string;
  [party: string]: string | number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showName = searchParams.get("show");
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();
    const tv_channel = searchParams.get("tv_channel");

    // Base query without year filters; add year filters only if a specific year is requested
    let query = supabase
      .from("tv_show_politicians")
      .select("party_name, episode_date")
      .not("party_name", "is", null)
      .neq("party_name", "")
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Blome & Pfeffer");

    if (year !== "all") {
      query = query
        .gte("episode_date", `${year}-01-01`)
        .lte("episode_date", `${year}-12-31`);
    }

    // Filter nach Show
    if (showName && showName !== "all") {
      query = query.eq("show_name", showName);
    }

    // Filter nach TV-Sender
    if (tv_channel && tv_channel !== "all") {
      query = query.eq("tv_channel", tv_channel);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Ensure we have an array to iterate over
    const rows = data || [];

    // Gruppiere nach Monat-Jahr (YYYY-MM) und Partei
    const monthlyStats: Record<string, Record<string, number>> = {};
    const allParties = new Set<string>();

    // Helper to generate month keys between two dates (inclusive) in YYYY-MM format
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

    // If there are no rows, return zeroed months for the current year or empty for 'all'
    const validDates = rows
      .map((r) => (r && r.episode_date ? new Date(r.episode_date) : null))
      .filter((d) => d instanceof Date && !Number.isNaN(d.getTime())) as Date[];

    const monthKeys: string[] = [];

    if (year === "all") {
      if (validDates.length === 0) {
        // nothing to show
        return NextResponse.json({
          success: true,
          data: [],
          parties: [],
          year,
        });
      }
      // compute range from earliest to latest date
      let minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
      let maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));

      // normalize to first day of month
      minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

      const cur = new Date(minDate);
      while (cur <= maxDate) {
        monthKeys.push(monthKey(cur));
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      // Specific year: generate 12 months for that year
      for (let m = 1; m <= 12; m++) {
        monthKeys.push(`${year}-${pad2(m)}`);
      }
    }

    // initialize
    monthKeys.forEach((mk) => {
      monthlyStats[mk] = {};
    });

    rows.forEach((row) => {
      if (!row || !row.episode_date) return;

      const d = new Date(row.episode_date);
      if (Number.isNaN(d.getTime())) return;

      const mk = monthKey(d);
      const party = (row.party_name as string) || "Unbekannt";

      // only count if within our generated month keys (useful for specific year)
      if (!monthlyStats[mk]) return;

      allParties.add(party);

      if (!monthlyStats[mk][party]) monthlyStats[mk][party] = 0;
      monthlyStats[mk][party]++;
    });

    // Transformiere in Array-Format für recharts
    const results: MonthlyPartyStats[] = monthKeys.map((mk) => {
      const monthData: MonthlyPartyStats = { month: mk } as MonthlyPartyStats;
      allParties.forEach((party) => {
        monthData[party] = monthlyStats[mk][party] || 0;
      });
      return monthData;
    });

    return NextResponse.json({
      success: true,
      data: results,
      parties: Array.from(allParties),
      year: year,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
