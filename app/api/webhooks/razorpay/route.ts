import { NextResponse } from "next/server";
import crypto from "crypto";
import { processProUpgrade } from "@/lib/paymentService"; 

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

      await processProUpgrade(
        userId, 
        paymentId, 
        orderId, 
        payment.amount, 
        payment.currency
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
