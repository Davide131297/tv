import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Types
interface BotConfig {
  key: string;
  value: string;
}

// Helper functions (duplicated from weekly bot to avoid refactoring risks)
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
    const dryRun = searchParams.get("dryRun") === "true";

    // 1. Fetch Credentials from DB
    const config = await getBotConfig();
    let ACCESS_TOKEN = config["THREADS_ACCESS_TOKEN"];
    const USER_ID = config["THREADS_USER_ID"];

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

    fullText += "\n\n#Polittalk";

    const chunks = splitTextForThreads(fullText);

    // 6. Publish to Threads
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        month: monthName,
        dateRange: { start: startDate, end: endDate },
        originalLength: fullText.length,
        chunks: chunks,
        data: sortedParties,
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
    console.error("Error in monthly threads-bot route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
