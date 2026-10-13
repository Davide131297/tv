import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import {
  getThreadsBotConfig,
  refreshThreadsToken,
} from "@/lib/threads-bot";
import {
  getThreadsTextLength,
  publishThread,
  splitTextForThreads,
  ThreadsPublishError,
} from "@/lib/threads";

const THREADS_TOPIC_TAG = "Polittalk";

// Types
interface ShowData {
  show_name: string;
  episode_date: string;
  guests: { name: string; party: string | null }[];
}

export async function GET(request: NextRequest) {
  let currentStep = "init";
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    // 1. Fetch Credentials from DB
    currentStep = "db_config";
    const config = await getThreadsBotConfig();
    const USER_ID = config.userId;
    let ACCESS_TOKEN = config.accessToken;

    if (!USER_ID || !ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error: "Missing configuration in DB",
          hasUserId: !!USER_ID,
          hasAccessToken: !!ACCESS_TOKEN,
        },
        { status: 500 },
      );
    }

    // 1b. Refresh Access Token
    if (!dryRun) {
      currentStep = "token_refresh";
      ACCESS_TOKEN = await refreshThreadsToken(ACCESS_TOKEN);
    }

    // 2. Determine Date Range (Last Week: Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Calculate last Monday
    const diffToLastMonday = ((dayOfWeek + 6) % 7) + 7;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - diffToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const startDate = lastMonday.toISOString().split("T")[0];
    const endDate = lastSunday.toISOString().split("T")[0];

    const deStartDate = lastMonday.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });
    const deEndDate = lastSunday.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    });

    // 3. Fetch Data
    currentStep = "data_fetch";
    const { data: showsData, error: showsError } = await supabase
      .from("tv_show_politicians")
      .select("show_name, episode_date, politician_name, party_name")
      .gte("episode_date", startDate)
      .lte("episode_date", endDate)
      .neq("show_name", "Phoenix Runde")
      .neq("show_name", "Phoenix Persönlich")
      .neq("show_name", "Pinar Atalay")
      .neq("show_name", "Blome & Pfeffer")
      .order("episode_date", { ascending: true });

    if (showsError)
      throw new Error(`Supabase query error: ${JSON.stringify(showsError)}`);

    // 4. Aggregate Data
    const episodes = new Map<string, ShowData>();

    showsData.forEach((row) => {
      const key = `${row.show_name}-${row.episode_date}`;
      if (!episodes.has(key)) {
        episodes.set(key, {
          show_name: row.show_name,
          episode_date: row.episode_date,
          guests: [],
        });
      }
      const episode = episodes.get(key)!;
      if (row.politician_name) {
        episode.guests.push({
          name: row.politician_name,
          party: row.party_name,
        });
      }
    });

    // 5. Format Text
    let fullText = `Polit-Talks für die Woche vom ${deStartDate} bis ${deEndDate}\n\n`;

    if (episodes.size === 0) {
      fullText += "Keine Sendungen.";
    } else {
      const sortedEpisodes = Array.from(episodes.values()).sort((a, b) =>
        a.episode_date.localeCompare(b.episode_date),
      );

      sortedEpisodes.forEach((ep) => {
        const date = new Date(ep.episode_date).toLocaleDateString("de-DE", {
          weekday: "short",
        }); // Mo, Di, etc.
        const shortDate = date.replace(".", "");

        fullText += `${shortDate}: ${ep.show_name}\n`;

        if (ep.guests.length > 0) {
          const shortGuests = ep.guests.map((g) => {
            if (g.party) {
              return `${g.name} (${g.party})`; // Use full name
            }
            return g.name;
          });
          fullText += `G: ${shortGuests.slice(0, 5).join(", ")}${
            shortGuests.length > 5 ? "..." : ""
          }\n`;
        }
        fullText += `\n`;
      });
    }

    fullText += `\nMehr zu sehen auf www.polittalk-watcher.de`;

    const chunks = splitTextForThreads(fullText);

    // 6. Publish to Threads
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        originalLength: getThreadsTextLength(fullText),
        chunks: chunks,
        chunkLengths: chunks.map(getThreadsTextLength),
        chunksCount: chunks.length,
        configLoaded: { hasUserId: !!USER_ID }, // Proof that DB read worked
        data: Array.from(episodes.values()),
      });
    }

    // Erster Teil als Post, Rest als Antworten darunter
    currentStep = "threads_publish";
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
    console.error(`Error in threads-bot route (step: ${currentStep}):`, error);
    return NextResponse.json(
      {
        error: error.message,
        step: currentStep,
        publishedIds:
          error instanceof ThreadsPublishError ? error.publishedIds : undefined,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
