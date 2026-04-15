export type SettingsGoal = "job" | "growth" | "authority";
export type SettingsTone = "casual" | "professional" | "storytelling";

export type UserSettings = { goal: string; tone: string };

type SettingsRow = { default_goal: unknown; tone: unknown } | null;

function isGoal(value: unknown): value is SettingsGoal {
  return value === "job" || value === "growth" || value === "authority";
}

function isTone(value: unknown): value is SettingsTone {
  return value === "casual" || value === "professional" || value === "storytelling";
}

export async function getUserSettings(_userId: string): Promise<UserSettings> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("default_goal, tone")
    .eq("user_id", _userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as SettingsRow;
  return {
    goal: isGoal(row?.default_goal) ? row.default_goal : "growth",
    tone: isTone(row?.tone) ? row.tone : "professional",
  };
}

export async function updateUserSettings(
  userId: string,
  data: { goal: unknown; tone: unknown }
): Promise<void> {
  if (!isGoal(data.goal) || !isTone(data.tone)) {
    throw new Error(
      "Invalid body. Expected { defaultGoal: 'job'|'growth'|'authority', tone: 'casual'|'professional'|'storytelling' }"
    );
  }

  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      default_goal: data.goal,
      tone: data.tone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);
}

// Used by /api/generate to preserve current behavior:
// - only override request goal if a valid default goal exists in DB
export async function getUserSettingsForGeneration(
  userId: string
): Promise<{ goal: SettingsGoal | null; tone: SettingsTone | null }> {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("default_goal, tone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as SettingsRow;
  return {
    goal: isGoal(row?.default_goal) ? row.default_goal : null,
    tone: isTone(row?.tone) ? row.tone : null,
  };
}

