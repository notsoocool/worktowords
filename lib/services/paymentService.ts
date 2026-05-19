import crypto from "node:crypto";
import Razorpay from "razorpay";
import { currentUser } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type ProPlan = "pro";

const PRO_PLAN_AMOUNT_INR_PAISE = 14900;

function buildReceipt(userId: string) {
  // Razorpay receipt max length is 40 chars.
  const ts = Date.now().toString().slice(-10);
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `w2w_${safeUser}_${ts}`.slice(0, 40);
}

function signaturesMatch(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function mustGetRazorpayKeys() {
  const keyId =
    process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay keys (RAZORPAY_KEY_ID/NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)."
    );
  }
  return { keyId, keySecret };
}

function mustGetSupabase() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return supabase;
}

export type CreateOrderResult = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: ProPlan;
  monthlyPriceInr: number;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

export async function createOrder(userId: string): Promise<CreateOrderResult> {
  const user = await currentUser();
  const { keyId, keySecret } = mustGetRazorpayKeys();

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
    throw new Error(message);
  }

  const phone =
    user?.primaryPhoneNumber?.phoneNumber ??
    user?.phoneNumbers?.[0]?.phoneNumber ??
    "";

  const supabase = mustGetSupabase();
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
    throw new Error(`Failed to store order reference: ${storeOrderError.message}`);
  }

  return {
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
  };
}

export async function verifyPayment(args: {
  userId: string;
  paymentId: string;
  signature: string;
  orderId?: string;
}): Promise<{
  ok: true;
  plan: ProPlan;
  paymentId: string;
  planStatus: "active";
  planExpiry: string; // YYYY-MM-DD
  alreadyProcessed?: boolean;
}> {
  const { keyId, keySecret } = mustGetRazorpayKeys();
  const supabase = mustGetSupabase();

  const { data: subRow, error: subFetchError } = await supabase
    .from("user_subscriptions")
    .select("razorpay_order_id, payment_id, plan_expiry")
    .eq("user_id", args.userId)
    .maybeSingle();

  if (subFetchError) {
    throw new Error(`Failed to read subscription: ${subFetchError.message}`);
  }

  if (!subRow?.razorpay_order_id) {
    throw new Error("Order mismatch. Please restart checkout.");
  }

  if (args.orderId && subRow.razorpay_order_id !== args.orderId) {
    throw new Error("Order mismatch. Please restart checkout.");
  }

  if (subRow.payment_id && subRow.payment_id === args.paymentId) {
    // Mirror previous API behavior: treat it as already verified.
    // The route will map this to { ok, alreadyProcessed, paymentId }.
    return {
      ok: true,
      alreadyProcessed: true,
      paymentId: args.paymentId,
      plan: "pro",
      planStatus: "active",
      planExpiry: typeof subRow.plan_expiry === "string" ? subRow.plan_expiry : "",
    };
  }

  // Standard Checkout: HMAC_SHA256(order_id + "|" + razorpay_payment_id, key_secret)
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${subRow.razorpay_order_id}|${args.paymentId}`)
    .digest("hex");

  if (!signaturesMatch(expectedSignature, args.signature)) {
    throw new Error("Invalid payment signature.");
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const payment = await razorpay.payments.fetch(args.paymentId).catch(() => null);
  if (!payment) throw new Error("Could not fetch payment details from Razorpay.");

  if (payment.order_id !== subRow.razorpay_order_id) {
    throw new Error("Payment/order mismatch.");
  }
  if (payment.currency !== "INR" || payment.amount !== PRO_PLAN_AMOUNT_INR_PAISE) {
    throw new Error("Payment amount mismatch.");
  }
  if (payment.status !== "authorized" && payment.status !== "captured") {
    throw new Error(`Payment is not successful yet (status: ${payment.status}).`);
  }

  const nowIso = new Date().toISOString();
  const planExpiry = new Date();
  planExpiry.setDate(planExpiry.getDate() + 30);
  const planExpiryYmd = planExpiry.toISOString().slice(0, 10);

  const { error: usageError } = await supabase.from("user_usage").upsert(
    {
      user_id: args.userId,
      plan: "pro",
      plan_expiry: planExpiryYmd,
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );

  if (usageError) throw new Error(`Failed to upgrade plan: ${usageError.message}`);

  const { error: subError } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: args.userId,
      payment_id: args.paymentId,
      razorpay_order_id: subRow.razorpay_order_id,
      plan: "pro",
      plan_status: "active",
      plan_expiry: planExpiryYmd,
      amount_paise: PRO_PLAN_AMOUNT_INR_PAISE,
      currency: "INR",
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );

  if (subError) {
    throw new Error(`Failed to store payment details: ${subError.message}`);
  }

  return {
    ok: true,
    plan: "pro",
    paymentId: args.paymentId,
    planStatus: "active",
    planExpiry: planExpiryYmd,
  };
}

// Backwards-compatible aliases (kept for now).
export async function createProOrder(args: { userId: string }): Promise<CreateOrderResult> {
  return createOrder(args.userId);
}

export async function verifyProPayment(args: {
  userId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{
  ok: true;
  plan: ProPlan;
  paymentId: string;
  planStatus: "active";
  planExpiry: string;
  alreadyProcessed?: boolean;
}> {
  return verifyPayment({
    userId: args.userId,
    paymentId: args.razorpay_payment_id,
    signature: args.razorpay_signature,
    orderId: args.razorpay_order_id,
  });
}

