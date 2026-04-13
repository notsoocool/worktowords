"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

import { UpgradeToProCta } from "@/components/upgrade-to-pro-cta";
import { Button } from "@/components/ui/button";
import {
  PRICING_CARD_BUTTON_CLASS,
  PRICING_CARD_BUTTON_CURRENT_CLASS,
} from "@/lib/pricing-card-button";
import { cn } from "@/lib/utils";

function useUserPlan() {
  const { isSignedIn, isLoaded } = useAuth();
  const [plan, setPlan] = React.useState<"free" | "pro" | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setPlan(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("usage"))))
      .then((d: { plan?: string }) => {
        if (cancelled) return;
        setPlan(d?.plan === "pro" ? "pro" : "free");
      })
      .catch(() => {
        if (!cancelled) setPlan("free");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return { plan, loading, isSignedIn, isLoaded };
}

export function PricingSection() {
  const { plan, loading, isSignedIn, isLoaded } = useUserPlan();

  const showFreeCurrent =
    isLoaded && isSignedIn && !loading && plan === "free";

  const showProCurrent =
    isLoaded && isSignedIn && !loading && plan === "pro";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <div className="saas-card p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pricing</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Choose a plan that fits your posting goals
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">Simple monthly billing</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <div className="flex h-full min-h-0 flex-col rounded-2xl border bg-background p-5">
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="text-sm font-semibold">Free</p>
              <p className="mt-1 text-2xl font-semibold">₹0</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                5 generations per day. Great for trying WorktoWords.
              </p>
            </div>
            <div className="mt-auto w-full shrink-0 pt-4">
              {showFreeCurrent ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className={cn(PRICING_CARD_BUTTON_CURRENT_CLASS)}
                  aria-current="true"
                >
                  Current plan
                </Button>
              ) : (
                <div
                  className={cn(PRICING_CARD_BUTTON_CLASS, "invisible pointer-events-none")}
                  aria-hidden
                />
              )}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col rounded-2xl border bg-background p-5">
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="text-sm font-semibold">Pro</p>
              <p className="mt-1 text-2xl font-semibold">₹149/month</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pay via UPI (GPay, PhonePe, Paytm). Up to 100 generations per day.
              </p>
            </div>
            <div className="mt-auto w-full shrink-0 pt-4">
              {showProCurrent ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className={cn(PRICING_CARD_BUTTON_CURRENT_CLASS)}
                  aria-current="true"
                >
                  Current plan
                </Button>
              ) : (
                <UpgradeToProCta plan={plan} usageLoading={loading} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
