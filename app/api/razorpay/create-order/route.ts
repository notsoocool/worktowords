import { auth, currentUser } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIpFrom, logSecurityInfo, logSecurityWarn, requestIdFrom } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PRO_PLAN_AMOUNT_INR_PAISE = 14900;
const CREATE_ORDER_LIMIT = 6;
const CREATE_ORDER_WINDOW_MS = 10 * 60_000;

function buildReceipt(userId: string) {
  // Razorpay receipt max length is 40 chars.
  const ts = Date.now().toString().slice(-10);
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `w2w_${safeUser}_${ts}`.slice(0, 40);
}

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "x-request-id": requestId } }
    );
  }
  const ip = clientIpFrom(req);
  const ctx = { requestId, route: "/api/razorpay/create-order", userId, ip };

  const limit = consumeRateLimit(
    `rzp-create:${userId}:${ip}`,
    CREATE_ORDER_LIMIT,
    CREATE_ORDER_WINDOW_MS
  );
  if (!limit.allowed) {
    logSecurityWarn("rate_limit_exceeded", ctx, {
      bucket: "rzp_create_order",
      limit: limit.limit,
      windowMs: CREATE_ORDER_WINDOW_MS,
    });
    return Response.json(
      { error: "Too many payment attempts. Please wait and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "x-request-id": requestId,
        },
      }
    );
  }
  const user = await currentUser();

  const keyId =
    process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json(
      {
        error:
          "Missing Razorpay keys (RAZORPAY_KEY_ID/NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).",
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  let order: { id: string; amount: number; currency: string };
  try {
    const created = await razorpay.orders.create({
      amount: PRO_PLAN_AMOUNT_INR_PAISE,
      currency: "INR",
      receipt: buildReceipt(userId),
      notes: {
        userId,
        plan: "pro",
      },
    });
    order = {
      id: created.id,
      amount: Number(created.amount),
      currency: created.currency,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Razorpay order.";
    logSecurityWarn("provider_error", ctx, { provider: "razorpay_orders" });
    return Response.json(
      { error: message },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const phone =
    user?.primaryPhoneNumber?.phoneNumber ??
    user?.phoneNumbers?.[0]?.phoneNumber ??
    "";

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json(
      {
        error:
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: storeOrderError } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        razorpay_order_id: order.id,
        plan: "free",
        plan_status: "inactive",
        amount_paise: PRO_PLAN_AMOUNT_INR_PAISE,
        currency: "INR",
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

  if (storeOrderError) {
    logSecurityWarn("db_write_failed", ctx, { table: "user_subscriptions" });
    return Response.json(
      { error: `Failed to store order reference: ${storeOrderError.message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  logSecurityInfo("razorpay_order_created", ctx, {
    orderId: order.id,
    amount: order.amount,
  });
  return Response.json(
    {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      plan: "pro",
      monthlyPriceInr: 149,
      prefill: {
        name: user?.fullName ?? user?.firstName ?? "",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        contact: phone,
      },
    },
    { headers: { "x-request-id": requestId } }
  );
}

