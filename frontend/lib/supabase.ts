import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
}
