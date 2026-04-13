import { auth, currentUser } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PRO_PLAN_AMOUNT_INR_PAISE = 14900;

function buildReceipt(userId: string) {
  // Razorpay receipt max length is 40 chars.
  const ts = Date.now().toString().slice(-10);
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `w2w_${safeUser}_${ts}`.slice(0, 40);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      { status: 500 }
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
    return Response.json({ error: message }, { status: 500 });
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
          "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
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
    return Response.json(
      { error: `Failed to store order reference: ${storeOrderError.message}` },
      { status: 500 }
    );
  }

  return Response.json({
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
  });
}

