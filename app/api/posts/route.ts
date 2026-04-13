import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function isGoal(v: string | null): v is "job" | "growth" | "authority" {
  return v === "job" || v === "growth" || v === "authority";
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
    );
  }

  const goalParam = new URL(req.url).searchParams.get("goal");
  let qb = supabase
    .from("posts")
    .select("id, content, hashtags, goal, created_at")
    .eq("user_id", userId);

  if (goalParam && isGoal(goalParam)) {
    qb = qb.eq("goal", goalParam);
  }

  const { data, error } = await qb
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ posts: data ?? [] });
}

