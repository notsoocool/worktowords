import { auth, currentUser } from "@clerk/nextjs/server";
import Razorpay from "razorpay";

const PRO_PLAN_AMOUNT_INR_PAISE = 14900;

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

  const order = await razorpay.orders.create({
    amount: PRO_PLAN_AMOUNT_INR_PAISE,
    currency: "INR",
    receipt: `w2w_${userId}_${Date.now()}`,
    notes: {
      userId,
      plan: "pro",
    },
  });

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
    },
  });
}

