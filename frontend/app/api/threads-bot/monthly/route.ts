import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { getThreadsBotConfig } from "@/lib/threads-bot";
import {
  getThreadsTextLength,
  publishThread,
  splitTextForThreads,
  ThreadsPublishError,
} from "@/lib/threads";

const THREADS_TOPIC_TAG = "Polittalk";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    // 1. Fetch Credentials from DB
    const { userId: USER_ID, accessToken: ACCESS_TOKEN } =
      await getThreadsBotConfig();

    if (!ACCESS_TOKEN || !USER_ID) {
      return NextResponse.json(
        { error: "Missing configuration in DB" },
        { status: 500 },
      );
    }

    // 2. Determine Date Range (Last Month)
    const now = new Date();
    // Go to the first day of the current month to avoid issues when today is the 31st and last month has 30 days
    now.setDate(1);
    // Go back one month
    now.setMonth(now.getMonth() - 1);

    // First day of previous month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last day of previous month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Set to end of day
    endOfMonth.setHours(23, 59, 59, 999);

    const startDate = startOfMonth.toISOString().split("T")[0];
    const endDate = endOfMonth.toISOString().split("T")[0];

    const monthName = startOfMonth.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    });

    // 3. Fetch Data
    const { data: showsData, error: showsError } = await supabase
      .from("tv_show_politicians")
      .select("party_name")
      .gte("episode_date", startDate)
      .lte("episode_date", endDate)
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Blome & Pfeffer");

    if (showsError) throw showsError;

    // 4. Aggregate Data (Count appearances per party)
    const partyCounts: Record<string, number> = {};
    let totalGuests = 0;

    showsData.forEach((row) => {
      if (row.party_name) {
        partyCounts[row.party_name] = (partyCounts[row.party_name] || 0) + 1;
        totalGuests++;
      }
    });

    // Sort by count descending
    const sortedParties = Object.entries(partyCounts).sort(
      (a, b) => b[1] - a[1],
    );

    // 5. Format Text
    let fullText = `Talkshow-Präsenz der Parteien im ${monthName} 📊\n\n`;

    if (sortedParties.length === 0) {
      fullText += "Keine Gästedaten für diesen Monat verfügbar.";
    } else {
      sortedParties.forEach(([party, count]) => {
        fullText += `${party}: ${count}\n`;
      });
      fullText += `\nGesamtanzahl Gäste: ${totalGuests}`;
    }

    const chunks = splitTextForThreads(fullText);

    // 6. Publish to Threads
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        month: monthName,
        dateRange: { start: startDate, end: endDate },
        originalLength: getThreadsTextLength(fullText),
        chunks: chunks,
        chunkLengths: chunks.map(getThreadsTextLength),
        data: sortedParties,
      });
    }

    // Erster Teil als Post, Rest als Antworten darunter
    const publishedIds = await publishThread({
      userId: USER_ID,
      accessToken: ACCESS_TOKEN,
      chunks,
      topicTag: THREADS_TOPIC_TAG,
    });

    return NextResponse.json({
      success: true,
      rootPostId: publishedIds[0],
      replyIds: publishedIds.slice(1),
      publishedIds,
    });
  } catch (error: any) {
    console.error("Error in monthly threads-bot route:", error);
    return NextResponse.json(
      {
        error: error.message,
        publishedIds:
          error instanceof ThreadsPublishError ? error.publishedIds : undefined,
      },
      { status: 500 },
    );
  }
}
