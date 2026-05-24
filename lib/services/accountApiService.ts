import { auth } from "@clerk/nextjs/server";

async function deleteUserRows(table: string, userId: string) {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const { error } = await supabase.from(table).delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteAccountData() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await Promise.all([
    deleteUserRows("posts", userId),
    deleteUserRows("user_settings", userId),
    deleteUserRows("user_usage", userId),
  ]);

  return Response.json({ ok: true });
}
