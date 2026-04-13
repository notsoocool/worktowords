import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Goal = "job" | "growth" | "authority";
type Tone = "casual" | "professional" | "storytelling";

function isGoal(value: unknown): value is Goal {
  return value === "job" || value === "growth" || value === "authority";
}

function isTone(value: unknown): value is Tone {
  return value === "casual" || value === "professional" || value === "storytelling";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("default_goal, tone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    defaultGoal: isGoal(data?.default_goal) ? data.default_goal : "growth",
    tone: isTone(data?.tone) ? data.tone : "professional",
  });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const body = raw as { defaultGoal?: unknown; tone?: unknown } | null;
  if (!body || !isGoal(body.defaultGoal) || !isTone(body.tone)) {
    return Response.json(
      {
        error:
          "Invalid body. Expected { defaultGoal: 'job'|'growth'|'authority', tone: 'casual'|'professional'|'storytelling' }",
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      default_goal: body.defaultGoal,
      tone: body.tone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

