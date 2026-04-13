import { createClient } from "@supabase/supabase-js";

export type PostRow = {
  id: number;
  user_id: string;
  content: string;
  hashtags: string[];
  goal: "job" | "growth" | "authority";
  created_at: string;
};

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serverKey) return null;

  return createClient(supabaseUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

