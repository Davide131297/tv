import { NextRequest, NextResponse } from "next/server";
import { AtpAgent, RichText } from "@atproto/api";
import { supabaseServer as supabase } from "@/lib/supabase-server";


export const runtime = "nodejs";

type SupportedPeriod = "weekly" | "monthly";

interface ShowData {
  show_name: string;
  episode_date: string;
  guests: { name: string; party: string | null }[];
}

function isSupportedPeriod(period: string): period is SupportedPeriod {
  return period === "weekly" || period === "monthly";
}

function richTextLength(text: string) {
  return new RichText({ text }).graphemeLength;
}

function splitTextForBluesky(text: string, limit: number = 280): string[] {
  if (richTextLength(text) <= limit) {
    return [text];
  }

  const rawChunks: string[] = [];
  const lines = text.split("\n");
  let currentChunk = "";

  const pushCurrentChunk = () => {
    if (currentChunk.trim().length > 0) {
      rawChunks.push(currentChunk.trim());
      currentChunk = "";
    }
  };

  for (const line of lines) {
    const candidate = currentChunk ? `${currentChunk}\n${line}` : line;
    if (richTextLength(candidate) <= limit) {
      currentChunk = candidate;
      continue;
    }

    pushCurrentChunk();

    if (richTextLength(line) <= limit) {
      currentChunk = line;
      continue;
    }

    let currentLineChunk = "";
    for (const char of Array.from(line)) {
      const nextChunk = currentLineChunk + char;
      if (richTextLength(nextChunk) > limit) {
        rawChunks.push(currentLineChunk);
        currentLineChunk = char;
      } else {
        currentLineChunk = nextChunk;
      }
    }

    if (currentLineChunk) {
      rawChunks.push(currentLineChunk);
    }
  }

  pushCurrentChunk();

  if (rawChunks.length <= 1) {
    return rawChunks;
  }

  return rawChunks.map((chunk, index) => {
    const suffix = `\n\n(${index + 1}/${rawChunks.length})`;
    const suffixLength = richTextLength(suffix);
    let trimmedChunkChars = Array.from(chunk);

    while (
      trimmedChunkChars.length > 0 &&
      richTextLength(trimmedChunkChars.join("")) + suffixLength > limit
    ) {
      trimmedChunkChars.pop();
    }

    return `${trimmedChunkChars.join("").trimEnd()}${suffix}`;
  });
}

function getWeeklyDateRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToLastMonday = ((dayOfWeek + 6) % 7) + 7;

  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - diffToLastMonday);
  lastMonday.setHours(0, 0, 0, 0);

  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  return {
    start: lastMonday,
    end: lastSunday,
    startDate: lastMonday.toISOString().split("T")[0],
    endDate: lastSunday.toISOString().split("T")[0],
    deStartDate: lastMonday.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
    deEndDate: lastSunday.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
    }),
  };
}

function getMonthlyDateRange() {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() - 1);

  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    monthName: start.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    }),
  };
}

async function buildWeeklyPost() {
  const range = getWeeklyDateRange();
  const { data: showsData, error } = await supabase
    .from("tv_show_politicians")
    .select("show_name, episode_date, politician_name, party_name")
    .gte("episode_date", range.startDate)
    .lte("episode_date", range.endDate)
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer")
    .order("episode_date", { ascending: true });

  if (error) {
    throw new Error(`Supabase query error: ${JSON.stringify(error)}`);
  }

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

    if (row.politician_name) {
      episodes.get(key)!.guests.push({
        name: row.politician_name,
        party: row.party_name,
      });
    }
  });

  let fullText = `Polit-Talks für die Woche vom ${range.deStartDate} bis ${range.deEndDate}\n\n`;

  if (episodes.size === 0) {
    fullText += "Keine Sendungen.";
  } else {
    const sortedEpisodes = Array.from(episodes.values()).sort((a, b) =>
      a.episode_date.localeCompare(b.episode_date),
    );

    sortedEpisodes.forEach((episode) => {
      const date = new Date(episode.episode_date).toLocaleDateString("de-DE", {
        weekday: "short",
      });
      const shortDate = date.replace(".", "");

      fullText += `${shortDate}: ${episode.show_name}\n`;

      if (episode.guests.length > 0) {
        const shortGuests = episode.guests.map((guest) =>
          guest.party ? `${guest.name} (${guest.party})` : guest.name,
        );
        fullText += `G: ${shortGuests.slice(0, 5).join(", ")}${
          shortGuests.length > 5 ? "..." : ""
        }\n`;
      }

      fullText += "\n";
    });
  }

  fullText += "\nMehr zu sehen auf www.polittalk-watcher.de\n\n#Polittalk";

  return {
    label: "weekly",
    text: fullText,
    meta: {
      dateRange: {
        start: range.startDate,
        end: range.endDate,
      },
      data: Array.from(episodes.values()),
    },
  };
}

async function buildMonthlyPost() {
  const range = getMonthlyDateRange();
  const { data: showsData, error } = await supabase
    .from("tv_show_politicians")
    .select("party_name")
    .gte("episode_date", range.startDate)
    .lte("episode_date", range.endDate)
    .neq("show_name", "Phoenix Runde")
    .neq("show_name", "Phoenix Persönlich")
    .neq("show_name", "Pinar Atalay")
    .neq("show_name", "Blome & Pfeffer");

  if (error) {
    throw error;
  }

  const partyCounts: Record<string, number> = {};
  let totalGuests = 0;

  showsData.forEach((row) => {
    if (!row.party_name) {
      return;
    }

    partyCounts[row.party_name] = (partyCounts[row.party_name] || 0) + 1;
    totalGuests++;
  });

  const sortedParties = Object.entries(partyCounts).sort((a, b) => b[1] - a[1]);

  let fullText = `Talkshow-Präsenz der Parteien im ${range.monthName} 📊\n\n`;

  if (sortedParties.length === 0) {
    fullText += "Keine Gästedaten für diesen Monat verfügbar.";
  } else {
    sortedParties.forEach(([party, count]) => {
      fullText += `${party}: ${count}\n`;
    });
    fullText += `\nGesamtanzahl Gäste: ${totalGuests}`;
  }

  fullText += "\n\n#Polittalk";

  return {
    label: "monthly",
    text: fullText,
    meta: {
      month: range.monthName,
      dateRange: {
        start: range.startDate,
        end: range.endDate,
      },
      data: sortedParties,
    },
  };
}

async function buildPost(period: SupportedPeriod) {
  if (period === "weekly") {
    return buildWeeklyPost();
  }

  return buildMonthlyPost();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ period: string }> },
) {
  try {
    const { period } = await context.params;
    if (!isSupportedPeriod(period)) {
      return NextResponse.json(
        { error: `Unsupported period: ${period}` },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    const post = await buildPost(period);
    const chunks = splitTextForBluesky(post.text);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        period: post.label,
        originalLength: richTextLength(post.text),
        chunksCount: chunks.length,
        chunks,
        ...post.meta,
      });
    }

    const blueskyUsername = process.env.BLUESKY_USERNAME;
    const blueskyPassword = process.env.BLUESKY_PASSWORD;

    if (!blueskyUsername || !blueskyPassword) {
      return NextResponse.json(
        {
          error:
            "Missing Bluesky credentials: BLUESKY_USERNAME and BLUESKY_PASSWORD environment variables must be set.",
        },
        { status: 503 },
      );
    }

    const agent = new AtpAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: blueskyUsername, password: blueskyPassword });

    let rootRef: { uri: string; cid: string } | null = null;
    let parentRef: { uri: string; cid: string } | null = null;
    const publishedPosts: Array<{ uri: string; cid: string }> = [];

    for (const chunk of chunks) {
      const richText = new RichText({ text: chunk });
      await richText.detectFacets(agent);

      const response = await agent.post({
        text: richText.text,
        facets: richText.facets,
        reply:
          rootRef && parentRef
            ? {
                root: rootRef,
                parent: parentRef,
              }
            : undefined,
      });

      const createdPost = {
        uri: response.uri,
        cid: response.cid,
      };

      if (!rootRef) {
        rootRef = createdPost;
      }
      parentRef = createdPost;
      publishedPosts.push(createdPost);
    }

    return NextResponse.json({
      success: true,
      period: post.label,
      publishedPosts,
      chunksCount: chunks.length,
    });
  } catch (error: unknown) {
    console.error("Error in bluesky-bot route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
