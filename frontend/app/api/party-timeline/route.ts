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

    let query = supabase
      .from("tv_show_politicians")
      .select("party_name, episode_date")
      .not("party_name", "is", null)
      .neq("party_name", "")
      .gte("episode_date", `${year}-01-01`)
      .lte("episode_date", `${year}-12-31`);

    // Filter nach Show
    if (
      showName &&
      showName !== "all" &&
      (showName === "Markus Lanz" ||
        showName === "Maybrit Illner" ||
        showName === "Caren Miosga" ||
        showName === "Maischberger" ||
        showName === "Hart aber fair" ||
        showName === "Phoenix Runde")
    ) {
      query = query.eq("show_name", showName);
    } else {
      query = query.neq("show_name", "Pinar Atalay");
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Gruppiere nach Monat und Partei
    const monthlyStats: Record<string, Record<string, number>> = {};
    const allParties = new Set<string>();

    // Initialisiere alle 12 Monate
    const months = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];

    months.forEach((month) => {
      monthlyStats[month] = {};
    });

    data.forEach((row) => {
      const date = new Date(row.episode_date);
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];
      const party = row.party_name as string;

      allParties.add(party);

      if (!monthlyStats[monthName][party]) {
        monthlyStats[monthName][party] = 0;
      }
      monthlyStats[monthName][party]++;
    });

    // Transformiere in Array-Format für recharts
    const results: MonthlyPartyStats[] = months.map((month) => {
      const monthData: MonthlyPartyStats = { month };

      allParties.forEach((party) => {
        monthData[party] = monthlyStats[month][party] || 0;
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
