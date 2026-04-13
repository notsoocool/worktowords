import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clientIpFrom, logSecurityInfo, logSecurityWarn, requestIdFrom } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type VerifyBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
const VERIFY_LIMIT = 20;
const VERIFY_WINDOW_MS = 10 * 60_000;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function signaturesMatch(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
  const ctx = { requestId, route: "/api/razorpay/verify", userId, ip };

  const limit = consumeRateLimit(
    `rzp-verify:${userId}:${ip}`,
    VERIFY_LIMIT,
    VERIFY_WINDOW_MS
  );
  if (!limit.allowed) {
    logSecurityWarn("rate_limit_exceeded", ctx, {
      bucket: "rzp_verify",
      limit: limit.limit,
      windowMs: VERIFY_WINDOW_MS,
    });
    return Response.json(
      { error: "Too many verification attempts. Please wait and retry." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
          "x-request-id": requestId,
        },
      }
    );
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const keyId =
    process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keySecret || !keyId) {
    return Response.json(
      {
        error:
          "Missing Razorpay keys (RAZORPAY_KEY_ID/NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).",
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  if (
    !body ||
    !isNonEmptyString(body.razorpay_order_id) ||
    !isNonEmptyString(body.razorpay_payment_id) ||
    !isNonEmptyString(body.razorpay_signature)
  ) {
    return Response.json(
      { error: "Invalid payment payload." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  // Standard Checkout: HMAC_SHA256(order_id + "|" + razorpay_payment_id, key_secret)
  // https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
    .digest("hex");

  if (!signaturesMatch(expectedSignature, body.razorpay_signature)) {
    logSecurityWarn("invalid_signature", ctx, { orderId: body.razorpay_order_id });
    return Response.json(
      { error: "Invalid payment signature." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

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

  const { data: subRow, error: subFetchError } = await supabase
    .from("user_subscriptions")
    .select("razorpay_order_id, payment_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subFetchError) {
    return Response.json(
      { error: `Failed to read subscription: ${subFetchError.message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  if (
    !subRow?.razorpay_order_id ||
    subRow.razorpay_order_id !== body.razorpay_order_id
  ) {
    return Response.json(
      { error: "Order mismatch. Please restart checkout." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  if (subRow.payment_id && subRow.payment_id === body.razorpay_payment_id) {
    return Response.json(
      {
        ok: true,
        alreadyProcessed: true,
        paymentId: body.razorpay_payment_id,
      },
      { headers: { "x-request-id": requestId } }
    );
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const payment = await razorpay.payments
    .fetch(body.razorpay_payment_id)
    .catch(() => null);
  if (!payment) {
    return Response.json(
      { error: "Could not fetch payment details from Razorpay." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }
  if (payment.order_id !== body.razorpay_order_id) {
    return Response.json(
      { error: "Payment/order mismatch." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }
  if (payment.currency !== "INR" || payment.amount !== 14900) {
    return Response.json(
      { error: "Payment amount mismatch." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }
  if (payment.status !== "authorized" && payment.status !== "captured") {
    return Response.json(
      { error: `Payment is not successful yet (status: ${payment.status}).` },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }

  const nowIso = new Date().toISOString();
  const planExpiry = new Date();
  planExpiry.setDate(planExpiry.getDate() + 30);
  const planExpiryYmd = planExpiry.toISOString().slice(0, 10);

  const { error: usageError } = await supabase.from("user_usage").upsert(
    {
      user_id: userId,
      plan: "pro",
      plan_expiry: planExpiryYmd,
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );

  if (usageError) {
    return Response.json(
      { error: `Failed to upgrade plan: ${usageError.message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  const { error: subError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      payment_id: body.razorpay_payment_id,
      razorpay_order_id: body.razorpay_order_id,
      plan: "pro",
      plan_status: "active",
      plan_expiry: planExpiryYmd,
      amount_paise: 14900,
      currency: "INR",
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );

  if (subError) {
    return Response.json(
      { error: `Failed to store payment details: ${subError.message}` },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }

  logSecurityInfo("payment_verified", ctx, {
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
  });
  return Response.json(
    {
      ok: true,
      plan: "pro",
      paymentId: body.razorpay_payment_id,
      planStatus: "active",
      planExpiry: planExpiryYmd,
    },
    { headers: { "x-request-id": requestId } }
  );
}

