import { BrandLogo } from "@/components/brand-logo";
import { PricingSection } from "@/components/pricing-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { StartWritingCta } from "@/components/start-writing-cta";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,hsl(var(--primary)/0.2),transparent_70%)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto w-full max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <BrandLogo
                size={48}
                wordmarkClassName="text-xl sm:text-2xl"
                priority
              />
            </div>
            <p className="mb-4 inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              A full content system for builders
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Turn Your Daily Work Into Content Across LinkedIn, Instagram & YouTube
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
              Describe what you built today — our AI turns it into high-quality
              content for every platform.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <StartWritingCta />
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-11 rounded-xl px-6",
                })}
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-6">
            <div className="saas-card p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground">
                  How it works
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  A repeatable daily system
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-background p-5">
                  <p className="text-sm font-semibold">Step 1</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Write what you worked on today
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-5">
                  <p className="text-sm font-semibold">Step 2</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Our AI plans and structures your content
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-5">
                  <p className="text-sm font-semibold">Step 3</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Get ready-to-post content for LinkedIn, Instagram, and YouTube
                  </p>
                </div>
              </div>
            </div>

            <div className="saas-card saas-card-hover p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground">
                  Output demo
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  One input. Three platform-ready drafts.
                </h2>
              </div>

              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Input</p>
                  <div className="mt-3 rounded-2xl border bg-background p-4">
                    <p className="text-sm text-muted-foreground">
                      Today I shipped onboarding analytics, reduced API latency by
                      32%, fixed auth retry edge cases on mobile, and wrote a
                      postmortem on the rollout.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      LinkedIn post
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                      Shipping is a muscle.\n\nThis week I focused on onboarding
                      quality:\n- Added analytics that actually answers “where do users drop?”\n- Cut API latency by 32%\n- Fixed mobile auth retry edge cases\n\nSmall wins compound.
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Instagram reel idea
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      Reel hook: “We cut latency by 32% — here’s the one change that mattered.”\n\nShow before/after charts → the bottleneck → the fix → the result.
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      YouTube script
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      Title: The 32% latency win (and what I learned)\n\n0:00 — Why onboarding speed mattered\n0:20 — Finding the bottleneck\n1:10 — The fix\n2:10 — Results + rollout notes\n2:40 — What I’d do differently next time
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="saas-card p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground">Features</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Built like a content system
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">Multi-platform generation</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Generate LinkedIn, Instagram, and YouTube drafts from the same input.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">AI content planning</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Hooks, angles, and structure first — then platform-specific output.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">Developer-focused tone</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Built for real engineering work: outcomes, trade-offs, and clarity.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm md:col-span-3">
              <p className="text-base font-semibold">Daily consistency system</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A simple habit loop: write notes → generate drafts → reuse from history → stay consistent.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="saas-card saas-card-hover overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-medium text-muted-foreground">CTA</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to turn today into content?
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Start with a few lines about what you built — we’ll do the structuring
                and drafting for every platform.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <StartWritingCta />
              <Link
                href="/dashboard"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "h-11 rounded-xl px-6",
                })}
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
