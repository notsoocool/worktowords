import { clerkClient } from "@clerk/nextjs/server";

const USER_DATA_TABLES = [
  "posts",
  "user_settings",
  "user_usage",
  "user_subscriptions",
] as const;

export async function deleteAccountData(userId: string): Promise<void> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  for (const table of USER_DATA_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
  }

  const client = await clerkClient();
  await client.users.deleteUser(userId);
}
