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
  selectedYear?: string;
  years?: string[];
  handleYearChange?: (year: string) => void;
  unionMode: boolean;
  onUnionChange: (union: boolean) => void;
}

// =============================================================================
// POLITICAL AREAS TYPES
// =============================================================================

export interface PoliticalAreaStats {
  area_id: number;
  area_label: string;
  count: number;
}

export interface PoliticalAreasChartProps {
  data: PoliticalAreaStats[];
  selectedShow?: string;
  selectedYear?: string;
  years?: string[];
  handleYearChange?: (year: string) => void;
}

export interface PoliticalAreaEpisodeRow {
  political_area_id: number;
  episode_date: string;
  political_area?: {
    id: number;
    label: string;
  } | null;
}

export interface PoliticalAreasChartPropsExtended
  extends PoliticalAreasChartProps {
  rows?: PoliticalAreaEpisodeRow[];
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
  abgeordnetenwatch_url: string;
  episode_url?: string; // Optional: Link zur Episode
}

// =============================================================================
// EPISODE TYPES
// =============================================================================

export interface EpisodeData {
  episode_date: string;
  politician_count: number;
  politicians: PoliticianInEpisode[];
  episode_url?: string; // Optional URL from show_links table
}

// =============================================================================
// SHOW & OPTION TYPES
// =============================================================================

export interface ShowOption {
  value: string;
  label: string;
  btnColor: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SHOW_OPTIONS: ShowOption[] = [
  {
    value: "all",
    label: "Alle Shows",
    btnColor: "bg-black text-white hover:bg-gray-800 hover:text-white",
  },
  {
    value: "Markus Lanz",
    label: "Markus Lanz",
    btnColor: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  },
  {
    value: "Maybrit Illner",
    label: "Maybrit Illner",
    btnColor: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
  {
    value: "Caren Miosga",
    label: "Caren Miosga",
    btnColor: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  {
    value: "Maischberger",
    label: "Maischberger",
    btnColor: "bg-teal-100 text-teal-800 hover:bg-teal-200",
  },
  {
    value: "Hart aber fair",
    label: "Hart aber fair",
    btnColor: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  {
    value: "Phoenix Runde",
    label: "Phoenix Runde",
    btnColor: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  },
  {
    value: "Phoenix Persönlich",
    label: "Phoenix Persönlich",
    btnColor: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  },
  {
    value: "Pinar Atalay",
    label: "Pinar Atalay",
    btnColor: "bg-rose-100 text-pink-800 hover:bg-rose-200",
  },
  {
    value: "Blome & Pfeffer",
    label: "Blome & Pfeffer",
    btnColor: "bg-rose-100 text-pink-800 hover:bg-rose-200",
  },
];

export const SHOW_OPTIONS_WITHOUT_ALL: ShowOption[] = [
  {
    value: "Markus Lanz",
    label: "Markus Lanz",
    btnColor: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  },
  {
    value: "Maybrit Illner",
    label: "Maybrit Illner",
    btnColor: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  },
  {
    value: "Caren Miosga",
    label: "Caren Miosga",
    btnColor: "bg-green-100 text-green-800 hover:bg-green-200",
  },
  {
    value: "Maischberger",
    label: "Maischberger",
    btnColor: "bg-teal-100 text-teal-800 hover:bg-teal-200",
  },
  {
    value: "Hart aber fair",
    label: "Hart aber fair",
    btnColor: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  },
  {
    value: "Phoenix Runde",
    label: "Phoenix Runde",
    btnColor: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  },
  {
    value: "Phoenix Persönlich",
    label: "Phoenix Persönlich",
    btnColor: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  },
  {
    value: "Pinar Atalay",
    label: "Pinar Atalay",
    btnColor: "bg-rose-100 text-pink-800 hover:bg-rose-200",
  },
  {
    value: "Blome & Pfeffer",
    label: "Blome & Pfeffer",
    btnColor: "bg-rose-100 text-pink-800 hover:bg-rose-200",
  },
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
  "Die Linke": "#DF007D",
  "BÜNDNIS 90/DIE GRÜNEN": "#22c55e",
  Grüne: "#22c55e",
  AfD: "#2563eb",
  BSW: "#a16207",
  parteilos: "#6b7280",
  ÖVP: "#63c3d0",
  "FREIE WÄHLER": "#f97316",
};

export const BADGE_PARTY_COLORS: Record<string, string> = {
  SPD: "bg-red-100 text-red-800 border-red-200",
  CDU: "bg-gray-800 text-white border-gray-800",
  CSU: "bg-blue-100 text-blue-800 border-blue-200",
  FDP: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Die Linke": "bg-purple-100 text-purple-800 border-purple-200",
  "BÜNDNIS 90/DIE GRÜNEN": "bg-green-100 text-green-900 border-green-200",
  AfD: "bg-blue-50 text-blue-700 border-blue-200",
  Unbekannt: "bg-gray-100 text-gray-800 border-gray-200",
  ÖVP: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "FREIE WÄHLER": "bg-orange-100 text-orange-800 border-orange-200",
  BSW: "bg-yellow-700 text-white border-yellow-800",
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
  | "Hart aber fair"
  | "Phoenix Runde";

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
