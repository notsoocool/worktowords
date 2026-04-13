import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type VerifyBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json(
      { error: "Missing RAZORPAY_KEY_SECRET" },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as VerifyBody | null;
  if (
    !body ||
    !isNonEmptyString(body.razorpay_order_id) ||
    !isNonEmptyString(body.razorpay_payment_id) ||
    !isNonEmptyString(body.razorpay_signature)
  ) {
    return Response.json({ error: "Invalid payment payload." }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== body.razorpay_signature) {
    return Response.json({ error: "Invalid payment signature." }, { status: 400 });
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
      { status: 500 }
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
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    plan: "pro",
    paymentId: body.razorpay_payment_id,
    planStatus: "active",
    planExpiry: planExpiryYmd,
  });
}

