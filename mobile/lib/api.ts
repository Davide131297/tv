// Typed HTTP client for the Polittalk-Watcher backend.
//
// Data comes from the existing Next.js API. Most endpoints are served publicly
// via /api/v1/politics and /api/political-areas /api/party-timeline. A few
// aggregate types (rankings, topic matrices) only exist on the key-protected
// /api/politics endpoint — for those we attach the optional EXPO_PUBLIC_POLITICS_API_KEY
// env var (same value as the web NEXT_PUBLIC_POLITICS_API_KEY).

import type {
  EpisodeData,
  MonthlyPoint,
  PartyStats,
  PartyTimelineRow,
  PoliticalAreaStats,
  PoliticianDetailAppearance,
  PoliticianRanking,
  RecentAppearance,
  ShowStats,
  SummaryData,
  TvRatingsDashboard,
} from "./types";

export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://polittalk-watcher.de"
).replace(/\/$/, "");
const API_KEY = process.env.EXPO_PUBLIC_POLITICS_API_KEY ?? "";

// Types that the public /api/v1/politics endpoint understands (no key needed).
const V1_TYPES = new Set([
  "party-stats",
  "episodes",
  "episodes-with-politicians",
  "recent",
  "summary",
  "episode-statistics",
  "activity-monthly",
  "party-monthly",
  "shows",
  "politician-party-combos",
]);

export interface Filter {
  show?: string | null;
  year?: string | null;
}

function withFilter(params: URLSearchParams, filter?: Filter) {
  if (filter?.show && filter.show !== "all") params.set("show", filter.show);
  if (filter?.year && filter.year !== "all") params.set("year", filter.year);
  return params;
}

async function getJson<T>(path: string, withKey = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (withKey && API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) für ${path}`);
  }
  return (await res.json()) as T;
}

// Generic access to the "politics" family of endpoints. Routes to the public v1
// endpoint when possible, otherwise the key-protected endpoint.
async function politics<T>(
  type: string,
  filter?: Filter,
  extraParams?: Record<string, string | number>,
): Promise<T> {
  const params = withFilter(new URLSearchParams({ type }), filter);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) params.set(k, String(v));
  }
  const useV1 = V1_TYPES.has(type);
  const base = useV1 ? "/api/v1/politics" : "/api/politics";
  const json = await getJson<{ success: boolean; data: T }>(
    `${base}?${params.toString()}`,
    !useV1,
  );
  return json.data;
}

// ---- Public data functions ------------------------------------------------

export const api = {
  summary: (filter?: Filter) => politics<SummaryData>("summary", filter),

  partyStats: (filter?: Filter) => politics<PartyStats[]>("party-stats", filter),

  recent: (filter?: Filter, limit = 15) =>
    politics<RecentAppearance[]>("recent", filter, { limit }),

  activityMonthly: (filter?: Filter) =>
    politics<MonthlyPoint[]>("activity-monthly", filter),

  shows: (filter?: Filter) => politics<ShowStats[]>("shows", filter),

  episodes: (show: string, limit = 40) =>
    politics<EpisodeData[]>("episodes-with-politicians", { show }, { limit }),

  rankings: (filter?: Filter, limit = 50) =>
    politics<PoliticianRanking[]>("politician-rankings", filter, { limit }),

  async politicalAreas(filter?: Filter): Promise<PoliticalAreaStats[]> {
    const params = withFilter(new URLSearchParams(), filter);
    const json = await getJson<{ success: boolean; data: PoliticalAreaStats[] }>(
      `/api/political-areas?${params.toString()}`,
    );
    return json.data;
  },

  async partyTimeline(
    filter?: Filter,
  ): Promise<{ data: PartyTimelineRow[]; parties: string[] }> {
    const params = withFilter(new URLSearchParams(), filter);
    if (!params.has("year")) params.set("year", "all");
    const json = await getJson<{
      success: boolean;
      data: PartyTimelineRow[];
      parties: string[];
    }>(`/api/party-timeline?${params.toString()}`);
    return { data: json.data, parties: json.parties };
  },

  async politicianDetails(id: number | string): Promise<PoliticianDetailAppearance[]> {
    return getJson<PoliticianDetailAppearance[]>(
      `/api/politician-details?id=${encodeURIComponent(String(id))}`,
    );
  },

  async tvRatings(): Promise<TvRatingsDashboard> {
    const json = await getJson<{ success: boolean; data: TvRatingsDashboard }>(
      `/api/tv-ratings`,
    );
    return json.data;
  },
};
