import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env file.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please check your .env file.",
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY environment variable.",
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Database table types for better TypeScript support
export interface TvShowPolitician {
  id?: number;
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string | null;
  politician_id?: number | null;
  party_id?: number | null;
  created_at?: string;
}

export interface PartyStats {
  party_name: string;
  count: number;
}

export interface EpisodeData {
  episode_date: string;
  politician_count: number;
}

export interface PoliticianAppearance {
  show_name: string;
  episode_date: string;
  politician_name: string;
  party_name: string | null;
  abgeordnetenwatch_url: string;
}
