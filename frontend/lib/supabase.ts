import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are available
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
