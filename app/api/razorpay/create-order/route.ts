import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const options = {
      amount: 14900, // ₹149 in paise
      currency: "INR",
      receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId: userId, // Crucial for identifying the user in the webhook payload
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(
      { orderId: order.id, amount: order.amount, currency: order.currency },
      { status: 200 }
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
