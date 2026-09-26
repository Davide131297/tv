// Shared types for the mobile app. Ported from the web project (frontend/types.ts),
// trimmed to what the app actually consumes.

export interface SummaryData {
  total_appearances: number;
  total_episodes: number;
  unique_politicians: number;
  parties_represented: number;
  show_name?: string;
}

export interface PartyStats {
  party_name: string;
  count: number;
}

export interface PoliticalAreaStats {
  area_id: number;
  area_label: string;
  count: number;
}

export interface RecentAppearance {
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string;
}

export interface PoliticianInEpisode {
  name: string;
  party_name: string;
}

export interface EpisodeData {
  episode_date: string;
  politician_count: number;
  episode_url?: string | null;
  politicians: PoliticianInEpisode[];
}

export interface PoliticianRanking {
  politician_name: string;
  party_name: string;
  total_appearances: number;
  shows_appeared_on: number;
  show_names: string[];
  latest_appearance: string;
  first_appearance: string;
}

export interface ShowStats {
  show_name: string;
  appearances: number;
  episodes: number;
  first_episode: string;
  latest_episode: string;
}

export interface MonthlyPoint {
  month: string; // "01".."12"
  count: number;
}

export interface PartyTimelineRow {
  month: string; // "YYYY-MM"
  [party: string]: string | number;
}

export interface PoliticianDetailAppearance {
  id: string;
  show_name: string;
  episode_date: string;
  episode_url?: string;
}

// TV ratings (Einschaltquoten)
export interface TvRatingsSummary {
  total_ratings: number;
  total_viewers_millions: number;
  average_market_share: number;
  average_viewers_millions: number;
}

export interface TvRatingOverview {
  show_name: string;
  episode_date: string;
  market_share: number;
  viewers_millions: number;
  episode_url: string | null;
  politicians: PoliticianInEpisode[];
}

export interface PoliticianTvRatingsStat {
  politician_name: string;
  party_name: string;
  appearances: number;
  total_viewers_millions: number;
  average_viewers_millions: number;
  total_market_share: number;
  average_market_share: number;
  latest_episode: string;
}

export interface PartyTvRatingsStat {
  party_name: string;
  rated_episodes: number;
  total_viewers_millions: number;
  average_viewers_millions: number;
  total_market_share: number;
  average_market_share: number;
  latest_episode: string;
}

export interface TvRatingsDashboard {
  summary: TvRatingsSummary;
  ratings: TvRatingOverview[];
  politicianStats: PoliticianTvRatingsStat[];
  partyStats: PartyTvRatingsStat[];
}

// Show catalog
export interface ShowOption {
  value: string;
  label: string;
  accent: string; // hex accent used for chips / avatars
}
