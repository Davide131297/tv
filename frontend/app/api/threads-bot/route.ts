import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Types
interface ShowData {
  show_name: string;
  episode_date: string;
  guests: { name: string; party: string | null }[];
}

interface BotConfig {
  key: string;
  value: string;
}

async function getBotConfig() {
  const { data, error } = await supabase
    .from("bot_configuration")
    .select("key, value")
    .in("key", ["THREADS_USER_ID", "THREADS_ACCESS_TOKEN"]);

  if (error) throw error;

  const config: Record<string, string> = {};
  data.forEach((row: BotConfig) => {
    config[row.key] = row.value;
  });

  return config;
}

async function updateAccessToken(newToken: string) {
  const { error } = await supabase
    .from("bot_configuration")
    .update({ value: newToken, updated_at: new Date().toISOString() })
    .eq("key", "THREADS_ACCESS_TOKEN");

  if (error) console.error("Failed to update access token in DB:", error);
}

async function refreshThreadsToken(currentToken: string) {
  try {
    const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.access_token) {
      console.log("Token refreshed successfully.");
      await updateAccessToken(data.access_token);
      return data.access_token;
    } else {
      console.warn("Failed to refresh token:", data);
      return currentToken; // Fallback to current
    }
  } catch (e) {
    console.error("Error refreshing token:", e);
    return currentToken;
  }
}

function splitTextForThreads(text: string, limit: number = 490): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  const lines = text.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    if ((currentChunk + line).length + 1 > limit) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      if (line.length > limit) {
        let remainingLine = line;
        while (remainingLine.length > 0) {
          chunks.push(remainingLine.substring(0, limit));
          remainingLine = remainingLine.substring(limit);
        }
      } else {
        currentChunk = line + "\n";
      }
    } else {
      currentChunk += line + "\n";
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length > 1) {
    return chunks.map((c, i) => `${c}\n\n(${i + 1}/${chunks.length})`);
  }

  return chunks;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const dryRun = searchParams.get("dryRun") === "true";

    // 1. Verify Secret
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Credentials from DB
    const config = await getBotConfig();
    let ACCESS_TOKEN = config["THREADS_ACCESS_TOKEN"];
    const USER_ID = config["THREADS_USER_ID"];

    if (!ACCESS_TOKEN || !USER_ID) {
      return NextResponse.json(
        { error: "Missing configuration in DB" },
        { status: 500 },
      );
    }

    // 3. Refresh Token (If not dryRun)
    if (!dryRun) {
      ACCESS_TOKEN = await refreshThreadsToken(ACCESS_TOKEN);
    }

    // 4. Determine Date Range (Last Week: Monday to Sunday)
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

    // 5. Fetch Data
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

    if (showsError) throw showsError;

    // 6. Aggregate Data
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

    // 7. Format Text
    let fullText = `Polit-Talks ${deStartDate}-${deEndDate}\n\n`;

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
            const parts = g.name.split(" ");
            let shortName = g.name;
            if (parts.length > 1) {
              shortName = `${parts[0][0]}. ${parts[parts.length - 1]}`;
            }
            if (g.party) {
              return `${shortName} (${g.party})`;
            }
            return shortName;
          });
          fullText += `G: ${shortGuests.slice(0, 5).join(", ")}${
            shortGuests.length > 5 ? "..." : ""
          }\n`;
        }
        fullText += `\n`;
      });
    }

    fullText += `#Polittalk`;

    const chunks = splitTextForThreads(fullText);

    // 8. Publish to Threads
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        refreshedToken: !dryRun, // will be false
        originalLength: fullText.length,
        chunks: chunks,
        chunksCount: chunks.length,
        configLoaded: { hasToken: !!ACCESS_TOKEN, hasUserId: !!USER_ID }, // Proof that DB read worked
        data: Array.from(episodes.values()),
      });
    }

    let lastCreationId: string | null = null;
    const publishedIds: string[] = [];

    // Publish chunks sequentially
    for (const textChunk of chunks) {
      const containerUrl = new URL(
        `https://graph.threads.net/v1.0/${USER_ID}/threads`,
      );
      containerUrl.searchParams.append("media_type", "TEXT");
      containerUrl.searchParams.append("text", textChunk);
      containerUrl.searchParams.append("access_token", ACCESS_TOKEN);

      if (lastCreationId) {
        containerUrl.searchParams.append("reply_to_id", lastCreationId);
      }

      const containerRes = await fetch(containerUrl.toString(), {
        method: "POST",
      });
      const containerJson = await containerRes.json();

      if (containerJson.error) {
        throw new Error(
          `Threads Container Error (Chunk ${publishedIds.length + 1}): ${JSON.stringify(containerJson.error)}`,
        );
      }

      const creationId = containerJson.id;

      const publishUrl = new URL(
        `https://graph.threads.net/v1.0/${USER_ID}/threads_publish`,
      );
      publishUrl.searchParams.append("creation_id", creationId);
      publishUrl.searchParams.append("access_token", ACCESS_TOKEN);

      const publishRes = await fetch(publishUrl.toString(), { method: "POST" });
      const publishJson = await publishRes.json();

      if (publishJson.error) {
        throw new Error(
          `Threads Publish Error (Chunk ${publishedIds.length + 1}): ${JSON.stringify(publishJson.error)}`,
        );
      }

      lastCreationId = publishJson.id;
      publishedIds.push(publishJson.id);

      await new Promise((res) => setTimeout(res, 1000));
    }

    return NextResponse.json({ success: true, publishedIds: publishedIds });
  } catch (error: any) {
    console.error("Error in threads-bot route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
