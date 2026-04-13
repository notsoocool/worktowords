"use client";

import * as React from "react";
import { Show, SignInButton, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  PRICING_CARD_BUTTON_CLASS,
  PRICING_CARD_BUTTON_INTERACTIVE_CLASS,
} from "@/lib/pricing-card-button";
import { cn } from "@/lib/utils";

type RazorpayOrderPayload = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on?: (event: string, cb: (payload: unknown) => void) => void;
};

type RazorpayCheckoutConstructor = new (options: {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessPayload) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}) => RazorpayCheckoutInstance;

function getRazorpayConstructor() {
  return (window as Window & { Razorpay?: RazorpayCheckoutConstructor }).Razorpay;
}

async function ensureRazorpayLoaded() {
  if (getRazorpayConstructor()) return true;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK."));
    document.body.appendChild(script);
  }).catch(() => null);

  return Boolean(getRazorpayConstructor());
}

export type UpgradeToProCtaProps = {
  /** From `/api/usage` when signed in; `null` when signed out or not loaded */
  plan: "free" | "pro" | null;
  /** True while fetching usage for signed-in users */
  usageLoading: boolean;
};

export function UpgradeToProCta({ plan, usageLoading }: UpgradeToProCtaProps) {
  const [isUpgrading, setIsUpgrading] = React.useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const hasClerkKey =
    typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;

  async function onUpgradeToPro() {
    if (isUpgrading) return;
    setIsUpgrading(true);
    const loadingId = toast.loading("Opening Razorpay checkout…");

    try {
      const orderRes = await fetch("/api/razorpay/create-order", { method: "POST" });
      const orderData = (await orderRes.json().catch(() => null)) as
        | RazorpayOrderPayload
        | { error?: string }
        | null;

      if (!orderRes.ok || !orderData || !("orderId" in orderData)) {
        throw new Error(
          (orderData && "error" in orderData && orderData.error) ||
            "Could not start checkout."
        );
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded) throw new Error("Razorpay checkout could not be loaded.");

      const RazorpayCheckout = getRazorpayConstructor();
      if (!RazorpayCheckout) throw new Error("Razorpay is unavailable.");

      const checkout = new RazorpayCheckout({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "WorktoWords",
        description: "Pro Plan — ₹149/month",
        order_id: orderData.orderId,
        prefill: {
          name: orderData.prefill?.name ?? "",
          email: orderData.prefill?.email ?? "",
          contact: orderData.prefill?.contact ?? "",
        },
        notes: {
          plan: "pro",
          source: "worktowords_landing",
        },
        handler: async (payment) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payment),
            });
            const verifyData = (await verifyRes.json().catch(() => null)) as
              | { ok?: boolean; error?: string }
              | null;

            if (!verifyRes.ok || !verifyData?.ok) {
              throw new Error(
                verifyData?.error || "Payment succeeded but verification failed."
              );
            }

            toast.success("Payment successful. Pro is now active for 30 days.", {
              id: loadingId,
            });
          } catch (error) {
            const msg =
              error instanceof Error
                ? error.message
                : "Payment verification failed.";
            toast.error(msg, { id: loadingId });
          } finally {
            setIsUpgrading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsUpgrading(false);
            toast.info("Checkout closed.", { id: loadingId });
          },
        },
        theme: { color: "#111827" },
      });

      checkout.on?.("payment.failed", () => {
        setIsUpgrading(false);
        toast.error("Payment failed. Please try again.", { id: loadingId });
      });

      checkout.open();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Could not start checkout.";
      toast.error(msg, { id: loadingId });
      setIsUpgrading(false);
    }
  }

  if (!hasClerkKey) {
    return (
      <Button
        disabled
        className={cn(
          PRICING_CARD_BUTTON_CLASS,
          "cursor-not-allowed disabled:pointer-events-auto disabled:cursor-not-allowed"
        )}
      >
        Upgrade to Pro
      </Button>
    );
  }

  // Signed-in Pro: hide upgrade CTA on the landing pricing card
  if (isLoaded && isSignedIn && plan === "pro") {
    return null;
  }

  if (isSignedIn && usageLoading) {
    return (
      <Button
        disabled
        className={cn(
          PRICING_CARD_BUTTON_CLASS,
          "cursor-wait disabled:pointer-events-auto disabled:cursor-wait"
        )}
      >
        Loading…
      </Button>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <Button
          onClick={onUpgradeToPro}
          disabled={isUpgrading}
          className={cn(
            PRICING_CARD_BUTTON_INTERACTIVE_CLASS,
            isUpgrading &&
              "disabled:pointer-events-auto disabled:cursor-wait"
          )}
        >
          {isUpgrading ? "Opening checkout…" : "Upgrade to Pro"}
        </Button>
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button className={cn(PRICING_CARD_BUTTON_INTERACTIVE_CLASS)}>
            Upgrade to Pro
          </Button>
        </SignInButton>
      </Show>
    </>
  );
}
