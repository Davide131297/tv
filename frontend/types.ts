// Central type definitions for TV Politics Dashboard

// =============================================================================
// STATISTICS & SUMMARY TYPES
// =============================================================================

export interface SummaryData {
  total_appearances: number;
  total_episodes: number;
  unique_politicians: number;
  parties_represented: number;
  show_name?: string;
}

export interface Statistics {
  total_episodes: number;
  total_appearances: number;
  episodes_with_politicians: number;
  average_politicians_per_episode: number;
  max_politicians_in_episode: number;
}

// =============================================================================
// PARTY-RELATED TYPES
// =============================================================================

export interface PartyStats {
  party_name: string;
  count: number;
  party_id?: number; // Optional für Kompatibilität mit verschiedenen API-Responses
}

export interface PartyChartProps {
  data: PartyStats[];
  selectedShow?: string;
}

// =============================================================================
// POLITICIAN TYPES
// =============================================================================

export interface PoliticianDetails {
  first_name: string;
  last_name: string;
  occupation: string;
  year_of_birth: number;
  education: string;
}

export interface PoliticianInEpisode {
  name: string;
  party_name: string;
}

export interface PoliticianAppearance {
  show_name: string;
  episode_date: string;
  politician_id: number;
  party_id: number | null;
  politician_name: string;
  party_name: string;
  politician_details: PoliticianDetails;
}

// =============================================================================
// EPISODE TYPES
// =============================================================================

export interface EpisodeData {
  episode_date: string;
  politician_count: number;
  politicians: PoliticianInEpisode[];
}

// =============================================================================
// SHOW & OPTION TYPES
// =============================================================================

export interface ShowOption {
  value: string;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SHOW_OPTIONS: ShowOption[] = [
  { value: "all", label: "Alle Shows" },
  { value: "Markus Lanz", label: "Markus Lanz" },
  { value: "Maybrit Illner", label: "Maybrit Illner" },
  { value: "Caren Miosga", label: "Caren Miosga" },
  { value: "Maischberger", label: "Maischberger" },
  { value: "Hart aber fair", label: "Hart aber fair" },
];

export const SHOW_OPTIONS_WITHOUT_ALL: ShowOption[] = [
  { value: "Markus Lanz", label: "Markus Lanz" },
  { value: "Maybrit Illner", label: "Maybrit Illner" },
  { value: "Caren Miosga", label: "Caren Miosga" },
  { value: "Maischberger", label: "Maischberger" },
  { value: "Hart aber fair", label: "Hart aber fair" },
];

// =============================================================================
// PARTY COLOR MAPPINGS
// =============================================================================

export const PARTY_COLORS: Record<string, string> = {
  CDU: "#000000",
  CSU: "#1e40af",
  Union: "#1e293b", // Union: dunkles Blau-Grau
  SPD: "#dc2626",
  FDP: "#facc15",
  "Die Linke": "#9333ea",
  "BÜNDNIS 90/DIE GRÜNEN": "#22c55e",
  Grüne: "#22c55e",
  AfD: "#2563eb",
  BSW: "#a16207",
  parteilos: "#6b7280",
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type ShowValue =
  | "all"
  | "Markus Lanz"
  | "Maybrit Illner"
  | "Caren Miosga"
  | "Maischberger"
  | "Hart aber fair";

// =============================================================================
// Abgeordnetenwatch TYPES
// =============================================================================

export type AbgeordnetenwatchParty = {
  id: number;
  entity_type: "party";
  label: string;
  api_url: string;
  full_name: string;
  short_name: string;
};

export type AbgeordnetenwatchPolitician = {
  id: number;
  entity_type: "politician";
  label: string;
  api_url: string;
  abgeordnetenwatch_url: string;
  first_name: string;
  last_name: string;
  birth_name: string | null;
  sex: "m" | "w" | "d" | string;
  year_of_birth: number | null;
  party: AbgeordnetenwatchParty | null;
  party_past: AbgeordnetenwatchParty | null;
  education: string | null;
  residence: string | null;
  occupation: string | null;
  statistic_questions: number;
  statistic_questions_answered: number;
  ext_id_bundestagsverwaltung: string | null;
  qid_wikidata: string | null;
  field_title: string | null;
};

export type GuestWithRole = {
  name: string;
  role?: string;
};

export type GuestDetails = {
  name: string;
  isPolitician: boolean;
  politicianId: number | null;
  politicianName?: string; // NEU: Vollständiger Name des Politikers
  party?: number;
  partyName?: string; // NEU: Name der Partei
};
