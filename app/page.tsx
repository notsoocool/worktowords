import { Button } from "@/components/ui/button";
import { StartWritingCta } from "@/components/start-writing-cta";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,hsl(var(--primary)/0.2),transparent_70%)]" />
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto w-full max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              Built for developers who want to post consistently
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Turn your daily work into LinkedIn posts
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
              Capture what you shipped, learned, and solved, then turn it into
              high-quality posts in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <StartWritingCta />
              <Button variant="outline" size="lg" className="h-11 rounded-xl px-6">
                View sample output
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="saas-card saas-card-hover p-6 sm:p-8">
              <p className="text-xs font-medium text-muted-foreground">Input</p>
              <div className="mt-3 rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Today I shipped onboarding analytics, reduced API latency by 32%,
                  and fixed edge-case auth retries for mobile users...
                </p>
              </div>
              <p className="mt-5 text-xs font-medium text-muted-foreground">
                Generated LinkedIn post
              </p>
              <div className="mt-3 rounded-2xl border bg-background p-4">
                <p className="text-sm leading-6 text-foreground/90">
                  Small wins compound. This week I focused on onboarding quality:
                  improved event tracking, reduced API latency by 32%, and fixed
                  flaky auth retries on mobile...
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    #buildinpublic
                  </span>
                  <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    #softwareengineering
                  </span>
                  <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    #productdev
                  </span>
                </div>
              </div>
            </div>

            <div className="saas-card p-6 sm:p-8">
              <p className="text-sm font-semibold">Why teams choose WorktoWords</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm font-medium">Saves 3-5 hours weekly</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Stop starting from a blank page every time.
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm font-medium">Consistent quality</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep your voice while improving structure and clarity.
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm font-medium">Post-ready output</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hashtags, timing suggestions, and fast rewrites included.
                  </p>
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
              Built to make writing effortless
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">Turn ideas into posts</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Drop rough notes, wins, and lessons. Get a clean draft instantly.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">Write better, faster</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep your voice, sharpen your message, and publish with confidence.
              </p>
            </div>
            <div className="rounded-2xl border bg-background p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-base font-semibold">Never run out of content</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use history + rewrites to create fresh posts from your daily work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="saas-card saas-card-hover overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-medium text-muted-foreground">CTA</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to write your next LinkedIn post?
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Join WorktoWords and turn your daily engineering work into content
                that gets noticed.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <StartWritingCta />
              <Button variant="outline" size="lg" className="h-11 rounded-xl px-6">
                Explore dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
