// React Query hooks. Centralises caching, refetch-on-focus and pull-to-refresh
// behaviour so screens stay declarative. Explicit generics keep `data` fully
// typed for consumers (and for QueryBoundary inference).

import { useQuery } from "@tanstack/react-query";
import { api, type Filter } from "@/lib/api";
import type {
  MonthlyPoint,
  PartyStats,
  PartyTimelineRow,
  PoliticalAreaStats,
  PoliticianDetailAppearance,
  PoliticianRanking,
  RecentAppearance,
  ShowStats,
  SummaryData,
  EpisodeData,
  TvRatingsDashboard,
} from "@/lib/types";

const keyOf = (f?: Filter) => [f?.show ?? "all", f?.year ?? "all"];

export function useSummary(filter?: Filter) {
  return useQuery<SummaryData>({
    queryKey: ["summary", ...keyOf(filter)],
    queryFn: ({ signal }) => api.summary(filter, signal),
  });
}

export function usePartyStats(filter?: Filter) {
  return useQuery<PartyStats[]>({
    queryKey: ["party-stats", ...keyOf(filter)],
    queryFn: ({ signal }) => api.partyStats(filter, signal),
  });
}

export function useRecent(filter?: Filter, limit = 15) {
  return useQuery<RecentAppearance[]>({
    queryKey: ["recent", limit, ...keyOf(filter)],
    queryFn: ({ signal }) => api.recent(filter, limit, signal),
  });
}

export function useActivityMonthly(filter?: Filter) {
  return useQuery<MonthlyPoint[]>({
    queryKey: ["activity-monthly", ...keyOf(filter)],
    queryFn: ({ signal }) => api.activityMonthly(filter, signal),
  });
}

export function useShows(filter?: Filter) {
  return useQuery<ShowStats[]>({
    queryKey: ["shows", ...keyOf(filter)],
    queryFn: ({ signal }) => api.shows(filter, signal),
  });
}

export function useEpisodes(show: string, year?: string | null) {
  return useQuery<EpisodeData[]>({
    queryKey: ["episodes", show, year ?? "all"],
    queryFn: ({ signal }) => api.episodes(show, year, undefined, signal),
    enabled: !!show && show !== "all",
  });
}

export function useRankings(filter?: Filter, limit = 50) {
  return useQuery<PoliticianRanking[]>({
    queryKey: ["rankings", limit, ...keyOf(filter)],
    queryFn: ({ signal }) => api.rankings(filter, limit, signal),
  });
}

export function usePoliticalAreas(filter?: Filter) {
  return useQuery<PoliticalAreaStats[]>({
    queryKey: ["political-areas", ...keyOf(filter)],
    queryFn: ({ signal }) => api.politicalAreas(filter, signal),
  });
}

export function usePartyTimeline(filter?: Filter) {
  return useQuery<{ data: PartyTimelineRow[]; parties: string[] }>({
    queryKey: ["party-timeline", ...keyOf(filter)],
    queryFn: ({ signal }) => api.partyTimeline(filter, signal),
  });
}

export function usePoliticianAppearances(name: string | undefined) {
  return useQuery<PoliticianDetailAppearance[]>({
    queryKey: ["politician-appearances", name ?? ""],
    queryFn: ({ signal }) => api.politicianAppearances(name ?? "", signal),
    enabled: !!name,
  });
}

export function useTvRatings(filter?: Filter) {
  return useQuery<TvRatingsDashboard>({
    queryKey: ["tv-ratings", ...keyOf(filter)],
    queryFn: ({ signal }) => api.tvRatings(filter, signal),
  });
}
