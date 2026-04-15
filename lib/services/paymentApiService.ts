import { auth } from "@clerk/nextjs/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  clientIpFrom,
  logSecurityInfo,
  logSecurityWarn,
  requestIdFrom,
} from "@/lib/security";
import { createOrder, verifyPayment } from "@/lib/services/paymentService";
import { razorpayVerifyBodySchema } from "@/lib/utils/validators";

const CREATE_ORDER_LIMIT = 6;
const CREATE_ORDER_WINDOW_MS = 10 * 60_000;
const VERIFY_LIMIT = 20;
const VERIFY_WINDOW_MS = 10 * 60_000;

export async function postCreateOrder(req: Request) {
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
  try {
    const payload = await createOrder(userId);
    logSecurityInfo("razorpay_order_created", ctx, {
      orderId: payload.orderId,
      amount: payload.amount,
    });
    return Response.json(payload, { headers: { "x-request-id": requestId } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Razorpay order.";
    const isProvider =
      message === "Failed to create Razorpay order." ||
      message.toLowerCase().includes("razorpay");
    if (isProvider) {
      logSecurityWarn("provider_error", ctx, { provider: "razorpay_orders" });
    } else if (message.startsWith("Failed to store order reference:")) {
      logSecurityWarn("db_write_failed", ctx, { table: "user_subscriptions" });
    }
    return Response.json(
      { error: message },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

export async function postVerifyPayment(req: Request) {
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

  const raw = await req.json().catch(() => null);
  const parsed = razorpayVerifyBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payment payload." },
      { status: 400, headers: { "x-request-id": requestId } }
    );
  }
  try {
    const result = await verifyPayment({
      userId,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
      orderId: parsed.data.razorpay_order_id,
    });

    if (result.alreadyProcessed) {
      return Response.json(
        { ok: true, alreadyProcessed: true, paymentId: parsed.data.razorpay_payment_id },
        { headers: { "x-request-id": requestId } }
      );
    }

    logSecurityInfo("payment_verified", ctx, {
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
    });
    return Response.json(
      {
        ok: true,
        plan: "pro",
        paymentId: parsed.data.razorpay_payment_id,
        planStatus: "active",
        planExpiry: result.planExpiry,
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Payment verification failed.";
    if (message === "Invalid payment signature.") {
      logSecurityWarn("invalid_signature", ctx, {
        orderId: parsed.data.razorpay_order_id,
      });
      return Response.json(
        { error: message },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }
    if (
      message === "Invalid payment payload." ||
      message === "Order mismatch. Please restart checkout." ||
      message === "Could not fetch payment details from Razorpay." ||
      message === "Payment/order mismatch." ||
      message === "Payment amount mismatch." ||
      message.startsWith("Payment is not successful yet")
    ) {
      return Response.json(
        { error: message },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }
    return Response.json(
      { error: message },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}

