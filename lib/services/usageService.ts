export type UsagePlan = "free" | "pro";

export type UsageStatus = {
  dailyUsage: number;
  limitPerDay: number;
  remaining: number;
  plan: UsagePlan;
  lastUsedDate: string; // YYYY-MM-DD
  planExpiry: string | null; // YYYY-MM-DD
};

type UsageCheckRow = {
  allowed: boolean;
  daily_usage: number;
  last_used_date: string;
  plan: string;
  limit_per_day: number;
};

const ROOT_USAGE_REMAINING = 999_999;

function configuredRootUserIds() {
  const raw = [
    process.env.ROOT_USER_ID,
    process.env.ROOT_USER_IDS,
    process.env.ADMIN_USER_ID,
    process.env.ADMIN_USER_IDS,
  ]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(",");

  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isRootUsageUser(userId: string) {
  return configuredRootUserIds().has(userId);
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clamp(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function checkAndUpdateUsage(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  plan: UsagePlan;
}> {
  if (isRootUsageUser(userId)) {
    return { allowed: true, remaining: ROOT_USAGE_REMAINING, plan: "pro" };
  }

  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const { data: usageRows, error: usageError } = await supabase.rpc(
    "check_and_increment_usage",
    { p_user_id: userId }
  );

  if (usageError) throw new Error(usageError.message);

  const usage = (Array.isArray(usageRows) ? usageRows[0] : usageRows) as
    | UsageCheckRow
    | null
    | undefined;

  const plan: UsagePlan = usage?.plan === "pro" ? "pro" : "free";
  const allowed = usage?.allowed !== false;
  const limitPerDay =
    typeof usage?.limit_per_day === "number"
      ? usage.limit_per_day
      : plan === "pro"
        ? 100
        : 5;
  const dailyUsage =
    typeof usage?.daily_usage === "number" ? Math.max(0, usage.daily_usage) : 0;
  const remaining = Math.max(0, limitPerDay - dailyUsage);

  return { allowed, remaining, plan };
}

export async function getUsageStatus(_userId: string): Promise<UsageStatus> {
  if (isRootUsageUser(_userId)) {
    const today = toYmd(new Date());
    return {
      dailyUsage: 0,
      limitPerDay: ROOT_USAGE_REMAINING,
      remaining: ROOT_USAGE_REMAINING,
      plan: "pro",
      lastUsedDate: today,
      planExpiry: null,
    };
  }

  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  const today = toYmd(new Date());

  const { data: row, error } = await supabase
    .from("user_usage")
    .select("daily_usage, last_used_date, plan, plan_expiry")
    .eq("user_id", _userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  let usageRow = row;
  if (!usageRow) {
    const { error: insertError } = await supabase.from("user_usage").insert({
      user_id: _userId,
      daily_usage: 0,
      last_used_date: today,
      plan: "free",
      plan_expiry: null,
    });
    if (insertError) throw new Error(insertError.message);
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
      .eq("user_id", _userId);
    await supabase
      .from("user_subscriptions")
      .update({
        plan: "free",
        plan_status: "inactive",
        plan_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", _userId);
    usageRow.plan = "free";
    usageRow.plan_expiry = null;
  }

  const plan: UsagePlan = usageRow.plan === "pro" ? "pro" : "free";
  const limitPerDay = plan === "pro" ? 100 : 5;

  const last =
    typeof usageRow.last_used_date === "string" ? usageRow.last_used_date : today;
  const isNewDay = last !== today;

  const dailyUsage = clamp(isNewDay ? 0 : Number(usageRow.daily_usage ?? 0));

  if (isNewDay) {
    await supabase
      .from("user_usage")
      .update({ daily_usage: 0, last_used_date: today })
      .eq("user_id", _userId);
  }

  return {
    dailyUsage,
    limitPerDay,
    remaining: clamp(limitPerDay - dailyUsage),
    plan,
    lastUsedDate: today,
    planExpiry:
      typeof usageRow.plan_expiry === "string" ? usageRow.plan_expiry : null,
  };
}

