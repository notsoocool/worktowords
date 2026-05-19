import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return new NextResponse("Missing signature or secret", { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const userId = payment.notes?.userId;

      if (!userId) {
        console.error("Missing userId in payment notes");
        return new NextResponse("Missing userId in payment notes", { status: 400 });
      }

      const planExpiryDate = new Date();
      planExpiryDate.setDate(planExpiryDate.getDate() + 30);
      const expiryIsoString = planExpiryDate.toISOString();

      const { error: subError } = await supabaseAdmin
        .from("user_subscriptions")
        .upsert(
          {
            user_id: userId,
            payment_id: paymentId,
            razorpay_order_id: orderId,
            plan: "pro",
            plan_status: "active",
            plan_expiry: expiryIsoString,
            amount_paise: payment.amount,
            currency: payment.currency,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "razorpay_order_id" }
        );

      if (subError) throw subError;

      const { error: usageError } = await supabaseAdmin
        .from("user_usage")
        .update({
          plan: "pro",
          plan_expiry: expiryIsoString,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (usageError) throw usageError;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
