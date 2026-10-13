import { supabaseServer as supabase } from "@/lib/supabase-server";

interface BotConfig {
  key: string;
  value: string;
}

export async function getThreadsBotConfig() {
  const { data, error } = await supabase
    .from("bot_configuration")
    .select("key, value")
    .in("key", ["THREADS_USER_ID", "THREADS_ACCESS_TOKEN"]);

  if (error) throw error;

  const config: Record<string, string> = {};
  data.forEach((row: BotConfig) => {
    config[row.key] = row.value;
  });

  return {
    userId: config["THREADS_USER_ID"] as string | undefined,
    accessToken: config["THREADS_ACCESS_TOKEN"] as string | undefined,
  };
}

async function updateAccessToken(newToken: string) {
  const { error } = await supabase
    .from("bot_configuration")
    .update({ value: newToken, updated_at: new Date().toISOString() })
    .eq("key", "THREADS_ACCESS_TOKEN");

  if (error) console.error("Failed to update access token in DB:", error);
}

/** Erneuert das (60 Tage gültige) Access Token und speichert es in der DB. */
export async function refreshThreadsToken(currentToken: string) {
  try {
    const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(currentToken)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.access_token) {
      console.log("Token refreshed successfully.");
      await updateAccessToken(data.access_token);
      return data.access_token as string;
    } else {
      console.warn("Failed to refresh token:", data);
      return currentToken; // Fallback to current
    }
  } catch (e) {
    console.error("Error refreshing token:", e);
    return currentToken;
  }
}
