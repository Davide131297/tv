import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please check your .env.local file.",
  );
}

const serverKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!serverKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
  );
}

export const supabaseServer = createClient(supabaseUrl, serverKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
