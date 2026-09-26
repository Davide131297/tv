// Typed HTTP client for the Polittalk-Watcher backend.
//
// All data comes from the public, read-only endpoints of the Next.js app
// (`/api/v1/*` and `/api/tv-ratings`). No API key is required, so nothing
// secret ends up in the app bundle.

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
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://polittalk-watcher.de"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 20_000;

export interface Filter {
  show?: string | null;
  year?: string | null;
}

/** Error raised for failed API calls. `status` is 0 for network / timeout errors. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** Client errors (4xx) will not succeed on retry. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function withFilter(params: URLSearchParams, filter?: Filter) {
  if (filter?.show && filter.show !== "all") params.set("show", filter.show);
  if (filter?.year && filter.year !== "all") params.set("year", filter.year);
  return params;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // cancelled by React Query – propagate as-is
    throw new ApiError(
      controller.signal.aborted
        ? "Zeitüberschreitung beim Laden der Daten."
        : "Keine Verbindung zum Server.",
      0,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }

  if (!res.ok) {
    throw new ApiError(`Anfrage fehlgeschlagen (${res.status}).`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError("Ungültige Antwort vom Server.", res.status);
  }
}

type Envelope<T> = { success?: boolean; data: T; error?: string };

function unwrap<T>(json: Envelope<T>): T {
  if (json.success === false) {
    throw new ApiError(json.error ?? "Serverfehler.", 500);
  }
  return json.data;
}

// Generic access to the public /api/v1/politics endpoint.
async function politics<T>(
  type: string,
  filter?: Filter,
  extraParams?: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const params = withFilter(new URLSearchParams({ type }), filter);
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) params.set(k, String(v));
  }
  const json = await getJson<Envelope<T>>(
    `/api/v1/politics?${params.toString()}`,
    signal,
  );
  return unwrap(json);
}

/** Splits "Vorname Nachname" into the two parts expected by the details API. */
export function splitName(fullName: string): { first: string; last: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0], last: parts[parts.length - 1] };
}

// ---- Public data functions ------------------------------------------------

export const api = {
  summary: (filter?: Filter, signal?: AbortSignal) =>
    politics<SummaryData>("summary", filter, undefined, signal),

  partyStats: (filter?: Filter, signal?: AbortSignal) =>
    politics<PartyStats[]>("party-stats", filter, undefined, signal),

  recent: (filter?: Filter, limit = 15, signal?: AbortSignal) =>
    politics<RecentAppearance[]>("recent", filter, { limit }, signal),

  activityMonthly: (filter?: Filter, signal?: AbortSignal) =>
    politics<MonthlyPoint[]>("activity-monthly", filter, undefined, signal),

  shows: (filter?: Filter, signal?: AbortSignal) =>
    politics<ShowStats[]>("shows", filter, undefined, signal),

  /**
   * Episodes of a single show incl. guests. The backend applies `limit` to
   * guest rows (not episodes), so the oldest episode of a full page may be
   * incomplete — it is dropped here.
   */
  async episodes(
    show: string,
    year?: string | null,
    rowLimit = 400,
    signal?: AbortSignal,
  ): Promise<EpisodeData[]> {
    const episodes = await politics<EpisodeData[]>(
      "episodes-with-politicians",
      { show, year },
      { limit: rowLimit },
      signal,
    );
    const rows = episodes.reduce((sum, e) => sum + e.politician_count, 0);
    const sorted = [...episodes].sort((a, b) =>
      b.episode_date.localeCompare(a.episode_date),
    );
    return rows >= rowLimit && sorted.length > 1 ? sorted.slice(0, -1) : sorted;
  },

  rankings: (filter?: Filter, limit = 50, signal?: AbortSignal) =>
    politics<PoliticianRanking[]>("politician-rankings", filter, { limit }, signal),

  async politicalAreas(
    filter?: Filter,
    signal?: AbortSignal,
  ): Promise<PoliticalAreaStats[]> {
    const params = withFilter(new URLSearchParams(), filter);
    const json = await getJson<Envelope<PoliticalAreaStats[]>>(
      `/api/v1/political-areas?${params.toString()}`,
      signal,
    );
    return unwrap(json);
  },

  async partyTimeline(
    filter?: Filter,
    signal?: AbortSignal,
  ): Promise<{ data: PartyTimelineRow[]; parties: string[] }> {
    const params = withFilter(new URLSearchParams(), filter);
    if (!params.has("year")) params.set("year", "all");
    const json = await getJson<Envelope<PartyTimelineRow[]> & { parties: string[] }>(
      `/api/v1/party-timeline?${params.toString()}`,
      signal,
    );
    return { data: unwrap(json), parties: json.parties ?? [] };
  },

  /** Latest appearances (max. 20) of a politician incl. Mediathek links. */
  async politicianAppearances(
    name: string,
    signal?: AbortSignal,
  ): Promise<PoliticianDetailAppearance[]> {
    const split = splitName(name);
    if (!split) return [];
    const params = new URLSearchParams({
      first_name: split.first,
      last_name: split.last,
    });
    try {
      const json = await getJson<Envelope<PoliticianDetailAppearance[]>>(
        `/api/v1/politician-details?${params.toString()}`,
        signal,
      );
      return unwrap(json);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return [];
      throw error;
    }
  },

  async tvRatings(
    filter?: Filter,
    signal?: AbortSignal,
  ): Promise<TvRatingsDashboard> {
    const params = withFilter(new URLSearchParams(), filter);
    const qs = params.toString();
    const json = await getJson<Envelope<TvRatingsDashboard>>(
      `/api/tv-ratings${qs ? `?${qs}` : ""}`,
      signal,
    );
    return unwrap(json);
  },
};
