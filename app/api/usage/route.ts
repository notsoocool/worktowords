import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type UsageStatus = {
  dailyUsage: number;
  limitPerDay: number;
  remaining: number;
  plan: "free" | "pro";
  lastUsedDate: string; // YYYY-MM-DD
  planExpiry: string | null; // YYYY-MM-DD
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clamp(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
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

  const today = toYmd(new Date());

  const { data: row, error } = await supabase
    .from("user_usage")
    .select("daily_usage, last_used_date, plan, plan_expiry")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let usageRow = row;
  if (!usageRow) {
    const { error: insertError } = await supabase.from("user_usage").insert({
      user_id: userId,
      daily_usage: 0,
      last_used_date: today,
      plan: "free",
      plan_expiry: null,
    });
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
    usageRow = {
      daily_usage: 0,
      last_used_date: today,
      plan: "free",
      plan_expiry: null,
    };
  }

  const expiryRaw =
    typeof usageRow.plan_expiry === "string" ? usageRow.plan_expiry : null;
  const isExpired = usageRow.plan === "pro" && !!expiryRaw && expiryRaw < today;

  if (isExpired) {
    await supabase
      .from("user_usage")
      .update({ plan: "free", plan_expiry: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    await supabase
      .from("user_subscriptions")
      .update({
        plan: "free",
        plan_status: "inactive",
        plan_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    usageRow.plan = "free";
    usageRow.plan_expiry = null;
  }

  const plan: "free" | "pro" = usageRow.plan === "pro" ? "pro" : "free";
  const limitPerDay = plan === "pro" ? 100 : 5;

  const last =
    typeof usageRow.last_used_date === "string" ? usageRow.last_used_date : today;
  const isNewDay = last !== today;

  const dailyUsage = clamp(isNewDay ? 0 : Number(usageRow.daily_usage ?? 0));

  if (isNewDay) {
    // Keep the table consistent for subsequent reads.
    await supabase
      .from("user_usage")
      .update({ daily_usage: 0, last_used_date: today })
      .eq("user_id", userId);
  }

  const status: UsageStatus = {
    dailyUsage,
    limitPerDay,
    remaining: clamp(limitPerDay - dailyUsage),
    plan,
    lastUsedDate: today,
    planExpiry:
      typeof usageRow.plan_expiry === "string" ? usageRow.plan_expiry : null,
  };

  return Response.json(status);
}

