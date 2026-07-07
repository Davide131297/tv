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
    queryFn: () => api.summary(filter),
  });
}

export function usePartyStats(filter?: Filter) {
  return useQuery<PartyStats[]>({
    queryKey: ["party-stats", ...keyOf(filter)],
    queryFn: () => api.partyStats(filter),
  });
}

export function useRecent(filter?: Filter, limit = 15) {
  return useQuery<RecentAppearance[]>({
    queryKey: ["recent", limit, ...keyOf(filter)],
    queryFn: () => api.recent(filter, limit),
  });
}

export function useActivityMonthly(filter?: Filter) {
  return useQuery<MonthlyPoint[]>({
    queryKey: ["activity-monthly", ...keyOf(filter)],
    queryFn: () => api.activityMonthly(filter),
  });
}

export function useShows(filter?: Filter) {
  return useQuery<ShowStats[]>({
    queryKey: ["shows", ...keyOf(filter)],
    queryFn: () => api.shows(filter),
  });
}

export function useEpisodes(show: string, limit = 40) {
  return useQuery<EpisodeData[]>({
    queryKey: ["episodes", show, limit],
    queryFn: () => api.episodes(show, limit),
    enabled: !!show && show !== "all",
  });
}

export function useRankings(filter?: Filter, limit = 50) {
  return useQuery<PoliticianRanking[]>({
    queryKey: ["rankings", limit, ...keyOf(filter)],
    queryFn: () => api.rankings(filter, limit),
  });
}

export function usePoliticalAreas(filter?: Filter) {
  return useQuery<PoliticalAreaStats[]>({
    queryKey: ["political-areas", ...keyOf(filter)],
    queryFn: () => api.politicalAreas(filter),
  });
}

export function usePartyTimeline(filter?: Filter) {
  return useQuery<{ data: PartyTimelineRow[]; parties: string[] }>({
    queryKey: ["party-timeline", ...keyOf(filter)],
    queryFn: () => api.partyTimeline(filter),
  });
}

export function useTvRatings() {
  return useQuery<TvRatingsDashboard>({
    queryKey: ["tv-ratings"],
    queryFn: () => api.tvRatings(),
  });
}
